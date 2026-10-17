#!/usr/bin/env node
/**
 * Docs PR reviewer — advisory review of documentation pull requests.
 *
 * Invoked by .github/workflows/docs-pr-review.yml (a default-branch
 * `workflow_run` job) after the workflow has re-checked the PR and
 * confirmed the author is in an allowed team. Runs from the DEFAULT-BRANCH
 * checkout; PR content is fetched from the GitHub API as data and never
 * executed.
 *
 * Flow:
 *   0. Risk level (risk.mjs): fixed rules from the review ladder, no model.
 *      Shown at the top of the summary and as one `risk: <level>` label,
 *      in shadow mode; never enforced.
 *   1. List the PR's changed files; keep documentation pages only.
 *   2. Build deterministic facts (placement, index section, neighbors, links).
 *   3. One LLM Gateway call → structured JSON review. The model depends on
 *      the risk level: GPT-6 Luna for low, Claude Sonnet for everything else.
 *   4. Validate the JSON; post/update one summary comment; post inline
 *      suggestion comments once per head commit.
 *
 * Writes: one issue comment (updated in place), at most one PR review of
 * type COMMENT per head commit, and one `risk: <level>` label (stale risk
 * labels removed). Never pushes, approves, requests changes, merges, or
 * closes, and never touches any other label.
 *
 * Flags (local use):
 *   --dry-run       build everything and call the model, print instead of posting
 *   --context-only  skip the model call; print the facts and prompt size
 */

import fs from "node:fs";
import path from "node:path";
import { createGitHub, isWorkflowBot } from "./github.mjs";
import { buildFileFacts, isReviewablePage, loadSite, readCapped } from "./context.mjs";
import { SYSTEM_PROMPT, buildReviewPrompt } from "./prompts.mjs";
import {
  STICKY_MARKER,
  extractJson,
  outboundViolation,
  planInlineComments,
  renderRiskOnlySummary,
  renderSummary,
  reviewMarker,
  validateReview,
} from "./render.mjs";
import { classifyRisk, planRiskLabels, renderRisk, reviewModelFor } from "./risk.mjs";

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run") || process.env.DRY_RUN === "true";
const CONTEXT_ONLY = args.has("--context-only");

const MAX_PAGES = Number(process.env.DOCS_REVIEW_MAX_PAGES || 10);
const MAX_FILE_CHARS = 40000;
const GUIDELINE_CHARS = 24000;

const env = (name, required = true) => {
  const v = process.env[name];
  if (required && !v) throw new Error(`${name} is required`);
  return v;
};

