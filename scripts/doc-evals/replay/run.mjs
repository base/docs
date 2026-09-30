#!/usr/bin/env node
/**
 * replay/run.mjs — rerun a frozen case's payload through a candidate
 * `scripts/sync-from-base-std/` in a throwaway git worktree checked out at
 * the case's `docs_base_commit`, and collect the contract's output files
 * under `scripts/doc-evals/runs/<run-id>/<case-id>/rep-<n>/`.
 *
 * CLI:
 *   node scripts/doc-evals/replay/run.mjs
 *     [--cases id,id | --split train|test|all]
 *     [--include-heavy] [--reps N] [--candidate <path-to-scripts/sync-from-base-std>]
 *     [--run-id X] [--concurrency N]
 *
 * `replayCase(caseDef, opts)` is also exported for programmatic use (the
 * Phase 2 hillclimb loop).
 *
 * What actually happens per case/rep (see replay/worktree.mjs and
 * replay/log-parser.mjs for the pieces):
 *   1. `git worktree add --detach <tmp> <docs_base_commit>` — historical
 *      docs content.
 *   2. Overlay the candidate's `scripts/sync-from-base-std/` directory (and
 *      symlink its `scripts/node_modules`) — candidate sync code + prompts.
 *   3. Write `caseDef.payload` to a temp file and run
 *      `node scripts/sync-from-base-std/index.mjs --payload <file>` inside
 *      the worktree with `RUNNER_TEMP` set, `GITHUB_OUTPUT` unset, and
 *      `SOURCE_REPO_TOKEN` from `gh auth token` when available, under a
 *      hard timeout mirroring the real workflow's 30-minute job timeout.
 *   4. Parse `touched`/`rejected`/`unchanged` from the captured log, snapshot
 *      before/after content of every touched page, `git diff` the worktree,
 *      copy `.sync-bench/*.jsonl`, and write all of it to the run directory.
 *   5. Always remove the worktree (`finally` — success, thrown error, or
 *      timeout all take the same cleanup path) and `git worktree prune`.
 *
 * Never touches the main checkout or another lane's worktree: every
 * worktree lives under `os.mkdtemp(os.tmpdir())` (see worktree.mjs).
 */

import { execFile, spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { createWorktree, overlayCandidate, removeWorktree } from "./worktree.mjs";
import { parseSyncLog } from "./log-parser.mjs";
import { mapWithConcurrency } from "../../sync-from-base-std/release-utils.mjs";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOC_EVALS_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(DOC_EVALS_ROOT, "..", "..");
const CASES_DIR = path.join(DOC_EVALS_ROOT, "cases");
const RUNS_ROOT = path.join(DOC_EVALS_ROOT, "runs");
const DEFAULT_CANDIDATE_DIR = path.join(REPO_ROOT, "scripts", "sync-from-base-std");

// Mirrors the real workflow's job-level `timeout-minutes: 30` — a replay
// that's still running after this long is stuck, not slow.
const REP_TIMEOUT_MS = 30 * 60 * 1000;

// -------------------------------------------------------------- gh token
let _sourceToken;
/** `gh auth token`, cached, empty string when `gh` isn't authenticated. Never logged. */
async function ghAuthTokenSafe() {
  if (_sourceToken !== undefined) return _sourceToken;
  try {
    const { stdout } = await execFileAsync("gh", ["auth", "token"]);
    _sourceToken = stdout.trim();
  } catch {
    _sourceToken = "";
  }
  return _sourceToken;
}

// ------------------------------------------------------------- subprocess
/**
 * Run `node scripts/sync-from-base-std/index.mjs --payload <payloadPath>`
 * inside `cwd`, capturing combined stdout+stderr and killing it if it runs
 * past `timeoutMs`. Never rejects — a spawn error or timeout is folded into
 * the returned record so the caller can still write a `meta.json`.
 */
function runSync(cwd, payloadPath, env, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn("node", ["scripts/sync-from-base-std/index.mjs", "--payload", payloadPath], {
      cwd,
      env,
    });
    let output = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      output += `\n[replay] spawn error: ${err.message}\n`;
      resolve({ output, exitCode: 1, timedOut: false });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ output, exitCode: timedOut ? null : code, timedOut });
    });
  });
}

// -------------------------------------------------------------- collection
async function gitDiffText(worktreeDir) {
  try {
    const { stdout } = await execFileAsync("git", ["diff", "--no-color"], {
      cwd: worktreeDir,
      maxBuffer: 64 * 1024 * 1024,
    });
    return stdout;
  } catch (err) {
    return `[replay] git diff failed: ${err.message}\n`;
  }
}

