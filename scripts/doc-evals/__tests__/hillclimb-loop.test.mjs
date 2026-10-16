import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { runHillclimb } from "../hillclimb/loop.mjs";
import { DEFAULT_PRICES } from "../hillclimb/budget.mjs";

const PROMPTS = "scripts/sync-from-base-std/llm/prompts.mjs";
const SENTINEL = "ZZ-TEST-SENTINEL-77c1";
// A fake prompts.mjs carries its own scores: "// SCORES train=0.5 test=0.5". The fake replay stamps
// them into meta.json and the fake grader turns them into one code check, so overall == the score.
const prompts = (train, test, tag = "") => `export const A = 1;\n// SCORES train=${train} test=${test} ${tag}\n`;

async function setup({ benchTokens = 0 } = {}) {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "hc-loop-"));
  const repoRoot = path.join(tmp, "repo");
  const sync = path.join(repoRoot, "scripts", "sync-from-base-std");
  await fs.mkdir(path.join(sync, "llm"), { recursive: true });
  await fs.mkdir(path.join(sync, "__tests__"), { recursive: true });
  await fs.mkdir(path.join(repoRoot, "docs"), { recursive: true });
  await fs.writeFile(path.join(repoRoot, PROMPTS), prompts(0.5, 0.5, "baseline"));
  await fs.writeFile(path.join(sync, "route-table.json"), '{"routes":[]}\n');
  const casesDir = path.join(tmp, "cases");
  await fs.mkdir(casesDir);
  const mkCase = (id, split) => ({
    id, split, heavy: false, legacy_layout: false, docs_base_commit: "x", reference: null,
    scope: { in: [], out: [], label_source: "review" },
    review_findings: [{ page: "docs/a.mdx", type: "scope", text: `finding ${id}` }],
    payload: { diff: split === "test" ? `diff with ${SENTINEL}` : "train diff" },
  });
  await fs.writeFile(path.join(casesDir, "t1.json"), JSON.stringify(mkCase("train-1", "train")));
  await fs.writeFile(path.join(casesDir, "s1.json"), JSON.stringify(mkCase(`test-1-${SENTINEL}`, "test")));

  const replays = [];
  const graded = [];
  const replay = async (caseDef, o) => {
    replays.push(`${caseDef.id}/rep-${o.rep}`);
    const text = await fs.readFile(path.join(o.candidateDir, "llm", "prompts.mjs"), "utf8");
    await fs.mkdir(o.outDir, { recursive: true });
    await fs.writeFile(path.join(o.outDir, "meta.json"), JSON.stringify({ caseId: caseDef.id, rep: o.rep, exitCode: 0, touched: [], scores: text.match(/SCORES.*/)[0] }));
    await fs.writeFile(path.join(o.outDir, "diff.patch"), `bot diff for ${caseDef.id}`);
    await fs.writeFile(path.join(o.outDir, "bench.jsonl"), benchTokens ? JSON.stringify({ model: "claude-sonnet-4-6", input_tokens: benchTokens, output_tokens: 0 }) + "\n" : "");
    return {};
  };
  let errorTimes = 0; // grade calls that should still report a grading error
  const grade = async (caseDef, repDir) => {
    const meta = JSON.parse(await fs.readFile(path.join(repDir, "meta.json"), "utf8"));
    graded.push(`${caseDef.id}/rep-${meta.rep}`);
    const score = Number(meta.scores.match(new RegExp(`${caseDef.split}=([0-9.]+)`))[1]);
    const checks = [{ id: "fake.code", layer: "code", page: null, pass: score >= 0.5, score, detail: "fake" }];
    if (meta.scores.includes("ERR") && errorTimes-- > 0) checks.push({ id: "pairwise.x", layer: "pairwise", page: null, pass: null, score: 0, detail: "parse error" });
    const g = { caseId: caseDef.id, rep: meta.rep, checks, summary: { cost: { inputTokens: 0, outputTokens: 0 } } };
    await fs.writeFile(path.join(repDir, "grade.json"), JSON.stringify(g));
    return g;
  };
  const prompts_ = [];
  const script = [];
  const llm = async (prompt) => {
    prompts_.push(prompt);
    const next = script.shift();
    if (!next) throw new Error("llm script exhausted");
    return { text: typeof next === "string" ? next : JSON.stringify(next), inputTokens: 1000, outputTokens: 1000 };
  };
  const proposal = (train, test, cause, tag = "") => ({ rationale: `why ${cause}`, root_cause: cause, files: [{ path: PROMPTS, content: prompts(train, test, tag) }] });
  const deps = {
    replay, grade, llm,
    runSyncTests: async () => ({ exitCode: 0, failing: [], tail: "" }),
    checkExports: async () => ({ ok: true, detail: "" }),
  };
  const opts = (extra = {}) => ({
    runDir: path.join(tmp, "runs", "hillclimb-test"), repoRoot, syncDir: sync, casesDir,
    rounds: 3, reps: 1, maxUsd: 100, surface: "both", noJudge: true, judgeCalibrated: false, baselineRun: null,
    trainIds: null, testIds: null, concurrency: 1, prices: DEFAULT_PRICES, proposerModel: "claude-opus-4-6", judgeModel: "claude-opus-4-6",
    ...extra,
  });
  return { tmp, repoRoot, sync, deps, opts, script, proposal, replays, graded, prompts: prompts_, setErrors: (n) => (errorTimes = n),
    cleanup: () => fs.rm(tmp, { recursive: true, force: true }) };
}