async function main() {
  const repo = env("REPO");
  const prNumber = Number(env("PR_NUMBER"));
  if (!Number.isInteger(prNumber) || prNumber <= 0) throw new Error("PR_NUMBER must be a positive integer");
  const repoRoot = path.resolve(process.env.REPO_ROOT || process.cwd());
  const gh = createGitHub({ token: process.env.GITHUB_TOKEN, repo });

  const pr = await gh.getPull(prNumber);
  // Defense in depth: the workflow already checked these from the same API.
  if (pr.state !== "open" || pr.draft || pr.head?.repo?.full_name !== repo) {
    console.log("PR is closed, a draft, or from a fork; nothing to review.");
    return;
  }
  const headSha = pr.head.sha;
  if (process.env.HEAD_SHA && process.env.HEAD_SHA !== headSha) {
    console.log(`PR head moved (${process.env.HEAD_SHA.slice(0, 7)} → ${headSha.slice(0, 7)}); a newer run will review it.`);
    return;
  }

  const allFiles = await gh.listPullFiles(prNumber);
  const runUrl =
    process.env.GITHUB_SERVER_URL && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : "";

  // 0) Risk label. Deterministic; any lookup failure raises the level instead of failing the run.
  const risk = await assessRisk({ gh, pr, files: allFiles, repoRoot });
  const riskBlock = renderRisk(risk);
  console.log(`::notice title=Risk level::${risk.level} (${risk.reasons.map((r) => r.rule).join(", ")})`);
  if (!DRY_RUN && !CONTEXT_ONLY) await syncRiskLabel(gh, pr, risk.level);
  appendStepSummary(`### Risk level: ${risk.level}\n\n${risk.reasons.map((r) => `- ${r.level}: ${r.text}`).join("\n")}\n`);

  const pages = allFiles.filter((f) => isReviewablePage(f.filename) && f.status !== "removed");
  const others = allFiles.filter((f) => !pages.includes(f)).map((f) => f.filename);
  if (!pages.length) {
    console.log("No documentation pages changed; posting the risk label only.");
    const summary = renderRiskOnlySummary({ riskBlock, headSha, runUrl });
    const violation = outboundViolation(summary, riskBlock);
    if (violation) throw new Error(`Output policy gate blocked posting: ${violation}`);
    if (DRY_RUN || CONTEXT_ONLY) console.log(summary);
    else await upsertSummary(gh, prNumber, summary);
    return;
  }
  const reviewed = pages.slice(0, MAX_PAGES);
  if (pages.length > MAX_PAGES) console.log(`Reviewing the first ${MAX_PAGES} of ${pages.length} pages.`);

  // PR content (untrusted data) from the API; base content from the trusted checkout.
  const contents = new Map();
  for (const f of reviewed) {
    let headContent = null;
    try {
      headContent = await gh.getFileAtRef(f.filename, headSha);
      if (headContent.length > MAX_FILE_CHARS) headContent = `${headContent.slice(0, MAX_FILE_CHARS)}\n…[truncated]`;
    } catch (err) {
      console.warn(`::warning title=Head file unavailable::${f.filename}: ${err.message}`);
    }
    const basePath = f.status === "renamed" && f.previous_filename ? f.previous_filename : f.filename;
    const baseContent = readCapped(path.join(repoRoot, basePath), MAX_FILE_CHARS);
    contents.set(f.filename, { headContent, baseContent, patch: f.patch || "" });
  }

  const site = loadSite(repoRoot);
  const facts = buildFileFacts({
    repoRoot,
    site,
    files: reviewed.map((f) => ({ filename: f.filename, status: f.status, patch: f.patch || "" })),
  });

  const guidelines = {};
  for (const [name, rel] of [
    ["Content guidelines", "docs/content-guidelines.md"],
    ["Tone of voice", "docs/tone_of_voice.mdx"],
    ["Information architecture guidelines", "docs/ia-guidelines.md"],
  ]) {
    const text = readCapped(path.join(repoRoot, rel), GUIDELINE_CHARS);
    if (text) guidelines[name] = text;
  }

  const prompt = buildReviewPrompt({
    pr: { title: pr.title, body: pr.body || "" },
    facts,
    contents,
    guidelines,
    otherChangedFiles: others,
  });

  const model = reviewModelFor(risk.level);
  if (CONTEXT_ONLY) {
    console.log(riskBlock);
    console.log(`Review model: ${model}`);
    console.log(JSON.stringify(facts.map((f) => ({ ...f, neighbors: f.neighbors.map((n) => n.route), destinationPage: f.destinationPage && { route: f.destinationPage.route, file: f.destinationPage.file } })), null, 2));
    console.log(`\nPrompt: ${prompt.length} chars (system ${SYSTEM_PROMPT.length})`);
    return;
  }

  // Imported lazily so --context-only works without the SDK or a gateway key.
  const { complete, BENCH_LOG } = await import("../sync-from-base-std/llm/client.mjs");
  let review;
  try {
    const { text, stopReason } = await complete(prompt, `pr-${prNumber}`, {
      system: SYSTEM_PROMPT,
      model,
      maxTokens: 8192,
    });
    if (stopReason === "max_tokens") throw new Error("model output was truncated");
    review = validateReview(extractJson(text), new Set(reviewed.map((f) => f.filename)));
  } finally {
    flushBench(BENCH_LOG, prNumber);
  }

  const patches = new Map(reviewed.map((f) => [f.filename, f.patch || ""]));
  const heads = new Map([...contents].map(([file, c]) => [file, c.headContent]));
  const { inline, withheld } = planInlineComments(review.findings, patches, heads);
  const summary = renderSummary({
    review,
    facts,
    headSha,
    inlineFindings: inline.map((i) => i.finding),
    withheld,
    runUrl,
    riskBlock,
    model,
  });

  // Output policy gate (SPA-26751): nothing is posted if any comment body
  // carries a secret pattern or a random-looking string the model was not
  // given. The reason names the rule only, never the matched value.
  // The risk block is built by our own rules from repository data, so it is input too.
  const source = `${SYSTEM_PROMPT}\n${prompt}\n${riskBlock}`;
  for (const body of [summary, ...inline.map((i) => i.comment.body)]) {
    const violation = outboundViolation(body, source);
    if (violation) throw new Error(`Output policy gate blocked posting: ${violation}`);
  }

  if (DRY_RUN) {
    console.log(summary);
    console.log(`\nInline suggestions: ${inline.length} (withheld: ${withheld.size})`);
    for (const i of inline) console.log(`- ${i.comment.path}:${i.comment.line}\n${i.comment.body}\n`);
    return;
  }

  // 1) Summary comment — one per PR, edited in place.
  await upsertSummary(gh, prNumber, summary);

  // 2) Inline suggestions — at most one review per head commit.
  if (inline.length) {
    const marker = reviewMarker(headSha);
    const reviews = await gh.listReviews(prNumber);
    const already = reviews.some((r) => isWorkflowBot(r.user) && r.body?.includes(marker));
    if (!already) {
      try {
        await gh.createReview(prNumber, {
          commit_id: headSha,
          event: "COMMENT",
          body: `${marker}\nSuggested edits from the docs review. Each one is optional; apply it with "Commit suggestion" if you agree.`,
          comments: inline.map((i) => i.comment),
        });
      } catch (err) {
        // A rejected line comment must not lose the review: the summary
        // comment already lists every finding.
        console.warn(`::warning title=Inline suggestions skipped::${err.message}`);
      }
    }
  }

  console.log(
    `::notice title=Docs review posted::risk=${risk.level} model=${model} verdict=${review.verdict} findings=${review.findings.length} inline=${inline.length} withheld=${withheld.size}`,
  );
}

