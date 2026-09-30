#!/usr/bin/env node
/**
 * mine-feedback.mjs — turns reviewer feedback on bot PRs into taxonomy
 * counts and drafted eval-case candidates. PLAN.md Lane C §2.
 *
 * CLI:
 *   node scripts/doc-evals/metrics/mine-feedback.mjs \
 *     [--owner <org>] [--repo <name>] [--llm] [--dry-run] \
 *     [--cases-dir <path>]
 *
 * Always prints taxonomy counts. Writes one candidate case file per bot
 * PR that has at least one human (non-bot) finding to
 * `<cases-dir>/_candidates/<sha>-<pr>.json` — never to `<cases-dir>/`
 * directly; a human promotes a candidate into a real case. `--dry-run`
 * prints what would be written instead of writing it.
 *
 * `--llm` is a documented escape hatch to classify with `complete()`
 * (Haiku) instead of the keyword rules in taxonomy.mjs; off by default so
 * a normal run — including the weekly report workflow — costs zero LLM
 * tokens.
 *
 * GitHub access here is entirely read-only (GET). Token: GITHUB_TOKEN env
 * var, else `gh auth token`.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { resolveToken, listBotPullRequests, fetchPRDiscussion } from "./github.mjs";
import { classifyComment, classifyFindings, tallyTaxonomy, isBotLogin } from "./taxonomy.mjs";

const DEFAULT_OWNER = "base";
const DEFAULT_REPO = "docs";
const DEFAULT_CASES_DIR = path.join(import.meta.dirname, "..", "cases");

/** Pull the 7-char source sha the sync bot embeds in its branch/title, e.g. "docs/sync-code-change-253bb15" -> "253bb15". */
export function extractSourceSha(pr) {
  const match = /^docs\/sync-(?:code-change|release)-([0-9a-f]{4,40})$/.exec(pr.head?.ref ?? "");
  return match ? match[1] : null;
}

/**
 * Classify one bot PR's discussion into review_findings entries, using
 * either the keyword taxonomy or (optionally) an LLM classifier.
 * Skips CI/preview bots per `isBotLogin`.
 * @param {{login: string, body: string, url: string, path: string|null}[]} discussion
 * @param {{classify?: (text: string) => Promise<string>|string}} [opts]
 */
export async function collectFindings(discussion, { classify = classifyComment } = {}) {
  const human = discussion.filter((c) => c.body && c.body.trim() && !isBotLogin(c.login));
  const findings = [];
  for (const c of human) {
    // eslint-disable-next-line no-await-in-loop -- classify() may be async
    // (the --llm path); sequential keeps request volume predictable.
    const type = await classify(c.body);
    findings.push({ page: c.path ?? null, type, text: c.body, url: c.url });
  }
  return findings;
}

/**
 * Build a drafted candidate case for the case-file schema (PLAN.md
 * "Shared contracts"). `payload` and `docs_base_commit` are left as
 * placeholders — reconstructing the full sync payload is build-cases.mjs's
 * job (Lane A); this function only has what a PR's metadata + discussion
 * gives it. `notes` says so explicitly so nobody promotes a candidate
 * without filling those in first.
 * @param {any} pr
 * @param {{page: string|null, type: string, text: string, url: string}[]} findings
 */