test("keep: both splits improve beyond noise; patch file + final candidate written; real repo untouched", async () => {
  const t = await setup();
  try {
    t.script.push(t.proposal(0.8, 0.6, "fix scope"));
    const { state, reportPath } = await runHillclimb(t.opts({ rounds: 1 }), t.deps);
    assert.equal(state.rounds[0].decision, "kept");
    assert.deepEqual(state.rounds[0].after, { train: 0.8, test: 0.6 });
    const dir = path.dirname(reportPath);
    assert.match(await fs.readFile(path.join(dir, "round-1.patch"), "utf8"), /\+\/\/ SCORES train=0.8/);
    assert.match(await fs.readFile(path.join(dir, "final-candidate", "sync-from-base-std", "llm", "prompts.mjs"), "utf8"), /train=0.8/);
    assert.match(await fs.readFile(path.join(t.repoRoot, PROMPTS), "utf8"), /baseline/);
    const report = await fs.readFile(reportPath, "utf8");
    assert.match(report, /\| 1 \| fix scope \|/);
    assert.match(report, /0\.500 → 0\.800/);
    assert.match(report, /code \+ pairwise/);
  } finally {
    await t.cleanup();
  }
});

test("overfit: train up, test flat -> reverted with 'possible overfit'; kept candidate not replaced", async () => {
  const t = await setup();
  try {
    t.script.push(t.proposal(0.9, 0.5, "narrow fix"));
    const { state } = await runHillclimb(t.opts({ rounds: 1 }), t.deps);
    assert.equal(state.rounds[0].decision, "reverted");
    assert.match(state.rounds[0].reason, /possible overfit/);
    assert.equal(state.rounds[0].patchFile, undefined);
  } finally {
    await t.cleanup();
  }
});

test("gradingErrors: re-graded once; persistent errors skip the round without keep or revert", async () => {
  const t = await setup();
  try {
    t.setErrors(100);
    t.script.push(t.proposal(0.9, 0.9, "would keep", "ERR"));
    t.script.push(t.proposal(0.5, 0.5, "noop"));
    const { state } = await runHillclimb(t.opts({ rounds: 1 }), t.deps);
    assert.equal(state.rounds[0].decision, "skipped");
    assert.match(state.rounds[0].reason, /grading/);
    assert.ok(t.graded.filter((g) => g === "train-1/rep-1").length >= 3, "baseline + candidate + one re-grade");
  } finally {
    await t.cleanup();
  }
});

test("gradingErrors: a transient error is fixed by the single re-grade and the round is decided", async () => {
  const t = await setup();
  try {
    t.setErrors(1);
    t.script.push(t.proposal(0.8, 0.7, "fix", "ERR"));
    const { state } = await runHillclimb(t.opts({ rounds: 1 }), t.deps);
    assert.equal(state.rounds[0].decision, "kept");
  } finally {
    await t.cleanup();
  }
});

