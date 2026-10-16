import test from "node:test";
import assert from "node:assert/strict";

import { parseArgs } from "../hillclimb/run.mjs";

test("parseArgs: defaults match the documented CLI", () => {
  const a = parseArgs([]);
  assert.deepEqual(
    { rounds: a.rounds, reps: a.reps, maxUsd: a.maxUsd, surface: a.surface, noJudge: a.noJudge, concurrency: a.concurrency, trainIds: a.trainIds },
    { rounds: 5, reps: 2, maxUsd: 25, surface: "both", noJudge: false, concurrency: 3, trainIds: null },
  );
});

test("parseArgs: all flags", () => {
  const a = parseArgs(["--rounds", "1", "--reps", "1", "--max-usd", "8", "--surface", "prompts", "--no-judge",
    "--cases-train", "a,b", "--cases-test", "c", "--concurrency", "2", "--baseline-run", "x/y"]);
  assert.equal(a.rounds, 1);
  assert.equal(a.maxUsd, 8);
  assert.equal(a.surface, "prompts");
  assert.equal(a.noJudge, true);
  assert.deepEqual(a.trainIds, ["a", "b"]);
  assert.deepEqual(a.testIds, ["c"]);
  assert.ok(a.baselineRun.endsWith("x/y"));
});

test("parseArgs: rejects unknown flags, bad surface, non-positive numbers, missing values", () => {
  assert.throws(() => parseArgs(["--nope"]), /unknown argument/);
  assert.throws(() => parseArgs(["--surface", "docs"]), /--surface/);
  assert.throws(() => parseArgs(["--rounds", "0"]), /positive/);
  assert.throws(() => parseArgs(["--max-usd"]), /needs a value/);
});
