/**
 * Schema validation for every committed case file, against the "Case file"
 * contract in scripts/doc-evals/PLAN.md ("Shared contracts" section). Pure
 * filesystem read of already-built JSON — no network.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CASES_DIR = path.join(__dirname, "..", "cases");
const SHA_RE = /^[0-9a-f]{40}$/;
const VALID_FINDING_TYPES = new Set(["scope", "paraphrase", "fact", "housekeeping", "style", "naming", "other"]);
const VALID_SPLITS = new Set(["train", "test"]);
const VALID_LABEL_SOURCES = new Set(["reference", "review", "drafted"]);

async function loadCases() {
  const files = (await fs.readdir(CASES_DIR)).filter((f) => f.endsWith(".json"));
  assert.ok(files.length > 0, "expected at least one case file under scripts/doc-evals/cases/");
  return Promise.all(
    files.map(async (f) => ({ file: f, def: JSON.parse(await fs.readFile(path.join(CASES_DIR, f), "utf8")) })),
  );
}

test("every case file: required top-level fields with the right shapes", async () => {
  const cases = await loadCases();
  for (const { file, def } of cases) {
    assert.equal(def.id, file.replace(/\.json$/, ""), `${file}: id must match its filename`);
    assert.equal(def.source_repo, "base/base-std", file);
    assert.match(def.source_sha, SHA_RE, `${file}: source_sha must be a 40-char lowercase hex sha`);
    assert.equal(typeof def.bot_pr, "number", file);
    assert.match(def.docs_base_commit, SHA_RE, `${file}: docs_base_commit must be a 40-char lowercase hex sha`);
    assert.notEqual(def.docs_base_commit, def.source_sha, file);
    assert.ok(VALID_SPLITS.has(def.split), `${file}: split must be train|test, got ${def.split}`);
    assert.equal(typeof def.heavy, "boolean", file);
    assert.equal(typeof def.notes, "string", file);
    assert.ok(def.payload && typeof def.payload === "object", file);
    assert.ok(Array.isArray(def.review_findings), file);
    assert.ok(def.scope && typeof def.scope === "object", file);
  }
});

test("payload: matches what index.mjs reads for a code-change dispatch", async () => {
  const cases = await loadCases();
  for (const { file, def } of cases) {
    const p = def.payload;
    assert.equal(p.kind, "code-change", file);
    assert.equal(p.source_repo, "base/base-std", file);
    assert.equal(p.sha, def.source_sha, `${file}: payload.sha must equal source_sha`);
    assert.equal(typeof p.diff, "string", file);
    assert.ok(p.diff.length > 0, `${file}: diff must not be empty`);
    assert.ok(Array.isArray(p.changed_paths) && p.changed_paths.length > 0, file);
    assert.ok(Array.isArray(p.removed_paths), file);
    assert.equal(typeof p.diff_truncated, "boolean", file);
    // Mirrors the "Fetch diff artifact" step's unpacked-diff cap.
    assert.ok(Buffer.byteLength(p.diff, "utf8") <= 12_582_912, `${file}: diff exceeds the 12 MiB workflow cap`);
  }
});

test("scope: label_source is one of the contract's three values, in/out are string arrays", async () => {
  const cases = await loadCases();
  for (const { file, def } of cases) {
    assert.ok(VALID_LABEL_SOURCES.has(def.scope.label_source), `${file}: bad label_source ${def.scope.label_source}`);
    assert.ok(Array.isArray(def.scope.in), file);
    assert.ok(Array.isArray(def.scope.out), file);
    for (const p of [...def.scope.in, ...def.scope.out]) {
      assert.equal(typeof p, "string", file);
      assert.ok(p.startsWith("docs/"), `${file}: scope path "${p}" should live under docs/`);
    }
  }
});

test("scope: a case with a reference uses label_source \"reference\" and scope.in matches reference.pages", async () => {
  const cases = await loadCases();
  for (const { file, def } of cases) {
    if (def.reference) {
      assert.equal(def.scope.label_source, "reference", file);
      assert.deepEqual([...def.scope.in].sort(), [...def.reference.pages].sort(), file);
    } else {
      assert.equal(def.scope.label_source, "drafted", file);
    }
  }
});

test("reference: when present, has a commit sha, PR number, and non-empty pages", async () => {
  const cases = await loadCases();
  for (const { file, def } of cases) {
    if (def.reference === null) continue;
    assert.match(def.reference.commit, SHA_RE, file);
    assert.equal(typeof def.reference.pr, "number", file);
    assert.ok(Array.isArray(def.reference.pages) && def.reference.pages.length > 0, file);
  }
});

test("review_findings: every finding has a valid type and (when present) a non-empty verbatim text + url", async () => {
  const cases = await loadCases();
  for (const { file, def } of cases) {
    for (const finding of def.review_findings) {
      assert.ok(VALID_FINDING_TYPES.has(finding.type), `${file}: bad finding type ${finding.type}`);
      assert.equal(typeof finding.text, "string", file);
      assert.ok(finding.text.length > 0, file);
      assert.equal(typeof finding.url, "string", file);
      assert.ok(finding.url.startsWith("https://github.com/base/docs/pull/"), file);
      assert.ok(finding.page === null || typeof finding.page === "string", file);
    }
  }
});

test("ids follow the <short-sha>-<slug> convention and are unique", async () => {
  const cases = await loadCases();
  const ids = cases.map((c) => c.def.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate case ids");
  for (const { def } of cases) {
    assert.match(def.id, /^[0-9a-f]{7}-[a-z0-9-]+$/, def.id);
    assert.equal(def.id.slice(0, 7), def.source_sha.slice(0, 7), `${def.id}: slug prefix must match source_sha`);
  }
});

test("the seed list's known-heavy and smallest-diff cases are present", async () => {
  const cases = await loadCases();
  const ids = cases.map((c) => c.def.id);
  assert.ok(ids.some((id) => id.startsWith("be6d045-")), "the heavy be6d045 restructure case is missing");
  assert.ok(ids.some((id) => id.startsWith("868d513-")), "the smallest-diff 868d513 case is missing");
  assert.equal(cases.length, 9, "expected all 9 seed cases to be built");
});
