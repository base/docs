#!/usr/bin/env node
/**
 * build-cases.mjs — build the frozen replay case files under
 * `scripts/doc-evals/cases/<id>.json` from a small hand-curated seed list.
 *
 * For each seed entry this:
 *   1. Confirms the docs bot PR's title carries the expected source sha
 *      prefix (`(base-std@<sha>)`), reads its first commit, and resolves
 *      `docs_base_commit` = that commit's parent — the docs repo state the
 *      bot started from. Verified against the *local* git history (fetching
 *      from origin once if the commit isn't present yet).
 *   2. Reads base-std's commit metadata (changed paths + per-file status)
 *      and unified diff for the source sha from the GitHub REST API, and
 *      reconstructs the payload fields the workflow derives from them
 *      (`changed_paths`, `removed_paths`, `diff`, `diff_truncated`) the same
 *      way ".github/workflows/base-std-docs-sync.yml" does in its
 *      "Derive trusted removed paths" and "Fetch diff artifact from source
 *      repo" steps — including that step's byte caps. See buildPayload().
 *   3. Fills `reference` and `scope.out` from the hand-curated seed (a
 *      bundled human-written reference PR does not decompose into one source
 *      commit mechanically — see the README "Decisions" section) and drafts
 *      `scope.in` from the live route table via `routeCodeChange()`,
 *      imported read-only from `scripts/sync-from-base-std/index.mjs`, when
 *      no reference exists.
 *   4. Pulls the bot PR's reviews + review comments (skipping bot accounts)
 *      and classifies each into the failure taxonomy with a small
 *      hand-written keyword rule set (classifyFinding()).
 *
 * Usage:
 *   node scripts/doc-evals/build-cases.mjs [--only <id>[,<id>...]]
 *
 * Live network calls: GitHub REST API only (base/docs, base/base-std — both
 * public). Auth token from `gh auth token` when available; falls back to
 * unauthenticated requests (rate-limited) otherwise. No LLM calls. Never logs
 * the token.
 *
 * Idempotent: re-running regenerates every case file (or just the ones named
 * by --only) from scratch; nothing is read back from the previous case file.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { routeCodeChange, classifyChangedPaths } from "../sync-from-base-std/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const CASES_DIR = path.join(__dirname, "cases");
const DOCS_REPO = "base/docs";

// ------------------------------------------------------------- byte caps
// Mirrors the caps the workflow applies before the payload ever reaches
// index.mjs (see "Validate payload schema" and "Fetch diff artifact from
// source repo" in .github/workflows/base-std-docs-sync.yml). None of the
// seed shas are anywhere near these, but applying the same cap logic here
// keeps the reconstruction faithful rather than just "smaller than the
// biggest one we happened to check by hand".
const MAX_DIFF_BYTES = 12_582_912; // 12 MiB unpacked diff (artifact path cap)
const MAX_REMOVED_PATHS = 200;
const MAX_REMOVED_PATH_BYTES = 512;
// Mirrors the code-change branch of "Validate payload schema": that step
// workflow_fail()s (not truncates) a dispatch whose changed_paths exceeds
// either cap, on the *dispatcher*-supplied array. Reconstructing changed_paths
// from the commit API (buildPayload()) is our best available substitute for
// that field after the fact — enforcing the same caps here means a source
// commit too big for the real workflow to have accepted surfaces as a build
// error instead of silently freezing a payload the workflow never would have.
const MAX_CHANGED_PATHS = 200;
const MAX_CHANGED_PATH_BYTES = 512;

// ------------------------------------------------------------- seed list
// Hand-curated: bot PR -> source sha, split, and (when one exists) the
// human-merged reference PR. `referencePages`/`scopeOut` are curated by hand
// per case rather than derived mechanically, because the two reference PRs
// below (#1939, #2025) each bundle several source commits into one squashed
// human answer — there is no reliable *mechanical* way to attribute which
// page in a bundled PR corresponds to which single upstream commit. See
// README.md "Decisions on ambiguities".
const SEED = [
  {
    id: "04d645a-erc8056-interface-followups",
    botPr: 1853,
    sourceSha: "04d645a0b3272ae9b2f59d49715f54acfac51850",
    split: "train",
    reference: null,
    scopeOut: [],
    heavy: false,
    notes: "",
  },
  {
    id: "6bb10a4-composite-policy-spec",
    botPr: 1854,
    sourceSha: "6bb10a44ef688f1f44041203e35c9956c0b3bca1",
    split: "test",
    reference: null,
    scopeOut: [],
    heavy: false,
    notes: "",
  },
  {
    id: "868d513-seize-integrator-guidance",
    botPr: 1916,
    sourceSha: "868d513427f1dc8c75a8c004c5652d0ca2349473",
    split: "test",
    reference: null,
    scopeOut: [],
    heavy: false,
    notes: "Smallest raw diff of the seed set (2413B) — used for the live replay smoke test.",
  },
  {
    id: "db537f3-b20asset-multiplier-behavior",
    botPr: 1919,
    sourceSha: "db537f309b2acf0fb123dd2d26c344b18f504db0",
    split: "train",
    reference: null,
    scopeOut: [],
    heavy: false,
    notes: "review: reviewer questioned whether an author's last name needed to be added to the changelog page.",
  },
  {
    id: "64bd955-inverted-seize-holder",
    botPr: 1926,
    sourceSha: "64bd9558d7a1be004a6d095467dd3bf5dfa36592",
    split: "train",
    reference: null,
    scopeOut: [],
    heavy: false,
    notes: "Second-smallest raw diff (5583B) — fallback live-replay candidate.",
  },
  {
    id: "be6d045-b20-restructure",
    botPr: 1928,
    sourceSha: "be6d0450890e20fc4a739aeaff5e839f234d12a6",
    split: "train",
    reference: {
      pr: 1939,
      commit: "1a0460986aed1185baa555aafc735a824daf006f",
      // #1928 is the closed bad run (route table only mapped the 6 deleted
      // files, not the 15 added ones -> all-minus diff -> 13 "source file
      // removed" banners + a wrong UIMultiplierUpdated claim). #1939 is the
      // human fix once base-std#213's whole new tree was routed. Every docs/
      // page #1939 touched except the three generated indices corresponds to
      // this one restructure commit (nothing else changed upstream in
      // between), so the full list is safe to use as reference.pages here.
      pages: [
        "docs/base-chain/specs/reference/b20/changelog/02-cobalt-b20-seize.mdx",
        "docs/base-chain/specs/reference/b20/changelog/02-cobalt-policyregistry-composite-policy.mdx",
        "docs/build-on-base/integrate-defi/list-tokenized-stocks.mdx",
        "docs/build-on-base/issue-rwa/announce-a-distribution.mdx",
        "docs/build-on-base/issue-rwa/apply-a-multiplier.mdx",
        "docs/build-on-base/issue-rwa/cancel-blocked-units.mdx",
        "docs/build-on-base/issue-rwa/create-an-asset-token.mdx",
        "docs/build-on-base/issue-rwa/issue-units.mdx",
        "docs/build-on-base/issue-rwa/pause-transfers.mdx",
        "docs/build-on-base/issue-rwa/restrict-eligible-holders.mdx",
        "docs/build-on-base/issue-stablecoins/block-an-account.mdx",
        "docs/build-on-base/issue-stablecoins/burn-supply.mdx",
        "docs/build-on-base/issue-stablecoins/issue-your-stablecoin.mdx",
        "docs/build-on-base/issue-stablecoins/mint-supply.mdx",
        "docs/build-on-base/issue-stablecoins/pause-activity.mdx",
        "docs/build-on-base/issue-stablecoins/reconcile-with-memos.mdx",
        "docs/build-on-base/issue-stablecoins/recover-funds.mdx",
        "docs/build-on-base/issue-stablecoins/restrict-who-can-hold.mdx",
        "docs/docs.json",
        "docs/specifications/b20/reference/constants-addresses.mdx",
        "docs/specifications/b20/reference/interfaces/i-policy-registry/create-composite-policy.mdx",
        "docs/specifications/b20/reference/interfaces/i-policy-registry/finalize-update-admin.mdx",
        "docs/specifications/b20/reference/interfaces/i-policy-registry/max-composite-child-policies.mdx",
        "docs/specifications/b20/reference/interfaces/i-policy-registry/min-composite-child-policies.mdx",
        "docs/specifications/b20/reference/interfaces/i-policy-registry/pending-policy-admin.mdx",
        "docs/specifications/b20/reference/interfaces/i-policy-registry/policy-admin.mdx",
        "docs/specifications/b20/reference/interfaces/i-policy-registry/renounce-admin.mdx",
        "docs/specifications/b20/reference/interfaces/i-policy-registry/stage-update-admin.mdx",
        "docs/specifications/b20/reference/interfaces/i-policy-registry/update-allowlist.mdx",
        "docs/specifications/b20/reference/interfaces/i-policy-registry/update-blocklist.mdx",
        "docs/specifications/b20/reference/interfaces/i-policy-registry/update-composite.mdx",
        "docs/specifications/b20/reference/interfaces/ib20-asset/announce.mdx",
        "docs/specifications/b20/reference/interfaces/ib20-asset/batch-mint.mdx",
        "docs/specifications/b20/reference/interfaces/ib20-asset/effective-at.mdx",
        "docs/specifications/b20/reference/interfaces/ib20-asset/multiplier.mdx",
        "docs/specifications/b20/reference/interfaces/ib20-asset/operator-role.mdx",
        "docs/specifications/b20/reference/interfaces/ib20-asset/scaled-balance-of.mdx",
        "docs/specifications/b20/reference/interfaces/ib20-asset/to-scaled-balance.mdx",
        "docs/specifications/b20/reference/interfaces/ib20-asset/to-ui-amount.mdx",
        "docs/specifications/b20/reference/interfaces/ib20-asset/ui-multiplier.mdx",
        "docs/specifications/b20/reference/interfaces/ib20-asset/update-multiplier.mdx",
        "docs/specifications/b20/reference/interfaces/ib20-asset/wad-precision.mdx",
        "docs/specifications/b20/reference/interfaces/ib20-factory/create-b20.mdx",
        "docs/specifications/b20/reference/interfaces/ib20-factory/is-b20-initialized.mdx",
        "docs/specifications/b20/reference/interfaces/ib20-factory/is-b20.mdx",
        "docs/specifications/b20/reference/interfaces/ib20/burn-blocked.mdx",
        "docs/specifications/b20/reference/interfaces/ib20/grant-role.mdx",
        "docs/specifications/b20/reference/interfaces/ib20/index.mdx",
        "docs/specifications/b20/reference/interfaces/ib20/is-paused.mdx",
        "docs/specifications/b20/reference/interfaces/ib20/pause.mdx",
        "docs/specifications/b20/reference/interfaces/ib20/paused-features.mdx",
        "docs/specifications/b20/reference/interfaces/ib20/policy-id.mdx",
        "docs/specifications/b20/reference/interfaces/ib20/renounce-role.mdx",
        "docs/specifications/b20/reference/interfaces/ib20/revoke-role.mdx",
        "docs/specifications/b20/reference/interfaces/ib20/seize-exempt-policy.mdx",
        "docs/specifications/b20/reference/interfaces/ib20/seize-holder-policy.mdx",
        "docs/specifications/b20/reference/interfaces/ib20/seize-receiver-policy.mdx",
        "docs/specifications/b20/reference/interfaces/ib20/seize-role.mdx",
        "docs/specifications/b20/reference/interfaces/ib20/seize-with-memo.mdx",
        "docs/specifications/b20/reference/interfaces/ib20/set-role-admin.mdx",
        "docs/specifications/b20/reference/interfaces/ib20/unpause.mdx",
        "docs/specifications/b20/reference/interfaces/ib20/update-policy.mdx",
        "docs/specifications/b20/specification-overview.mdx",
      ],
    },
    scopeOut: [],
    heavy: true,
    notes:
      "Heavy: base-std#213 deletes 6 upstream doc files and adds 15. #1928 (this bot PR) routed only the deletions, producing an all-minus diff with 13 'source file removed' banners and a wrong claim that UIMultiplierUpdated fires at maturity; closed unmerged. #1939 is the human-written fix.",
  },
  {
    id: "253bb15-transfer-executor",
    botPr: 1968,
    sourceSha: "253bb15b583e4efa502bdcab06750fd35c5df458",
    split: "train",
    reference: {
      pr: 2025,
      commit: "9c827d61c46857091cc4d5d0e679c275da64cd49",
      // #2025 squashes the human answer for 3 source commits (this one,
      // 91427ab, 1505323) into one PR. Only the new changelog entry this
      // commit's changelog/ file maps to, plus the shared changelog summary
      // index and the new Denim upgrade overview page, are attributable to
      // *this* source change — the other two commits' own new changelog
      // entries are not.
      pages: [
        "docs/base-chain/specs/reference/b20/changelog/03-denim-b20-transfer-executor-enforcement.mdx",
        "docs/specifications/b20/changelog.mdx",
        "docs/upgrades/denim/overview.mdx",
        "docs/docs.json",
      ],
    },
    scopeOut: [
      "docs/build-on-base/accept-payments/request-a-payment.mdx",
      "docs/build-on-base/issue-rwa/announce-a-distribution.mdx",
      "docs/base-chain/specs/reference/b20/changelog/02-cobalt-b20asset-multiplier.mdx",
    ],
    heavy: false,
    notes: "review: scope creep (unrelated build-on-base guides + an old Cobalt changelog entry) and paraphrase (rewrote instead of following the upstream changelog verbatim).",
  },
  {
    id: "91427ab-policy-not-invert",
    botPr: 1973,
    sourceSha: "91427ab4435cce088603798318dddd390821b6d1",
    split: "test",
    reference: {
      pr: 2025,
      commit: "9c827d61c46857091cc4d5d0e679c275da64cd49",
      pages: [
        "docs/base-chain/specs/reference/b20/changelog/03-denim-policyregistry-not-policy.mdx",
        "docs/specifications/b20/changelog.mdx",
        "docs/upgrades/denim/overview.mdx",
        "docs/docs.json",
      ],
    },
    scopeOut: [],
    heavy: false,
    notes: "",
  },
  {
    id: "1505323-reject-self-recipient",
    botPr: 1991,
    sourceSha: "150532313c10a410fd81d74d5f1ca0df43865822",
    split: "train",
    reference: {
      pr: 2025,
      commit: "9c827d61c46857091cc4d5d0e679c275da64cd49",
      pages: [
        "docs/base-chain/specs/reference/b20/changelog/03-denim-b20-token-receiver.mdx",
        "docs/specifications/b20/changelog.mdx",
        "docs/upgrades/denim/overview.mdx",
        "docs/docs.json",
      ],
    },
    scopeOut: [],
    heavy: false,
    notes: "",
  },
];

// --------------------------------------------------------------- GitHub API
let _ghToken;
/** `gh auth token` output, cached, never logged. Empty string if unavailable. */
function ghToken() {
  if (_ghToken !== undefined) return _ghToken;
  try {
    _ghToken = execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
  } catch {
    _ghToken = "";
  }
  return _ghToken;
}

