#!/usr/bin/env node
/**
 * Hillclimb CLI. See PLAN.md "Phase 2" and README.md "Hillclimb".
 *
 *   node scripts/doc-evals/hillclimb/run.mjs [--rounds 5] [--reps 2] [--max-usd 25]
 *     [--surface prompts|route-table|both] [--no-judge] [--baseline-run <run-dir>]
 *     [--cases-train id,id] [--cases-test id,id] [--concurrency 3]
 *
 * Default case sets are the train/test splits in `cases/`, minus heavy and
 * legacy-layout cases. Output: `runs/hillclimb-<ts>/` with report.md, one
 * .patch per kept round, and final-candidate/. Makes no git commits and never
 * touches the real `scripts/sync-from-base-std/`.
 *
 * The LLM client and the replay harness are imported lazily (inside the
 * default deps) so importing this module never needs `scripts/node_modules`.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadPrices } from "./budget.mjs";
import { runHillclimb } from "./loop.mjs";
import { checkExports, runSyncTests } from "./patch.mjs";
import { DEFAULT_JUDGE_MODEL } from "../graders/judge/run.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOC_EVALS = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(DOC_EVALS, "..", "..");
export const DEFAULT_PROPOSER_MODEL = "claude-opus-4-6";

const list = (v) => v.split(",").map((s) => s.trim()).filter(Boolean);

/** @returns {object} parsed CLI options */
export function parseArgs(argv) {
  const a = {
    rounds: 5, reps: 2, maxUsd: 25, surface: "both", noJudge: false, baselineRun: null,
    trainIds: null, testIds: null, concurrency: 3,
  };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = () => {
      if (i + 1 >= argv.length) throw new Error(`${k} needs a value`);
      return argv[++i];
    };
    if (k === "--rounds") a.rounds = Number(v());
    else if (k === "--reps") a.reps = Number(v());
    else if (k === "--max-usd") a.maxUsd = Number(v());
    else if (k === "--surface") a.surface = v();
    else if (k === "--no-judge") a.noJudge = true;
    else if (k === "--baseline-run") a.baselineRun = path.resolve(v());
    else if (k === "--cases-train") a.trainIds = list(v());
    else if (k === "--cases-test") a.testIds = list(v());
    else if (k === "--concurrency") a.concurrency = Number(v());
    else throw new Error(`unknown argument: ${k}`);
  }
  if (!["prompts", "route-table", "both"].includes(a.surface)) throw new Error("--surface must be prompts|route-table|both");
  for (const n of ["rounds", "reps", "maxUsd", "concurrency"]) {
    if (!Number.isFinite(a[n]) || a[n] <= 0) throw new Error(`--${n.replace("maxUsd", "max-usd")} must be a positive number`);
  }
  return a;
}

/** One strong-model call; token usage read from the client's bench log (falls back to chars/4). */
async function defaultLlm(prompt, { system, model, maxTokens }) {
  const client = await import("../../sync-from-base-std/llm/client.mjs");
  const r = await client.complete(prompt, "hillclimb", { system, model, maxTokens });
  const row = client.BENCH_LOG[client.BENCH_LOG.length - 1] || {};
  return {
    text: r.text,
    inputTokens: row.input_tokens ?? Math.ceil(((system || "").length + prompt.length) / 4),
    outputTokens: row.output_tokens ?? r.outputTokens ?? Math.ceil(r.text.length / 4),
  };
}

/** The judge counts in decisions only if calibration/labels.json exists and clears 80% agreement. */
async function judgeCalibrated() {
  try {
    const entries = JSON.parse(await fs.readFile(path.join(DOC_EVALS, "calibration", "labels.json"), "utf8"));
    const { scoreLabels } = await import("../calibrate.mjs");
    return scoreLabels(entries).clears80 === true;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const ts = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const runDir = path.join(DOC_EVALS, "runs", `hillclimb-${ts}`);
  const { replayCase } = await import("../replay/run.mjs");
  const { gradeRep } = await import("../graders/gradeRep.mjs");
  const opts = {
    ...args,
    runDir,
    repoRoot: REPO_ROOT,
    syncDir: path.join(REPO_ROOT, "scripts", "sync-from-base-std"),
    casesDir: path.join(DOC_EVALS, "cases"),
    prices: loadPrices(),
    proposerModel: process.env.HILLCLIMB_MODEL || DEFAULT_PROPOSER_MODEL,
    judgeModel: process.env.JUDGE_MODEL || DEFAULT_JUDGE_MODEL,
    judgeCalibrated: await judgeCalibrated(),
  };
  const deps = {
    replay: replayCase,
    grade: (caseDef, repDir, o) => gradeRep(caseDef, repDir, o),
    llm: defaultLlm,
    runSyncTests,
    checkExports,
    log: (m) => console.log(m),
  };
  const { state, reportPath } = await runHillclimb(opts, deps);
  console.log(`[hillclimb] ${state.stopReason}; cost $${state.totalUsd.toFixed(2)}; report: ${reportPath}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });
}