/** Read `paths` from `dir`; missing files are silently skipped (already removed/never written). */
async function readFilesIfPresent(dir, paths) {
  const out = {};
  for (const p of paths) {
    try {
      out[p] = await fs.readFile(path.join(dir, p), "utf8");
    } catch {
      // not present — leave unset rather than writing a misleading empty file
    }
  }
  return out;
}

/** `git show <commit>:<path>` for each path; missing = the page didn't exist at that commit (newly created). */
async function readBeforeFiles(repoRoot, commit, paths) {
  const out = {};
  for (const p of paths) {
    try {
      const { stdout } = await execFileAsync("git", ["show", `${commit}:${p}`], {
        cwd: repoRoot,
        maxBuffer: 16 * 1024 * 1024,
      });
      out[p] = stdout;
    } catch {
      // page did not exist at docs_base_commit
    }
  }
  return out;
}

async function readBench(worktreeDir) {
  const benchDir = path.join(worktreeDir, ".sync-bench");
  let entries = [];
  try {
    entries = await fs.readdir(benchDir);
  } catch {
    return ""; // no BENCH_LOG entries this run (e.g. every page skipped before a model call)
  }
  const jsonlFiles = entries.filter((f) => f.endsWith(".jsonl"));
  const parts = await Promise.all(jsonlFiles.map((f) => fs.readFile(path.join(benchDir, f), "utf8")));
  return parts.join("");
}

async function writeFilesUnder(baseDir, files) {
  for (const [relPath, content] of Object.entries(files)) {
    const abs = path.join(baseDir, relPath);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, "utf8");
  }
}

// ------------------------------------------------------------------ replay
/**
 * Replay one case once. Exported for programmatic use (Phase 2 hillclimb).
 *
 * @param {object} caseDef parsed `cases/<id>.json`
 * @param {{runId: string, rep: number, candidateDir?: string, model?: string, outDir?: string}} opts
 * @returns {Promise<object>} the `meta.json` record written for this rep
 */
export async function replayCase(caseDef, opts) {
  const candidateDir = opts.candidateDir || DEFAULT_CANDIDATE_DIR;
  const outDir = opts.outDir || path.join(RUNS_ROOT, opts.runId, caseDef.id, `rep-${opts.rep}`);
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const worktreeDir = await createWorktree(REPO_ROOT, caseDef.docs_base_commit);
  try {
    await overlayCandidate(worktreeDir, candidateDir);

    const runnerTemp = path.join(worktreeDir, ".runner");
    await fs.mkdir(runnerTemp, { recursive: true });
    const payloadPath = path.join(runnerTemp, "payload.json");
    await fs.writeFile(payloadPath, JSON.stringify(caseDef.payload, null, 2), "utf8");

    const sourceToken = await ghAuthTokenSafe();
    const env = {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      LLM_GATEWAY_API_KEY: process.env.LLM_GATEWAY_API_KEY || "",
      ...(process.env.LLM_GATEWAY_BASE_URL ? { LLM_GATEWAY_BASE_URL: process.env.LLM_GATEWAY_BASE_URL } : {}),
      RUNNER_TEMP: runnerTemp,
      ...(sourceToken ? { SOURCE_REPO_TOKEN: sourceToken } : {}),
      ...(opts.model ? { CLAUDE_MODEL: opts.model } : {}),
      // Mirror the workflow's optional repo variables so a replay runs with the
      // same generation settings production would (both unset today, which
      // means client.mjs defaults: claude-sonnet-4-6, 4096 output tokens).
      ...(!opts.model && process.env.CLAUDE_MODEL ? { CLAUDE_MODEL: process.env.CLAUDE_MODEL } : {}),
      ...(process.env.CLAUDE_MAX_TOKENS ? { CLAUDE_MAX_TOKENS: process.env.CLAUDE_MAX_TOKENS } : {}),
      // GITHUB_OUTPUT deliberately unset — index.mjs only appends to it when
      // present, so leaving it out is enough; touched/rejected are parsed
      // from the log instead (see log-parser.mjs).
    };

    const { output, exitCode, timedOut } = await runSync(worktreeDir, payloadPath, env, REP_TIMEOUT_MS);
    const parsed = parseSyncLog(output);

    const [diffPatch, afterFiles, beforeFiles, benchJsonl] = await Promise.all([
      gitDiffText(worktreeDir),
      readFilesIfPresent(worktreeDir, parsed.touched),
      readBeforeFiles(REPO_ROOT, caseDef.docs_base_commit, parsed.touched),
      readBench(worktreeDir),
    ]);

    const meta = {
      caseId: caseDef.id,
      rep: opts.rep,
      runId: opts.runId,
      candidateRef: path.relative(REPO_ROOT, candidateDir) || ".",
      model: opts.model || process.env.CLAUDE_MODEL || "claude-sonnet-4-6",
      startedAt,
      durationMs: Date.now() - t0,
      exitCode,
      timedOut,
      touched: parsed.touched,
      rejected: parsed.rejected,
      unchanged: parsed.unchanged,
    };

    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(path.join(outDir, "meta.json"), JSON.stringify(meta, null, 2) + "\n", "utf8");
    await fs.writeFile(path.join(outDir, "diff.patch"), diffPatch, "utf8");
    await fs.writeFile(path.join(outDir, "sync.log"), output, "utf8");
    await fs.writeFile(path.join(outDir, "bench.jsonl"), benchJsonl, "utf8");
    await writeFilesUnder(path.join(outDir, "after"), afterFiles);
    await writeFilesUnder(path.join(outDir, "before"), beforeFiles);

    return meta;
  } finally {
    await removeWorktree(REPO_ROOT, worktreeDir);
  }
}