/**
 * Gather the risk inputs. Read-only: the PR file list (already fetched),
 * docs.json at base and head via the API, the gate config from the trusted
 * default-branch checkout, and the author's merged-PR count.
 */
async function assessRisk({ gh, pr, files, repoRoot }) {
  let governance = null;
  try {
    governance = JSON.parse(fs.readFileSync(path.join(repoRoot, ".github", "ia-governance.json"), "utf8"));
  } catch {
    governance = null; // classifyRisk reports it as missing information
  }
  const navPath = governance?.navConfigPath || "docs/docs.json";

  let nav = null;
  if (files.some((f) => f.filename === navPath || f.previous_filename === navPath)) {
    try {
      const [baseText, headText] = await Promise.all([
        gh.getFileAtRefOrNull(navPath, pr.base.sha),
        gh.getFileAtRefOrNull(navPath, pr.head.sha),
      ]);
      nav = { base: baseText, head: headText, baseMissing: baseText === null, headMissing: headText === null };
    } catch (err) {
      nav = { base: null, head: null, error: err.message };
    }
  }

  let firstTimeAuthor = null;
  try {
    firstTimeAuthor = (await gh.countMergedPulls(pr.user?.login)) === 0;
  } catch (err) {
    console.warn(`::warning title=Author history unavailable::${err.message}`);
  }

  return classifyRisk({ files, changedFiles: pr.changed_files, nav, governance, firstTimeAuthor });
}

/**
 * Make the PR carry exactly one risk label that matches the level. Only labels
 * in RISK_LABELS are touched, and a missing label is never created: it is
 * skipped with a warning. Label trouble never fails the review.
 */
async function syncRiskLabel(gh, pr, level) {
  try {
    const plan = planRiskLabels((pr.labels || []).map((l) => l.name), level);
    if (plan.add) {
      if (await gh.labelExists(plan.add)) await gh.addLabel(pr.number, plan.add);
      else console.warn(`::warning title=Risk label missing::Create the "${plan.add}" label in this repository to enable risk labels.`);
    }
    for (const name of plan.remove) await gh.removeLabel(pr.number, name);
  } catch (err) {
    console.warn(`::warning title=Risk label not updated::${err.message}`);
  }
}

async function upsertSummary(gh, prNumber, summary) {
  const comments = await gh.listIssueComments(prNumber);
  const existing = comments.find((c) => isWorkflowBot(c.user) && c.body?.startsWith(STICKY_MARKER));
  if (existing) await gh.updateIssueComment(existing.id, summary);
  else await gh.createIssueComment(prNumber, summary);
}

function appendStepSummary(markdown) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  try {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
  } catch {
    // The run summary is a convenience; never fail the review over it.
  }
}

function flushBench(log, prNumber) {
  if (!log?.length) return;
  fs.mkdirSync(".docs-review-bench", { recursive: true });
  fs.writeFileSync(
    path.join(".docs-review-bench", `pr-${prNumber}.jsonl`),
    log.map((r) => JSON.stringify(r)).join("\n") + "\n",
  );
}

main().catch((err) => {
  console.error(`::error title=Docs review failed::${err.message}`);
  process.exit(1);
});