test("skipped rounds do not count toward the two-non-keeps reflection trigger", async () => {
  const t = await setup();
  try {
    t.setErrors(100);
    t.script.push(t.proposal(0.9, 0.9, "a", "ERR"), t.proposal(0.9, 0.9, "b", "ERR"), t.proposal(0.9, 0.9, "c", "ERR"));
    const { state } = await runHillclimb(t.opts({ rounds: 3 }), t.deps);
    assert.deepEqual(state.rounds.map((r) => r.decision), ["skipped", "skipped", "skipped"]);
    assert.equal(state.reflection, null);
  } finally {
    await t.cleanup();
  }
});

test("reflection runs after 2 consecutive non-keeps and stops the loop", async () => {
  const t = await setup();
  try {
    t.script.push(t.proposal(0.5, 0.5, "idea 1"), t.proposal(0.4, 0.4, "idea 2"), "## Group A\nreflection text");
    const { state, reportPath } = await runHillclimb(t.opts({ rounds: 5 }), t.deps);
    assert.equal(state.rounds.length, 2);
    assert.deepEqual(state.rounds.map((r) => r.decision), ["reverted", "reverted"]);
    assert.match(state.reflection, /Group A/);
    assert.match(state.stopReason, /2 consecutive non-keeps/);
    assert.match(await fs.readFile(reportPath, "utf8"), /Reflection: remaining train failures/);
    assert.match(t.prompts.at(-1), /Group the remaining TRAIN failures/);
  } finally {
    await t.cleanup();
  }
});

test("a keep resets the non-keep counter (no reflection after revert, keep, revert)", async () => {
  const t = await setup();
  try {
    t.script.push(t.proposal(0.5, 0.5, "i1"), t.proposal(0.8, 0.7, "i2"), t.proposal(0.8, 0.7, "i3", "x"));
    const { state } = await runHillclimb(t.opts({ rounds: 3 }), t.deps);
    assert.deepEqual(state.rounds.map((r) => r.decision), ["reverted", "kept", "reverted"]);
    assert.equal(state.reflection, null);
    assert.match(state.stopReason, /completed 3 round/);
  } finally {
    await t.cleanup();
  }
});

test("invalid proposals (bad path, bad JSON reply) are rejected and count as non-keeps", async () => {
  const t = await setup();
  try {
    t.script.push({ rationale: "r", root_cause: "evil", files: [{ path: "scripts/sync-from-base-std/safety.mjs", content: "x" }] }, "not json at all", "reflection");
    const { state } = await runHillclimb(t.opts({ rounds: 5 }), t.deps);
    assert.deepEqual(state.rounds.map((r) => r.decision), ["rejected", "rejected"]);
    assert.match(state.rounds[0].errors.join(), /not allowed/);
    assert.equal(t.replays.filter((r) => r.startsWith("train-1")).length, 1, "nothing replayed for rejected patches (baseline only)");
    assert.ok(state.reflection);
  } finally {
    await t.cleanup();
  }
});

test("rejects a patch that breaks the sync's tests or exports, tolerating pre-existing failures", async () => {
  const t = await setup();
  try {
    let n = 0;
    t.deps.runSyncTests = async () => (n++ === 0 ? { exitCode: 1, failing: ["old"], tail: "" } : { exitCode: 1, failing: ["old", "new one"], tail: "" });
    t.script.push(t.proposal(0.9, 0.9, "breaks tests"));
    const { state } = await runHillclimb(t.opts({ rounds: 1 }), t.deps);
    assert.equal(state.rounds[0].decision, "rejected");
    assert.match(state.rounds[0].reason, /new test failure/);
    assert.match(state.notes.join(), /already failing/);

    const t2 = await setup();
    try {
      t2.deps.checkExports = async () => ({ ok: false, detail: "prompts.mjs lost export(s): f" });
      t2.script.push(t2.proposal(0.9, 0.9, "drops export"));
      const r2 = await runHillclimb(t2.opts({ rounds: 1 }), t2.deps);
      assert.match(r2.state.rounds[0].reason, /lost export/);
    } finally {
      await t2.cleanup();
    }
  } finally {
    await t.cleanup();
  }
});