// --------------------------------------------------------------------- CLI
function parseArgs(argv) {
  const args = {
    cases: null,
    split: null,
    includeHeavy: false,
    reps: 1,
    candidate: null,
    runId: null,
    concurrency: 1,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--cases") args.cases = argv[++i].split(",").map((s) => s.trim());
    else if (a === "--split") args.split = argv[++i];
    else if (a === "--include-heavy") args.includeHeavy = true;
    else if (a === "--reps") args.reps = Number(argv[++i]);
    else if (a === "--candidate") args.candidate = path.resolve(argv[++i]);
    else if (a === "--run-id") args.runId = argv[++i];
    else if (a === "--concurrency") args.concurrency = Number(argv[++i]);
    else throw new Error(`unknown argument: ${a}`);
  }
  return args;
}

function defaultRunId() {
  return `run-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
}

async function loadCases({ cases, split, includeHeavy }) {
  const files = (await fs.readdir(CASES_DIR)).filter((f) => f.endsWith(".json"));
  const all = await Promise.all(
    files.map(async (f) => JSON.parse(await fs.readFile(path.join(CASES_DIR, f), "utf8"))),
  );
  let selected = all;
  if (cases) {
    selected = all.filter((c) => cases.includes(c.id));
    const missing = cases.filter((id) => !selected.some((c) => c.id === id));
    if (missing.length > 0) throw new Error(`--cases named unknown case id(s): ${missing.join(", ")}`);
  } else if (split && split !== "all") {
    selected = all.filter((c) => c.split === split);
  }
  if (!includeHeavy) selected = selected.filter((c) => !c.heavy);
  return selected;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const runId = args.runId || defaultRunId();
  const candidateDir = args.candidate || DEFAULT_CANDIDATE_DIR;
  const cases = await loadCases(args);
  if (cases.length === 0) {
    console.log("[replay] no cases matched the given filters (heavy cases are excluded by default)");
    return;
  }

  const tasks = [];
  for (const caseDef of cases) {
    for (let rep = 1; rep <= args.reps; rep++) tasks.push({ caseDef, rep });
  }
  console.log(`[replay] run ${runId}: ${cases.length} case(s) x ${args.reps} rep(s) = ${tasks.length} task(s), candidate=${path.relative(REPO_ROOT, candidateDir) || "."}`);

  const results = await mapWithConcurrency(tasks, args.concurrency, async ({ caseDef, rep }) => {
    console.log(`[replay] start ${caseDef.id} rep-${rep}`);
    try {
      const meta = await replayCase(caseDef, { runId, rep, candidateDir });
      console.log(
        `[replay] done  ${caseDef.id} rep-${rep}: exit=${meta.exitCode} timedOut=${meta.timedOut} touched=${meta.touched.length} rejected=${meta.rejected.length} unchanged=${meta.unchanged.length} (${(meta.durationMs / 1000).toFixed(1)}s)`,
      );
      return { caseId: caseDef.id, rep, ok: true, meta };
    } catch (err) {
      console.error(`[replay] FAILED ${caseDef.id} rep-${rep}: ${err.stack || err}`);
      return { caseId: caseDef.id, rep, ok: false, error: String(err) };
    }
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n[replay] ${results.length - failed.length}/${results.length} rep(s) completed; run dir: ${path.relative(REPO_ROOT, path.join(RUNS_ROOT, runId))}`);
  if (failed.length > 0) process.exitCode = 1;
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });
}