async function ghApi(apiPath, { accept = "application/vnd.github+json" } = {}) {
  const token = ghToken();
  const res = await fetch(`https://api.github.com${apiPath}`, {
    headers: {
      Accept: accept,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${apiPath} -> HTTP ${res.status}: ${await res.text()}`);
  }
  return accept.includes("json") ? res.json() : res.text();
}

// ----------------------------------------------------------------- git
function git(args, opts = {}) {
  return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8", ...opts }).trim();
}

function commitExistsLocally(sha) {
  try {
    git(["cat-file", "-e", `${sha}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

/** Parent of `sha`, fetching it from origin first if it isn't local yet. */
function resolveParent(sha) {
  if (!commitExistsLocally(sha)) {
    git(["fetch", "origin", sha]);
  }
  if (!commitExistsLocally(sha)) {
    throw new Error(`commit ${sha} is not reachable locally after fetch`);
  }
  return git(["rev-parse", `${sha}^`]);
}

// ------------------------------------------------------- payload rebuild
/**
 * Mirror the workflow's "Derive trusted removed paths" step: a `removed`
 * file's own name, or a `renamed` file's *previous* name, deduped + sorted
 * + capped. Never sourced from the dispatcher payload.
 */
export function deriveRemovedPaths(files) {
  const removed = files
    .filter((f) => f.status === "removed" || f.status === "renamed")
    .map((f) => (f.status === "renamed" ? f.previous_filename : f.filename))
    .filter((p) => typeof p === "string" && p.length > 0 && p.length <= MAX_REMOVED_PATH_BYTES);
  return [...new Set(removed)].sort().slice(0, MAX_REMOVED_PATHS);
}

/** Every path the commit API lists for this commit, new-name side. */
export function deriveChangedPaths(files) {
  const paths = [...new Set(files.map((f) => f.filename))].sort();
  const overlong = paths.filter((p) => p.length > MAX_CHANGED_PATH_BYTES);
  if (overlong.length > 0) {
    throw new Error(
      `${overlong.length} changed path(s) exceed the ${MAX_CHANGED_PATH_BYTES}-byte cap the workflow enforces, e.g. "${overlong[0]}"`,
    );
  }
  if (paths.length > MAX_CHANGED_PATHS) {
    throw new Error(
      `${paths.length} changed paths exceed the ${MAX_CHANGED_PATHS}-entry cap the workflow enforces for a code-change dispatch`,
    );
  }
  return paths;
}

/**
 * Apply the "Fetch diff artifact from source repo" step's unpacked-diff cap.
 * None of the seed cases are anywhere near 12 MiB; this exists so a future
 * seed entry with a huge diff degrades the same way the real workflow would
 * (truncate + flag `diff_truncated`) instead of silently embedding
 * gigabytes into a case file.
 */
export function capDiff(diff) {
  const bytes = Buffer.byteLength(diff, "utf8");
  if (bytes <= MAX_DIFF_BYTES) return { diff, truncated: false };
  return { diff: Buffer.from(diff, "utf8").slice(0, MAX_DIFF_BYTES).toString("utf8"), truncated: true };
}

async function fetchSourceCommit(sha) {
  return ghApi(`/repos/base/base-std/commits/${sha}`);
}

async function fetchSourceDiff(sha) {
  return ghApi(`/repos/base/base-std/commits/${sha}`, { accept: "application/vnd.github.diff" });
}

/**
 * Build the `payload` object the workflow would hand `index.mjs --payload`,
 * for a `code-change` dispatch. Fields the workflow derives from trusted
 * GitHub API data (`changed_paths`, `removed_paths`, `diff`,
 * `diff_truncated`) are recomputed here from the same API. Fields only the
 * original *dispatcher* run knew (`pr_title`, `pr_body`, `pr_number`) are
 * not recoverable after the fact; we approximate them from the base-std
 * commit message and its own PR (see README "Decisions").
 */
async function buildPayload(sourceSha) {
  const commit = await fetchSourceCommit(sourceSha);
  const rawDiff = await fetchSourceDiff(sourceSha);
  const { diff, truncated } = capDiff(rawDiff);

  const messageHeadline = commit.commit.message.split("\n")[0];
  const prNumMatch = messageHeadline.match(/\(#(\d+)\)\s*$/);
  const prNumber = prNumMatch ? Number(prNumMatch[1]) : null;
  const prTitle = messageHeadline.replace(/\s*\(#\d+\)\s*$/, "");

  let prBody = "";
  if (prNumber) {
    try {
      const pr = await ghApi(`/repos/base/base-std/pulls/${prNumber}`);
      prBody = pr.body || "";
    } catch {
      prBody = ""; // best effort; absence doesn't block the case
    }
  }

  return {
    kind: "code-change",
    source_repo: "base/base-std",
    sha: sourceSha,
    pr_number: prNumber,
    pr_title: prTitle,
    pr_body: prBody,
    changed_paths: deriveChangedPaths(commit.files || []),
    removed_paths: deriveRemovedPaths(commit.files || []),
    diff,
    diff_truncated: truncated,
    diff_artifact_run_id: "",
    diff_artifact_name: "",
  };
}

// ----------------------------------------------------------- review mining
const BOT_LOGINS = new Set(["mintlify", "cb-heimdall"]);
const isBot = (login) => login?.endsWith("[bot]") || BOT_LOGINS.has(login);

/**
 * Hand-written keyword classifier, checked in priority order (first match
 * wins) so a comment that mentions several things lands on the failure mode
 * a human reviewer would call it by. Order matters: e.g. the #1928 closing
 * comment mentions a "wrong claim" (fact) AND dropped files (scope-ish
 * "dropped") AND "source file removed" banners — it is the housekeeping
 * failure the plan's own eval-evidence table files it under, so
 * housekeeping is checked ahead of fact/scope.
 */
export function classifyFinding(text) {
  const t = String(text || "");
  if (/\blast name\b|\bauthor'?s? name\b/i.test(t)) return "naming";
  if (/source file removed|housekeeping|removed banner|\bbanners?\b/i.test(t)) return "housekeeping";
  if (/verbatim|paraphrase|follow what.*written|instead of (just )?following/i.test(t)) return "paraphrase";
  if (/wrong claim|incorrect|invented|hallucinat|factually wrong/i.test(t)) return "fact";
  if (
    /\bdrop(ped)?\b|unrelated|why (these|this)|don'?t need|do we need|shouldn'?t be here|needs? to be here|not (necessary|needed)|scope creep/i.test(
      t,
    )
  )
    return "scope";
  if (/em[- ]dash|title case|fence title/i.test(t)) return "style";
  return "other";
}

/**
 * Reviews + inline review comments + general PR conversation comments,
 * skipping bots. The conversation-comment endpoint (`issues/{pr}/comments`)
 * is the only place a PR's closing comment lands — e.g. #1928's "Closing
 * unmerged" comment cataloguing 13 "source file removed" banners, the
 * motivating housekeeping example in PLAN.md's "Why" table. Without it that
 * case's review_findings would be empty despite being the plan's own
 * flagship failure case.
 */
async function fetchReviewFindings(botPr) {
  const [reviews, comments, issueComments] = await Promise.all([
    ghApi(`/repos/${DOCS_REPO}/pulls/${botPr}/reviews`),
    ghApi(`/repos/${DOCS_REPO}/pulls/${botPr}/comments`),
    ghApi(`/repos/${DOCS_REPO}/issues/${botPr}/comments`),
  ]);
  const findings = [];
  for (const r of reviews) {
    if (isBot(r.user?.login) || !r.body) continue;
    findings.push({ page: null, type: classifyFinding(r.body), text: r.body, url: r.html_url });
  }
  for (const c of comments) {
    if (isBot(c.user?.login) || !c.body) continue;
    findings.push({ page: c.path || null, type: classifyFinding(c.body), text: c.body, url: c.html_url });
  }
  for (const c of issueComments) {
    if (isBot(c.user?.login) || !c.body) continue;
    findings.push({ page: null, type: classifyFinding(c.body), text: c.body, url: c.html_url });
  }
  return findings;
}

// --------------------------------------------------------------- scope
async function draftScopeIn(payload) {
  const route = JSON.parse(
    await fs.readFile(path.join(REPO_ROOT, "scripts", "sync-from-base-std", "route-table.json"), "utf8"),
  );
  const work = await routeCodeChange(route, payload.changed_paths, { removedPaths: payload.removed_paths });
  return [...new Set(work.map((w) => w.page))].sort();
}

// --------------------------------------------------------------- per-case
async function buildCase(seed) {
  const pr = await ghApi(`/repos/${DOCS_REPO}/pulls/${seed.botPr}`);
  const shortSha = seed.sourceSha.slice(0, 7);
  if (!pr.title.includes(`base-std@${shortSha}`)) {
    throw new Error(
      `bot PR #${seed.botPr} title "${pr.title}" does not carry "base-std@${shortSha}" — seed sha may be stale`,
    );
  }
  const commits = await ghApi(`/repos/${DOCS_REPO}/pulls/${seed.botPr}/commits`);
  const firstCommit = commits[0]?.sha;
  if (!firstCommit) throw new Error(`bot PR #${seed.botPr} has no commits`);
  const docsBaseCommit = resolveParent(firstCommit);

  const payload = await buildPayload(seed.sourceSha);
  const reviewFindings = await fetchReviewFindings(seed.botPr);

  const scopeIn = seed.reference ? seed.reference.pages : await draftScopeIn(payload);
  const labelSource = seed.reference ? "reference" : "drafted";

  return {
    id: seed.id,
    source_repo: "base/base-std",
    source_sha: seed.sourceSha,
    bot_pr: seed.botPr,
    docs_base_commit: docsBaseCommit,
    payload,
    reference: seed.reference
      ? { commit: seed.reference.commit, pr: seed.reference.pr, pages: seed.reference.pages }
      : null,
    scope: {
      in: scopeIn,
      out: seed.scopeOut,
      label_source: labelSource,
    },
    review_findings: reviewFindings,
    split: seed.split,
    heavy: seed.heavy,
    notes: seed.notes,
  };
}

// --------------------------------------------------------------------- CLI
function parseArgs(argv) {
  const args = { only: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--only") args.only = argv[++i].split(",").map((s) => s.trim());
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await fs.mkdir(CASES_DIR, { recursive: true });
  const seeds = args.only ? SEED.filter((s) => args.only.includes(s.id)) : SEED;
  if (args.only) {
    const missing = args.only.filter((id) => !seeds.some((s) => s.id === id));
    if (missing.length > 0) throw new Error(`--only named unknown case id(s): ${missing.join(", ")}`);
  }
  if (!ghToken()) {
    console.warn("[build-cases] no `gh auth token` available; requests will be unauthenticated and rate-limited");
  }
  for (const seed of seeds) {
    console.log(`[build-cases] ${seed.id} (bot PR #${seed.botPr}, source ${seed.sourceSha.slice(0, 7)})`);
    const caseDef = await buildCase(seed);
    const outPath = path.join(CASES_DIR, `${seed.id}.json`);
    await fs.writeFile(outPath, JSON.stringify(caseDef, null, 2) + "\n", "utf8");
    console.log(
      `[build-cases]   docs_base_commit=${caseDef.docs_base_commit.slice(0, 7)} diff=${Buffer.byteLength(caseDef.payload.diff, "utf8")}B scope.in=${caseDef.scope.in.length} findings=${caseDef.review_findings.length} -> ${path.relative(REPO_ROOT, outPath)}`,
    );
  }
  console.log(`[build-cases] built ${seeds.length} case(s)`);
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });
}
