/**
 * Patch validation, scratch-copy application, and verification for the
 * hillclimb. Nothing here ever writes to the real `scripts/sync-from-base-std/`:
 * proposals are applied to a scratch tree under the run directory that mirrors
 * the repo layout (so the sync's own unit tests and the replay overlay find
 * `docs/`, `scripts/node_modules`, ... where they expect them).
 */
import { execFile, spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { ALLOWED_EDIT_PATHS } from "./proposer.mjs";

const execFileAsync = promisify(execFile);

const PROMPTS = ALLOWED_EDIT_PATHS[0];
const ROUTE_TABLE = ALLOWED_EDIT_PATHS[1];
const SYNC_REL = "scripts/sync-from-base-std";
const TEST_TIMEOUT_MS = 5 * 60 * 1000;

/** @returns {string[]} repo-relative paths the given `--surface` may edit */
export function allowedPathsFor(surface) {
  if (surface === "prompts") return [PROMPTS];
  if (surface === "route-table") return [ROUTE_TABLE];
  return [PROMPTS, ROUTE_TABLE];
}

/**
 * Validate a parsed proposer reply. Accepts only allowed paths, non-empty
 * distinct files whose content changed, and (for route-table.json) valid JSON.
 * Export-compatibility of prompts.mjs is checked separately (`checkExports`)
 * because it needs a child process on the written file.
 *
 * @param {any} proposal
 * @param {{surface: string, currentFiles: Record<string,string>}} ctx
 * @returns {{ok: boolean, errors: string[], files: Array<{path: string, content: string}>}}
 */
export function validateProposal(proposal, { surface, currentFiles }) {
  const errors = [];
  if (!proposal || typeof proposal !== "object" || Array.isArray(proposal)) {
    return { ok: false, errors: ["proposal is not a JSON object"], files: [] };
  }
  if (typeof proposal.rationale !== "string" || !proposal.rationale.trim()) errors.push("missing rationale");
  if (typeof proposal.root_cause !== "string" || !proposal.root_cause.trim()) errors.push("missing root_cause");
  if (!Array.isArray(proposal.files) || proposal.files.length === 0) {
    errors.push("files must be a non-empty array");
    return { ok: false, errors, files: [] };
  }
  const allowed = allowedPathsFor(surface);
  const seen = new Set();
  const files = [];
  for (const f of proposal.files) {
    const p = typeof f?.path === "string" ? path.posix.normalize(f.path.replace(/^\.\//, "")) : "";
    if (!allowed.includes(p)) {
      errors.push(`path not allowed for surface "${surface}": ${JSON.stringify(f?.path)}`);
      continue;
    }
    if (seen.has(p)) {
      errors.push(`duplicate path: ${p}`);
      continue;
    }
    seen.add(p);
    if (typeof f.content !== "string" || !f.content.trim()) {
      errors.push(`empty content for ${p}`);
      continue;
    }
    if (p === ROUTE_TABLE) {
      try {
        const parsed = JSON.parse(f.content);
        if (!parsed || typeof parsed !== "object") throw new Error("not an object");
      } catch (err) {
        errors.push(`${p} is not valid JSON: ${err.message}`);
        continue;
      }
    }
    if (f.content === currentFiles[p]) {
      errors.push(`no change to ${p}`);
      continue;
    }
    files.push({ path: p, content: f.content });
  }
  if (errors.length === 0 && files.length === 0) errors.push("no applicable files");
  return { ok: errors.length === 0, errors, files };
}

/**
 * Create `<scratchRoot>` mirroring the repo layout: every non-dot top-level
 * entry except `scripts/` is a symlink to the real one, `scripts/` is a real
 * directory whose entries are symlinks except `sync-from-base-std/`, which is
 * a fresh COPY of `fromSyncDir` (the only thing a round may modify).
 *
 * @returns {Promise<string>} absolute path of the scratch `scripts/sync-from-base-std`
 */
export async function createScratchTree({ scratchRoot, fromSyncDir, repoRoot }) {
  await fs.rm(scratchRoot, { recursive: true, force: true });
  await fs.mkdir(path.join(scratchRoot, "scripts"), { recursive: true });
  for (const e of await fs.readdir(repoRoot)) {
    if (e.startsWith(".") || e === "scripts") continue;
    await fs.symlink(path.join(repoRoot, e), path.join(scratchRoot, e));
  }
  for (const e of await fs.readdir(path.join(repoRoot, "scripts"))) {
    if (e === "sync-from-base-std") continue;
    await fs.symlink(path.join(repoRoot, "scripts", e), path.join(scratchRoot, "scripts", e));
  }
  const dest = path.join(scratchRoot, SYNC_REL);
  await fs.cp(fromSyncDir, dest, { recursive: true });
  return dest;
}

/** Write validated files into the scratch tree (paths are repo-relative). */
export async function applyFiles(scratchRoot, files) {
  for (const f of files) {
    const abs = path.join(scratchRoot, f.path);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, f.content, "utf8");
  }
}

/** Named exports of an ES module, read in a child process so the patched file is really imported. */
export async function listExports(file) {
  const script = `import(${JSON.stringify(pathToFileURL(file).href)}).then((m) => console.log(JSON.stringify(Object.keys(m).sort())))`;
  const { stdout } = await execFileAsync("node", ["--input-type=module", "-e", script], {
    timeout: 30000,
    env: { PATH: process.env.PATH, HOME: process.env.HOME },
  });
  return JSON.parse(stdout.trim());
}

/**
 * The patched prompts.mjs must still import cleanly and keep every export it had.
 * @returns {Promise<{ok: boolean, detail: string}>}
 */
export async function checkExports(originalFile, patchedFile) {
  let before;
  let after;
  try {
    before = await listExports(originalFile);
    after = await listExports(patchedFile);
  } catch (err) {
    return { ok: false, detail: `prompts.mjs failed to import: ${String(err.stderr || err.message).slice(0, 300)}` };
  }
  const missing = before.filter((n) => !after.includes(n));
  return missing.length === 0
    ? { ok: true, detail: `${after.length} exports` }
    : { ok: false, detail: `prompts.mjs lost export(s): ${missing.join(", ")}` };
}

/** Names of failed tests in TAP output (`not ok N - name`, any nesting). */
export function parseFailingTests(tap) {
  const names = [];
  for (const m of String(tap).matchAll(/^\s*not ok \d+ - (.+?)(?:\s+#.*)?$/gm)) names.push(m[1]);
  return names;
}

/**
 * Run the sync's own unit tests against a scratch tree (`node --test`, cwd =
 * scratch root, minimal env so no API key reaches them).
 *
 * @returns {Promise<{exitCode: number|null, failing: string[], tail: string}>}
 */
export function runSyncTests(scratchRoot) {
  return new Promise(async (resolve) => {
    const dir = path.join(scratchRoot, SYNC_REL, "__tests__");
    let files = [];
    try {
      files = (await fs.readdir(dir)).filter((f) => f.endsWith(".test.mjs")).map((f) => path.join(dir, f));
    } catch {
      /* no tests dir: fall through to failure below */
    }
    if (files.length === 0) return resolve({ exitCode: null, failing: [], tail: "no sync tests found" });
    const child = spawn("node", ["--test", "--test-reporter=tap", ...files], {
      cwd: scratchRoot,
      env: { PATH: process.env.PATH, HOME: process.env.HOME },
      timeout: TEST_TIMEOUT_MS,
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("error", (err) => resolve({ exitCode: null, failing: [], tail: `spawn error: ${err.message}` }));
    child.on("close", (code) => resolve({ exitCode: code, failing: parseFailingTests(out), tail: out.slice(-1500) }));
  });
}

/**
 * A patch passes the sync's tests when it introduces no failure beyond the
 * ones already failing on the unpatched scratch copy (`baselineFailing`), and
 * the run did not crash. Tolerating pre-existing failures is deliberate: the
 * tree's own `docs/`-dependent routing test can fail independent of any prompt.
 */
export function testsAcceptable(baselineFailing, result) {
  const base = new Set(baselineFailing);
  const introduced = result.failing.filter((n) => !base.has(n));
  if (introduced.length > 0) return { ok: false, detail: `new test failure(s): ${introduced.join("; ")}` };
  if (result.exitCode !== 0 && result.failing.length === 0) {
    return { ok: false, detail: `sync tests crashed (exit ${result.exitCode}): ${result.tail.slice(-300)}` };
  }
  return { ok: true, detail: `${result.failing.length} pre-existing failure(s), none new` };
}

/**
 * `git diff --no-index` of original vs patched files, with the temp paths
 * rewritten to `a/<repo path>` / `b/<repo path>`.
 *
 * @param {{origRoot: string, newRoot: string, relPaths: string[]}} input roots contain `<relPath>` files
 * @returns {Promise<string>}
 */
export async function makePatch({ origRoot, newRoot, relPaths }) {
  let out = "";
  for (const rel of relPaths) {
    const a = path.join(origRoot, rel);
    const b = path.join(newRoot, rel);
    let stdout = "";
    try {
      ({ stdout } = await execFileAsync("git", ["diff", "--no-index", "--no-color", "--", a, b], {
        maxBuffer: 32 * 1024 * 1024,
      }));
    } catch (err) {
      if (err.code !== 1) throw err; // exit 1 = differences found, which is what we want
      stdout = err.stdout;
    }
    out += stdout.split(`a${a}`).join(`a/${rel}`).split(`b${b}`).join(`b/${rel}`);
  }
  return out;
}
