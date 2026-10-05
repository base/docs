#!/usr/bin/env node
/**
 * run-eval.mjs — measure the docs sync against recorded real-world cases.
 *
 * Each case pins a dispatch payload and the docs commit it ran against, plus
 * the outcome we want (which pages must, may, and must not change, and how
 * large edits to secondary pages may be). The harness runs the CURRENT
 * working-tree sync code (prompts, routing, route table) against the pinned
 * docs tree in a throwaway git worktree, so prompt changes can be compared
 * run-for-run instead of judged by eye.
 *
 * Usage (from the repo root):
 *   LLM_GATEWAY_API_KEY=... node scripts/sync-from-base-std/eval/run-eval.mjs \
 *     [--case 3820cf0-isauthorized-natspec] [--runs 3] [--keep]
 *
 *   --case   case file name under eval/cases (without .json); default: all
 *   --runs   independent runs per case (model output varies run to run)
 *   --keep   keep the worktrees for inspection instead of removing them
 *   --code-ref <ref>  take the sync code from a git ref (e.g. master) instead
 *            of the working tree, to get a baseline for comparison
 *
 * SOURCE_REPO_TOKEN defaults to `gh auth token` so changelog entries can read
 * their full source file, the same as in CI.
 *
 * Results print as a table and are written to .sync-eval/<timestamp>.json.
 * Exit code is 1 if any run fails its expectations.
 */

import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..", "..");
const CASES_DIR = path.join(HERE, "cases");

// ------------------------------------------------------------- scoring (pure)

/** Parse `git diff --numstat` into {path: {added, removed}}. */
export function parseNumstat(text) {
  const out = {};
  for (const line of String(text).split("\n")) {
    const m = /^(\d+|-)\t(\d+|-)\t(.+)$/.exec(line);
    if (!m) continue;
    out[m[3]] = { added: Number(m[1]) || 0, removed: Number(m[2]) || 0 };
  }
  return out;
}

/** Added lines per file from a unified diff. */
export function addedLinesByFile(diff) {
  const out = {};
  let file = null;
  for (const line of String(diff).split("\n")) {
    if (line.startsWith("+++ ")) {
      file = line.startsWith("+++ b/") ? line.slice(6) : null;
      if (file) out[file] = out[file] || [];
    } else if (file && line.startsWith("+") ) {
      out[file].push(line.slice(1));
    }
  }
  return out;
}

/**
 * Score one run against a case's expectations.
 * @returns {{pass: boolean, violations: string[], restated: string[]}}
 */
export function scoreRun(expect, numstat, addedByFile = {}) {
  const violations = [];
  const touched = Object.keys(numstat);
  const may = expect.may_touch || {};
  const mustNot = new Set(expect.must_not_touch || []);
  const must = expect.must_touch || [];

  for (const p of must) {
    if (!numstat[p]) violations.push(`missing required edit: ${p}`);
  }
  for (const p of touched) {
    if (mustNot.has(p)) {
      violations.push(`edited a page it should leave alone: ${p} (+${numstat[p].added} -${numstat[p].removed})`);
    } else if (p in may) {
      if (numstat[p].added > may[p]) {
        violations.push(`edit too large: ${p} adds ${numstat[p].added} lines (budget ${may[p]})`);
      }
    } else if (!must.includes(p) && (expect.unlisted_pages || "fail") === "fail") {
      violations.push(`edited an unlisted page: ${p} (+${numstat[p].added} -${numstat[p].removed})`);
    }
  }

  const restated = [];
  const r = expect.restatement;
  if (r) {
    const owners = new Set(r.owners || []);
    for (const [p, lines] of Object.entries(addedByFile)) {
      if (owners.has(p)) continue;
      const text = lines.join("\n").toLowerCase();
      const hits = r.keywords.filter((k) => text.includes(k.toLowerCase())).length;
      if (hits >= (r.min_keywords || r.keywords.length)) restated.push(p);
    }
    for (const p of restated) violations.push(`restates the full rules outside their owner pages: ${p}`);
  }
  return { pass: violations.length === 0, violations, restated };
}

// ------------------------------------------------------------------ running

function parseArgs(argv) {
  const out = { runs: 1, keep: false, case: null, codeRef: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--runs") out.runs = Math.max(1, Number(argv[++i]) || 1);
    else if (a === "--case") out.case = argv[++i];
    else if (a === "--keep") out.keep = true;
    else if (a === "--code-ref") out.codeRef = argv[++i];
    else throw new Error(`unknown argument '${a}'`);
  }
  return out;
}