test("proposer prompt is test-blind: no test-case id, finding, diff, or score reaches any LLM call", async () => {
  const t = await setup();
  try {
    t.script.push(t.proposal(0.5, 0.5, "i1"), t.proposal(0.5, 0.5, "i2"), "reflection");
    await runHillclimb(t.opts({ rounds: 5 }), t.deps);
    assert.equal(t.prompts.length, 3);
    for (const p of t.prompts) {
      assert.ok(!p.includes(SENTINEL));
      assert.ok(!p.includes("test-1-"));
      assert.ok(p.includes("train-1"));
    }
  } finally {
    await t.cleanup();
  }
});

test("budget: stops before a round that would likely exceed --max-usd, without calling the proposer", async () => {
  const t = await setup({ benchTokens: 1_000_000 }); // $3 of sync per rep, two reps (train+test) = $6 per evaluation
  try {
    const { state } = await runHillclimb(t.opts({ rounds: 3, maxUsd: 8 }), t.deps);
    assert.equal(state.rounds.length, 0);
    assert.match(state.stopReason, /^budget:/);
    assert.equal(t.prompts.length, 0);
    assert.ok(Math.abs(state.totalUsd - 6) < 1e-9);
  } finally {
    await t.cleanup();
  }
});

test("budget: enough for one round but not a second", async () => {
  const t = await setup({ benchTokens: 1_000_000 });
  try {
    t.script.push(t.proposal(0.8, 0.7, "fix"), t.proposal(0.9, 0.9, "second"));
    const { state } = await runHillclimb(t.opts({ rounds: 3, maxUsd: 18 }), t.deps);
    assert.equal(state.rounds.length, 1);
    assert.match(state.stopReason, /^budget:/);
    assert.ok(state.totalUsd <= 18);
  } finally {
    await t.cleanup();
  }
});

test("baseline reuse: existing rep dirs are graded in place and not replayed; missing cases are replayed", async () => {
  const t = await setup();
  try {
    const reuse = path.join(t.tmp, "old-baseline");
    const repDir = path.join(reuse, "train-1", "rep-1");
    await fs.mkdir(repDir, { recursive: true });
    await fs.writeFile(path.join(repDir, "meta.json"), JSON.stringify({ caseId: "train-1", rep: 1, exitCode: 0, touched: [], scores: "SCORES train=0.3 test=0.3" }));
    t.script.push(t.proposal(0.8, 0.7, "fix"));
    const { state } = await runHillclimb(t.opts({ rounds: 1, baselineRun: reuse }), t.deps);
    assert.equal(state.baseline.splitMeans.train, 0.3);
    assert.equal(state.baseline.splitMeans.test, 0.5);
    assert.deepEqual(t.replays.filter((r) => r.startsWith("train-1")), ["train-1/rep-1"], "only the candidate round replays the train case");
    assert.ok((await fs.stat(path.join(repDir, "grade.json"))).isFile());
  } finally {
    await t.cleanup();
  }
});

test("noise from reps: a keep needs trainΔ above the baseline's rep spread", async () => {
  const t = await setup();
  try {
    // Baseline reps score differently via the reused dir: train 0.4 and 0.6 -> sd 0.141 -> noise 0.141.
    const reuse = path.join(t.tmp, "old-baseline");
    for (const [rep, s] of [[1, 0.4], [2, 0.6]]) {
      const d = path.join(reuse, "train-1", `rep-${rep}`);
      await fs.mkdir(d, { recursive: true });
      await fs.writeFile(path.join(d, "meta.json"), JSON.stringify({ caseId: "train-1", rep, exitCode: 0, touched: [], scores: `SCORES train=${s} test=${s}` }));
    }
    t.script.push(t.proposal(0.6, 0.6, "small gain"));
    const { state } = await runHillclimb(t.opts({ rounds: 1, reps: 2, baselineRun: reuse }), t.deps);
    assert.ok(Math.abs(state.baseline.noise - Math.sqrt(0.02)) < 1e-9);
    assert.equal(state.rounds[0].decision, "reverted"); // +0.1 train < 0.141 noise
    assert.doesNotMatch(state.rounds[0].reason, /overfit/);
  } finally {
    await t.cleanup();
  }
});
