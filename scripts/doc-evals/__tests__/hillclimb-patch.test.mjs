import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  allowedPathsFor, applyFiles, checkExports, createScratchTree, makePatch, parseFailingTests, testsAcceptable, validateProposal,
} from "../hillclimb/patch.mjs";

const PROMPTS = "scripts/sync-from-base-std/llm/prompts.mjs";
const ROUTES = "scripts/sync-from-base-std/route-table.json";
const current = { [PROMPTS]: "export const A = 1;\n", [ROUTES]: '{"routes":[]}' };
const good = (files) => ({ rationale: "r", root_cause: "c", files });
const v = (proposal, surface = "both") => validateProposal(proposal, { surface, currentFiles: current });

test("validateProposal accepts allowed, changed files", () => {
  const r = v(good([{ path: PROMPTS, content: "export const A = 2;\n" }, { path: `./${ROUTES}`, content: '{"routes":[1]}' }]));
  assert.equal(r.ok, true);
  assert.deepEqual(r.files.map((f) => f.path), [PROMPTS, ROUTES]);
});

test("validateProposal rejects disallowed paths", () => {
  for (const p of ["scripts/sync-from-base-std/safety.mjs", "scripts/sync-from-base-std/index.mjs", "docs/content-guidelines.md",
    "scripts/doc-evals/cases/x.json", "../etc/passwd", "scripts/sync-from-base-std/llm/../safety.mjs"]) {
    const r = v(good([{ path: p, content: "x" }]));
    assert.equal(r.ok, false, p);
    assert.match(r.errors.join(), /not allowed/);
  }
});

test("validateProposal enforces --surface", () => {
  assert.equal(v(good([{ path: ROUTES, content: '{"a":1}' }]), "prompts").ok, false);
  assert.equal(v(good([{ path: PROMPTS, content: "export const A = 3;" }]), "route-table").ok, false);
  assert.deepEqual(allowedPathsFor("prompts"), [PROMPTS]);
});

test("validateProposal rejects bad JSON in route-table.json", () => {
  const r = v(good([{ path: ROUTES, content: "{not json" }]));
  assert.equal(r.ok, false);
  assert.match(r.errors.join(), /not valid JSON/);
});

test("validateProposal rejects malformed proposals", () => {
  assert.equal(v(null).ok, false);
  assert.equal(v([]).ok, false);
  assert.equal(v({ rationale: "r", root_cause: "c", files: [] }).ok, false);
  assert.equal(v({ files: [{ path: PROMPTS, content: "x" }] }).ok, false); // no rationale/root_cause
  assert.equal(v(good([{ path: PROMPTS, content: "" }])).ok, false);
  assert.equal(v(good([{ path: PROMPTS, content: current[PROMPTS] }])).ok, false); // unchanged
  assert.equal(v(good([{ path: PROMPTS, content: "a" }, { path: PROMPTS, content: "b" }])).ok, false); // duplicate
});

test("parseFailingTests and testsAcceptable tolerate pre-existing failures only", () => {
  const tap = "TAP version 13\nok 1 - fine\nnot ok 2 - old failure\n    not ok 1 - nested new\n1..2\n";
  assert.deepEqual(parseFailingTests(tap), ["old failure", "nested new"]);
  const base = ["old failure"];
  assert.equal(testsAcceptable(base, { exitCode: 1, failing: ["old failure"], tail: "" }).ok, true);
  assert.equal(testsAcceptable(base, { exitCode: 0, failing: [], tail: "" }).ok, true);
  assert.equal(testsAcceptable(base, { exitCode: 1, failing: ["old failure", "brand new"], tail: "" }).ok, false);
  assert.equal(testsAcceptable(base, { exitCode: 1, failing: [], tail: "boom" }).ok, false); // crash
});

async function fakeRepo() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "hc-patch-"));
  await fs.mkdir(path.join(root, "docs"), { recursive: true });
  await fs.writeFile(path.join(root, "docs", "a.mdx"), "a");
  await fs.mkdir(path.join(root, "scripts", "node_modules"), { recursive: true });
  await fs.mkdir(path.join(root, "scripts", "sync-from-base-std", "llm"), { recursive: true });
  await fs.writeFile(path.join(root, PROMPTS), "export const A = 1;\nexport function f() {}\n");
  await fs.writeFile(path.join(root, ROUTES), '{"routes":[]}\n');
  return root;
}

test("createScratchTree mirrors the repo, copies only the sync dir, and applyFiles never touches the original", async () => {
  const repo = await fakeRepo();
  const scratch = path.join(repo, "..", path.basename(repo) + "-scratch");
  try {
    const sync = await createScratchTree({ scratchRoot: scratch, fromSyncDir: path.join(repo, "scripts", "sync-from-base-std"), repoRoot: repo });
    assert.equal(sync, path.join(scratch, "scripts", "sync-from-base-std"));
    assert.equal(await fs.readFile(path.join(scratch, "docs", "a.mdx"), "utf8"), "a"); // symlinked
    assert.ok((await fs.lstat(path.join(scratch, "scripts", "node_modules"))).isSymbolicLink());
    assert.ok(!(await fs.lstat(sync)).isSymbolicLink());
    await applyFiles(scratch, [{ path: PROMPTS, content: "export const A = 2;\n" }]);
    assert.match(await fs.readFile(path.join(scratch, PROMPTS), "utf8"), /A = 2/);
    assert.match(await fs.readFile(path.join(repo, PROMPTS), "utf8"), /A = 1/);

    const patch = await makePatch({ origRoot: repo, newRoot: scratch, relPaths: [PROMPTS] });
    assert.match(patch, new RegExp(`--- a/${PROMPTS}`));
    assert.match(patch, new RegExp(`\\+\\+\\+ b/${PROMPTS}`));
    assert.match(patch, /-export const A = 1;/);
    assert.match(patch, /\+export const A = 2;/);
    assert.ok(!patch.includes(os.tmpdir()), "temp paths are rewritten");
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("checkExports: same exports ok; lost export, syntax error rejected (real child process)", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hc-exp-"));
  try {
    const w = async (n, s) => {
      await fs.writeFile(path.join(dir, n), s);
      return path.join(dir, n);
    };
    const orig = await w("o.mjs", "export const A = 1;\nexport function f() {}\n");
    assert.equal((await checkExports(orig, await w("same.mjs", "export const A = 9;\nexport function f() { return 1; }\nexport const B = 2;\n"))).ok, true);
    const lost = await checkExports(orig, await w("lost.mjs", "export const A = 1;\n"));
    assert.equal(lost.ok, false);
    assert.match(lost.detail, /lost export\(s\): f/);
    assert.equal((await checkExports(orig, await w("bad.mjs", "export const A = ;\n"))).ok, false);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
