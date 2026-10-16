/**
 * The hillclimb loop: baseline -> (propose -> patch scratch copy -> verify ->
 * evaluate -> keep/revert)* -> reflection after two consecutive non-keeps.
 *
 * All side effects on the outside world (replay, grading, LLM calls, the sync's
 * unit tests, the exports check) come in through `deps`, so tests drive the
 * whole loop offline. The loop never commits anything and never writes to the
 * real `scripts/sync-from-base-std/`; every candidate lives under `runDir`.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { computeNoise, decideRound } from "./decision.mjs";
import { projectRoundUsd, tokensUsd, wouldExceedBudget, PROPOSER_OUTPUT_TOKENS_ESTIMATE } from "./budget.mjs";
import { collectTrainEvidence, evaluate, loadCaseSets } from "./evaluate.mjs";
import { allowedPathsFor, applyFiles, createScratchTree, makePatch, testsAcceptable, validateProposal } from "./patch.mjs";
import { PROPOSER_SYSTEM, buildProposerPrompt, buildReflectionPrompt, parseProposal } from "./proposer.mjs";
import { renderReport } from "./report.mjs";

const SYNC_REL = "scripts/sync-from-base-std";
const PROMPTS_REL = `${SYNC_REL}/llm/prompts.mjs`;

/**
 * @param {object} opts  see run.mjs for the CLI mapping
 * @param {object} deps  {replay, grade, llm, runSyncTests, checkExports, log?}
 * @returns {Promise<{state: object, reportPath: string}>}
 */
