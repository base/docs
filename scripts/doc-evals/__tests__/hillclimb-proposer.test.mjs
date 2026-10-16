import test from "node:test";
import assert from "node:assert/strict";

import { buildProposerPrompt, buildReflectionPrompt, parseProposal, TAXONOMY_TEXT } from "../hillclimb/proposer.mjs";

const SENTINEL = "ZZ-TEST-SENTINEL-9f3a";

const failGrade = { checks: [
  { id: "scope.forbidden", layer: "code", page: "docs/build-on-base/x.mdx", pass: false, score: 0, detail: "touched a forbidden page" },
  { id: "judge.J3", layer: "judge", page: "docs/a.mdx", pass: false, score: 0, detail: "unrelated edit to the intro" },
  { id: "grounding", layer: "code", page: null, pass: true, score: 1, detail: "all grounded" },
  { id: "pairwise.x", layer: "pairwise", page: "docs/a.mdx", pass: null, score: 0, detail: "parse error" },
] };

const mkEvidence = (role, id, extra = "") => ({
  role,
  caseDef: {
    id,
    scope: { in: ["docs/a.mdx"], out: ["docs/build-on-base/"] },
    review_findings: [{ page: "docs/a.mdx", type: "scope", text: `reviewer says ${extra}` }],
    payload: { diff: `source diff ${extra}` },
  },
  reps: [{ rep: 1, overall: 0.42, grade: failGrade, diffPatch: `bot diff ${extra}` }],
});

test("proposer prompt includes train failures, findings, diffs, files, taxonomy; only failing checks", () => {
  const p = buildProposerPrompt({
    evidence: [mkEvidence("train", "train-case-1", "TRAINTEXT")],
    files: { "scripts/sync-from-base-std/llm/prompts.mjs": "export const X = 1;" },
    surface: "prompts",
    history: [{ round: 1, root_cause: "earlier idea", decision: "reverted" }],
  });
  for (const s of ["train-case-1", "scope.forbidden", "touched a forbidden page", "unrelated edit to the intro", "reviewer says TRAINTEXT",
    "source diff TRAINTEXT", "bot diff TRAINTEXT", "export const X = 1;", TAXONOMY_TEXT.split("\n")[0], "earlier idea -> reverted", "Owner decisions"]) {
    assert.ok(p.includes(s), `missing: ${s}`);
  }
  assert.ok(!p.includes("all grounded"), "passing checks are not shown");
  assert.ok(!p.includes("parse error"), "grading errors (pass:null) are not failures");
});

test("proposer and reflection prompts never contain test-case content", () => {
  const evidence = [mkEvidence("train", "train-case-1", "t"), mkEvidence("test", `test-case-${SENTINEL}`, SENTINEL)];
  const args = { evidence, files: { "f.json": "{}" }, surface: "route-table", history: [] };
  for (const prompt of [buildProposerPrompt(args), buildReflectionPrompt({ evidence, history: [] })]) {
    assert.ok(!prompt.includes(SENTINEL));
    assert.ok(!prompt.includes("test-case-"));
    assert.ok(prompt.includes("train-case-1"));
  }
});

test("long diffs are capped", () => {
  const ev = mkEvidence("train", "c", "x");
  ev.reps[0].diffPatch = "d".repeat(50000);
  const p = buildProposerPrompt({ evidence: [ev], files: {}, surface: "both", history: [] });
  assert.ok(p.length < 30000);
  assert.match(p, /truncated/);
});

test("parseProposal: plain, fenced, wrapped in prose, and garbage", () => {
  const obj = { rationale: "r", root_cause: "c", files: [] };
  assert.deepEqual(parseProposal(JSON.stringify(obj)), obj);
  assert.deepEqual(parseProposal("```json\n" + JSON.stringify(obj) + "\n```"), obj);
  assert.deepEqual(parseProposal("Here you go: " + JSON.stringify(obj) + " done"), obj);
  assert.throws(() => parseProposal("no json here"), /not valid JSON/);
});