function git(args, cwd = REPO_ROOT) {
  return execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function sourceToken() {
  if (process.env.SOURCE_REPO_TOKEN) return process.env.SOURCE_REPO_TOKEN;
  try {
    return execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

async function prepareWorktree(baseSha, label, codeRef) {
  // realpath: on macOS os.tmpdir() is under /var, a symlink to /private/var.
  // The sync only runs main() when argv[1] equals its resolved module path.
  const dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), `sync-eval-${label}-`)));
  git(["worktree", "add", "--detach", "--force", dir, baseSha]);
  if (codeRef) {
    // Baseline mode: sync code from a committed ref, docs still pinned.
    git(["checkout", codeRef, "--", "scripts/sync-from-base-std", "scripts/lib", "scripts/package.json"], dir);
    git(["reset", "-q"], dir);
    await fs.rm(path.join(dir, "scripts", "node_modules"), { recursive: true, force: true });
    await fs.symlink(path.join(REPO_ROOT, "scripts", "node_modules"), path.join(dir, "scripts", "node_modules"), "dir");
    return dir;
  }
  // Overlay the code under test (working tree, including uncommitted edits)
  // on top of the pinned docs tree. Docs content and guidelines stay pinned.
  const srcScripts = path.join(REPO_ROOT, "scripts");
  const dstScripts = path.join(dir, "scripts");
  await fs.rm(path.join(dstScripts, "sync-from-base-std"), { recursive: true, force: true });
  await fs.cp(path.join(srcScripts, "sync-from-base-std"), path.join(dstScripts, "sync-from-base-std"), {
    recursive: true,
  });
  await fs.cp(path.join(srcScripts, "lib"), path.join(dstScripts, "lib"), { recursive: true, force: true });
  await fs.cp(path.join(srcScripts, "package.json"), path.join(dstScripts, "package.json"));
  await fs.rm(path.join(dstScripts, "node_modules"), { recursive: true, force: true });
  await fs.symlink(path.join(srcScripts, "node_modules"), path.join(dstScripts, "node_modules"), "dir");
  return dir;
}

function runSync(dir, payloadPath, logPath) {
  return new Promise((resolve) => {
    const env = {
      ...process.env,
      SOURCE_REPO_TOKEN: sourceToken(),
      GITHUB_OUTPUT: path.join(dir, ".eval-github-output"),
      RUNNER_TEMP: path.join(dir, ".eval-runner-temp"),
    };
    delete env.DRY_RUN;
    execFileSync("mkdir", ["-p", env.RUNNER_TEMP]);
    const child = spawn(
      process.execPath,
      [path.join(dir, "scripts/sync-from-base-std/index.mjs"), "--payload", payloadPath],
      { cwd: dir, env },
    );
    const chunks = [];
    child.stdout.on("data", (d) => chunks.push(d));
    child.stderr.on("data", (d) => chunks.push(d));
    child.on("close", async (code) => {
      await fs.writeFile(logPath, Buffer.concat(chunks));
      resolve(code);
    });
  });
}

async function runOnce(caseName, spec, runIndex, outDir, keep, codeRef) {
  const label = `${caseName}-${runIndex}`;
  const dir = await prepareWorktree(spec.docs_base_sha, label, codeRef);
  const logPath = path.join(outDir, `${label}.log`);
  try {
    const payloadPath = path.resolve(CASES_DIR, spec.payload);
    const code = await runSync(dir, payloadPath, logPath);
    // Only docs/ content counts; ignore the overlaid scripts and eval scratch.
    const numstat = parseNumstat(git(["diff", "--numstat", "--", "docs"], dir));
    const untracked = git(["ls-files", "--others", "--exclude-standard", "--", "docs"], dir)
      .split("\n")
      .filter(Boolean);
    for (const p of untracked) {
      const added = (await fs.readFile(path.join(dir, p), "utf8")).split("\n").length;
      numstat[p] = { added, removed: 0 };
    }
    const diff = git(["diff", "--", "docs"], dir);
    await fs.writeFile(path.join(outDir, `${label}.diff`), diff);
    const score = scoreRun(spec.expect, numstat, addedLinesByFile(diff));
    if (code !== 0) score.violations.unshift(`sync exited with code ${code} (see ${logPath})`);
    score.pass = score.pass && code === 0;
    return { case: caseName, run: runIndex, exitCode: code, numstat, ...score };
  } finally {
    if (!keep) {
      git(["worktree", "remove", "--force", dir]);
    } else {
      console.log(`[eval] kept worktree ${dir}`);
    }
  }
}

function printSummary(results) {
  for (const r of results) {
    const files = Object.entries(r.numstat)
      .map(([p, s]) => `    ${p.replace(/^docs\//, "")} +${s.added} -${s.removed}`)
      .join("\n");
    console.log(`\n${r.pass ? "PASS" : "FAIL"} ${r.case} run ${r.run} — ${Object.keys(r.numstat).length} page(s)`);
    if (files) console.log(files);
    for (const v of r.violations) console.log(`  ✗ ${v}`);
  }
  const passed = results.filter((r) => r.pass).length;
  console.log(`\n${passed}/${results.length} run(s) passed`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!process.env.LLM_GATEWAY_API_KEY) throw new Error("LLM_GATEWAY_API_KEY is not set");
  const caseFiles = args.case
    ? [`${args.case}.json`]
    : (await fs.readdir(CASES_DIR)).filter((f) => f.endsWith(".json"));
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(REPO_ROOT, ".sync-eval", `${stamp}-${args.codeRef ? args.codeRef.replace(/[^\w.-]/g, "_") : "worktree"}`);
  await fs.mkdir(outDir, { recursive: true });

  const jobs = [];
  for (const file of caseFiles) {
    const caseName = file.replace(/\.json$/, "");
    const spec = JSON.parse(await fs.readFile(path.join(CASES_DIR, file), "utf8"));
    for (let i = 1; i <= args.runs; i++) jobs.push(runOnce(caseName, spec, i, outDir, args.keep, args.codeRef));
  }
  const results = await Promise.all(jobs);
  await fs.writeFile(path.join(outDir, "results.json"), JSON.stringify(results, null, 2));
  printSummary(results);
  console.log(`\nLogs, diffs, and results.json: ${path.relative(REPO_ROOT, outDir)}/`);
  if (results.some((r) => !r.pass)) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((err) => {
    console.error(`[eval] ${err.message}`);
    process.exit(1);
  });
}