export async function runHillclimb(opts, deps) {
  const log = deps.log || (() => {});
  const runDir = opts.runDir;
  await fs.mkdir(runDir, { recursive: true });
  const sets = await loadCaseSets({ casesDir: opts.casesDir, trainIds: opts.trainIds, testIds: opts.testIds });
  if (sets.train.length === 0 || sets.test.length === 0) throw new Error("need at least one train and one test case");

  const useJudge = !opts.noJudge && !!opts.judgeCalibrated;
  const state = {
    runId: path.basename(runDir),
    config: {
      rounds: opts.rounds,
      reps: opts.reps,
      maxUsd: opts.maxUsd,
      surface: opts.surface,
      trainIds: sets.train.map((c) => c.id),
      testIds: sets.test.map((c) => c.id),
      baselineRun: opts.baselineRun || null,
      judgeNote: opts.noJudge
        ? "code + pairwise (judge disabled with --no-judge)"
        : useJudge
          ? "code + judge + pairwise (judge calibrated: labels.json clears 80%)"
          : "code + pairwise only. The judge still runs so the proposer sees its reasons, but its scores are excluded from decisions because calibration/labels.json is missing or below 80% agreement",
    },
    baseline: null,
    rounds: [],
    reflection: null,
    stopReason: "in progress",
    totalUsd: 0,
    notes: [],
    finalCandidate: null,
  };
  if (opts.reps < 2) state.notes.push("WARNING: --reps 1 gives noise = 0 (no spread to measure); a keep then only needs trainΔ > 0 and testΔ > 0.");

  const reportPath = path.join(runDir, "report.md");
  const flush = () => fs.writeFile(reportPath, renderReport(state), "utf8");
  const evalOpts = (extra) => ({
    reps: opts.reps,
    concurrency: opts.concurrency,
    noJudge: opts.noJudge,
    useJudge,
    judgeModel: opts.judgeModel,
    prices: opts.prices,
    sets,
    deps: { replay: deps.replay, grade: deps.grade },
    ...extra,
  });

  // Round 0 = a scratch copy of the current sync code; every later candidate is
  // a copy of the latest kept one.
  const root0 = path.join(runDir, "candidates", "round-0");
  const sync0 = await createScratchTree({ scratchRoot: root0, fromSyncDir: opts.syncDir, repoRoot: opts.repoRoot });
  const base = await deps.runSyncTests(root0);
  if (base.exitCode === null || (base.exitCode !== 0 && base.failing.length === 0)) {
    throw new Error(`the sync's unit tests cannot run against a scratch copy: ${base.tail.slice(-300)}`);
  }
  const baselineFailing = base.failing;
  if (baselineFailing.length) state.notes.push(`Sync unit tests already failing before any patch (tolerated, patches must add none): ${baselineFailing.join("; ")}`);

  log(`[hillclimb] baseline: ${sets.train.length} train + ${sets.test.length} test case(s) x ${opts.reps} rep(s)`);
  const b = await evaluate(evalOpts({ outDir: path.join(runDir, "baseline"), reuseDir: opts.baselineRun, candidateDir: sync0 }));
  const { noise, bySplit } = computeNoise(b.perCase);
  state.baseline = { splitMeans: b.splitMeans, noise, noiseBySplit: bySplit, spentUsd: b.spentUsd, fullUsd: b.fullUsd };
  state.totalUsd += b.spentUsd;
  if (b.gradingErrors + b.replayErrors > 0) {
    state.stopReason = "aborted: baseline has grading/replay errors after one re-grade";
    state.notes.push(...b.errors, `${b.gradingErrors} unresolved grading error(s) in the baseline`);
    await flush();
    return { state, reportPath };
  }

  let cur = { eval: b, means: b.splitMeans, root: root0, syncDir: sync0 };
  let lastEvalUsd = b.fullUsd;
  let lastProposerUsd = null;
  let nonKeeps = 0;
  const history = [];
  await flush();

  for (let round = 1; round <= opts.rounds; round++) {
    const evidence = await collectTrainEvidence(cur.eval);
    const files = {};
    for (const p of allowedPathsFor(opts.surface)) files[p] = await fs.readFile(path.join(cur.root, p), "utf8");
    const prompt = buildProposerPrompt({ evidence, files, surface: opts.surface, history });

    const estProposer = tokensUsd(opts.proposerModel, (prompt.length + PROPOSER_SYSTEM.length) / 4, PROPOSER_OUTPUT_TOKENS_ESTIMATE, opts.prices);
    const projected = projectRoundUsd({ evalUsd: lastEvalUsd, proposerUsd: lastProposerUsd ?? estProposer });
    if (wouldExceedBudget({ spentUsd: state.totalUsd, projectedUsd: projected, maxUsd: opts.maxUsd })) {
      state.stopReason = `budget: round ${round} projected $${projected.toFixed(2)} on top of $${state.totalUsd.toFixed(2)} spent would exceed --max-usd ${opts.maxUsd}`;
      break;
    }

    const rec = { round, before: cur.means, after: null, spentUsd: 0, files: [], errors: [] };
    state.rounds.push(rec);
    log(`[hillclimb] round ${round}: asking ${opts.proposerModel} for a patch`);
    let reply;
    try {
      reply = await deps.llm(prompt, { system: PROPOSER_SYSTEM, model: opts.proposerModel, maxTokens: 32000 });
    } catch (err) {
      Object.assign(rec, { decision: "error", reason: `proposer call failed: ${String(err.message || err).slice(0, 200)}` });
      state.stopReason = "stopped: proposer call failed";
      break;
    }
    lastProposerUsd = tokensUsd(opts.proposerModel, reply.inputTokens, reply.outputTokens, opts.prices);
    rec.spentUsd += lastProposerUsd;
    state.totalUsd += lastProposerUsd;

    // Parse, validate, apply to a scratch copy and verify. Returns {fail} or the candidate.
    const prepare = async () => {
      let proposal;
      try {
        proposal = parseProposal(reply.text);
      } catch (err) {
        return { fail: err.message };
      }
      rec.root_cause = typeof proposal?.root_cause === "string" ? proposal.root_cause : "";
      rec.rationale = typeof proposal?.rationale === "string" ? proposal.rationale : "";
      const v = validateProposal(proposal, { surface: opts.surface, currentFiles: files });
      if (!v.ok) return { fail: "invalid proposal", errors: v.errors };
      rec.files = v.files.map((f) => f.path);
      const roundRoot = path.join(runDir, "candidates", `round-${round}`);
      const roundSync = await createScratchTree({ scratchRoot: roundRoot, fromSyncDir: cur.syncDir, repoRoot: opts.repoRoot });
      await applyFiles(roundRoot, v.files);
      if (rec.files.includes(PROMPTS_REL)) {
        const ex = await deps.checkExports(path.join(cur.root, PROMPTS_REL), path.join(roundRoot, PROMPTS_REL));
        if (!ex.ok) return { fail: `rejected: ${ex.detail}` };
      }
      const t = testsAcceptable(baselineFailing, await deps.runSyncTests(roundRoot));
      if (!t.ok) return { fail: `rejected: ${t.detail}` };
      return { roundRoot, roundSync };
    };
    const prep = await prepare();
    if (prep.fail) {
      Object.assign(rec, { decision: "rejected", reason: prep.fail, errors: prep.errors || [] });
      history.push({ round, root_cause: rec.root_cause, decision: "rejected" });
      nonKeeps++;
      await flush();
      if (nonKeeps >= 2) break;
      continue;
    }
    const { roundRoot, roundSync } = prep;

    log(`[hillclimb] round ${round}: evaluating "${rec.root_cause}"`);
    const ev = await evaluate(evalOpts({ outDir: path.join(runDir, `round-${round}`), candidateDir: roundSync }));
    rec.spentUsd += ev.spentUsd;
    state.totalUsd += ev.spentUsd;
    lastEvalUsd = Math.max(lastEvalUsd, ev.fullUsd);
    rec.after = ev.splitMeans;
    rec.errors = ev.errors;
    const d = decideRound({ before: cur.means, after: ev.splitMeans, noise, gradingErrors: ev.gradingErrors + ev.replayErrors });
    rec.reason = d.reason;
    if (d.decision === "keep") {
      rec.decision = "kept";
      rec.patchFile = `round-${round}.patch`;
      await fs.writeFile(path.join(runDir, rec.patchFile), await makePatch({ origRoot: cur.root, newRoot: roundRoot, relPaths: rec.files }), "utf8");
      cur = { eval: ev, means: ev.splitMeans, root: roundRoot, syncDir: roundSync };
      nonKeeps = 0;
    } else if (d.decision === "revert") {
      rec.decision = "reverted";
      nonKeeps++;
    } else {
      rec.decision = "skipped";
    }
    history.push({ round, root_cause: rec.root_cause, decision: rec.decision });
    await flush();
    if (nonKeeps >= 2) break;
  }

  if (nonKeeps >= 2) {
    state.stopReason = "stopped after 2 consecutive non-keeps (reflection below)";
    try {
      const r = await deps.llm(buildReflectionPrompt({ evidence: await collectTrainEvidence(cur.eval), history }), {
        model: opts.proposerModel,
        maxTokens: 8000,
      });
      state.reflection = r.text;
      state.totalUsd += tokensUsd(opts.proposerModel, r.inputTokens, r.outputTokens, opts.prices);
    } catch (err) {
      state.reflection = `(reflection call failed: ${String(err.message || err).slice(0, 200)})`;
    }
  } else if (state.stopReason === "in progress") {
    state.stopReason = `completed ${state.rounds.length} round(s)`;
  }

  const finalDir = path.join(runDir, "final-candidate");
  await fs.rm(finalDir, { recursive: true, force: true });
  await fs.cp(cur.syncDir, path.join(finalDir, "sync-from-base-std"), { recursive: true });
  state.finalCandidate = path.join(path.basename(runDir), "final-candidate", "sync-from-base-std");
  await flush();
  return { state, reportPath };
}