export function buildCandidateCase(pr, findings) {
  const sourceSha = extractSourceSha(pr);
  const slug = pr.title
    .replace(/\(base-std@[0-9a-f]+\)\s*$/i, "")
    .replace(/^docs?:\s*/i, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .slice(0, 4)
    .join("-");
  const touchedPages = [...new Set(findings.map((f) => f.page).filter(Boolean))];
  return {
    id: `${sourceSha ?? "unknown-sha"}-${slug || "candidate"}`,
    source_repo: "base/base-std",
    source_sha: sourceSha,
    bot_pr: pr.number,
    docs_base_commit: null,
    payload: null,
    reference: null,
    scope: {
      in: touchedPages,
      out: [],
      label_source: "drafted",
    },
    review_findings: findings.map(({ page, type, text, url }) => ({ page, type, text, url })),
    split: null,
    heavy: false,
    notes:
      "Drafted by mine-feedback.mjs from PR discussion only. source_sha is the bot's short (abbreviated) sha from the head branch/title, not resolved to 40 chars. docs_base_commit and payload are unset — a human must run build-cases.mjs (Lane A) to reconstruct them before this candidate is promoted into cases/.",
  };
}

/** Markdown summary of taxonomy counts, for the report workflow's issue body. */
export function renderTaxonomyMarkdown(counts, { owner = DEFAULT_OWNER, repo = DEFAULT_REPO } = {}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const lines = [];
  lines.push(`## Reviewer feedback taxonomy (${owner}/${repo})`);
  lines.push("");
  lines.push(`${total} classified finding(s) across bot PRs.`);
  lines.push("");
  lines.push("| Type | Count |");
  lines.push("|---|---|");
  for (const [type, count] of Object.entries(counts)) {
    lines.push(`| ${type} | ${count} |`);
  }
  return lines.join("\n");
}

/**
 * End-to-end run (fetch + classify), no file writes. Exported for reuse
 * by report.mjs.
 * @param {{owner?: string, repo?: string, since?: string, fetchImpl?: Function, token?: string, llm?: boolean}} [opts]
 */
export async function run({ owner = DEFAULT_OWNER, repo = DEFAULT_REPO, since, fetchImpl, token, llm = false } = {}) {
  const tok = token ?? resolveToken();
  const allBotPRs = await listBotPullRequests(owner, repo, tok, { fetchImpl });
  const prs = since ? allBotPRs.filter((pr) => pr.created_at >= since) : allBotPRs;

  let classify = classifyComment;
  if (llm) {
    const { complete, HAIKU_MODEL } = await import("../../sync-from-base-std/llm/client.mjs");
    classify = async (text) => {
      const prompt = [
        "Classify this documentation-PR review comment into exactly one of:",
        "scope, paraphrase, fact, housekeeping, style, naming, other.",
        "Reply with only the single lowercase word.",
        "",
        "<comment>",
        text,
        "</comment>",
      ].join("\n");
      const reply = await complete(prompt, "feedback-classification", { model: HAIKU_MODEL, maxTokens: 8 });
      const word = reply.trim().toLowerCase();
      return ["scope", "paraphrase", "fact", "housekeeping", "style", "naming"].includes(word) ? word : "other";
    };
  }

  const candidatesByPr = [];
  const allFindings = [];
  for (const pr of prs) {
    // eslint-disable-next-line no-await-in-loop -- small list, sequential
    // keeps request volume (and, for --llm, token spend) predictable.
    const discussion = await fetchPRDiscussion(owner, repo, pr.number, tok, { fetchImpl });
    const findings = await collectFindings(discussion, { classify });
    allFindings.push(...findings);
    if (findings.length) {
      candidatesByPr.push({ pr, findings, candidate: buildCandidateCase(pr, findings) });
    }
  }

  return { candidatesByPr, allFindings, counts: tallyTaxonomy(allFindings) };
}

/**
 * Write (or, in dry-run, print) one candidate JSON file per PR that had
 * findings. Never touches `<casesDir>/<id>.json` — always under
 * `_candidates/`.
 */
export async function writeCandidateCases(candidatesByPr, { casesDir = DEFAULT_CASES_DIR, dryRun = false } = {}) {
  const candidatesDir = path.join(casesDir, "_candidates");
  const written = [];
  for (const { candidate } of candidatesByPr) {
    const filePath = path.join(candidatesDir, `${candidate.id}.json`);
    if (dryRun) {
      console.log(`--dry-run: would write ${filePath}`);
      console.log(JSON.stringify(candidate, null, 2));
    } else {
      // eslint-disable-next-line no-await-in-loop -- small list
      await fs.mkdir(candidatesDir, { recursive: true });
      // eslint-disable-next-line no-await-in-loop
      await fs.writeFile(filePath, `${JSON.stringify(candidate, null, 2)}\n`);
    }
    written.push(filePath);
  }
  return written;
}

function parseArgs(argv) {
  const args = { owner: DEFAULT_OWNER, repo: DEFAULT_REPO, casesDir: DEFAULT_CASES_DIR };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--owner") args.owner = argv[++i];
    else if (a === "--repo") args.repo = argv[++i];
    else if (a === "--since") args.since = argv[++i];
    else if (a === "--cases-dir") args.casesDir = argv[++i];
    else if (a === "--llm") args.llm = true;
    else if (a === "--dry-run") args.dryRun = true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { candidatesByPr, counts } = await run(args);
  console.log("Taxonomy counts:", JSON.stringify(counts));
  console.log(renderTaxonomyMarkdown(counts, args));
  const written = await writeCandidateCases(candidatesByPr, args);
  console.log(`${args.dryRun ? "Would write" : "Wrote"} ${written.length} candidate case file(s).`);
}

const isMain = process.argv[1] && new URL(import.meta.url).pathname === process.argv[1];
if (isMain) {
  main().catch((err) => {
    console.error(err.stack || err.message);
    process.exitCode = 1;
  });
}
