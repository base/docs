/** Markdown report for a hillclimb run (`runs/hillclimb-<ts>/report.md`). */

const f3 = (n) => (n === null || n === undefined ? "n/a" : Number(n).toFixed(3));
const usd = (n) => `$${Number(n || 0).toFixed(2)}`;
const cell = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
const pair = (b, a) => `${f3(b)} → ${f3(a)}`;

/**
 * @param {object} s run state
 * @param {object} s.config      {rounds, reps, maxUsd, surface, noJudge, judgeInDecision, judgeNote, trainIds, testIds, baselineRun}
 * @param {object} s.baseline    {splitMeans, noise, noiseBySplit, spentUsd, fullUsd}
 * @param {Array}  s.rounds
 * @param {string} s.stopReason
 * @param {string|null} s.reflection
 * @param {number} s.totalUsd
 * @param {string[]} s.notes
 */
export function renderReport(s) {
  const c = s.config;
  const L = [`# Hillclimb report: ${s.runId}`, ""];
  L.push(`Status: **${s.stopReason}**. Total cost this run: **${usd(s.totalUsd)}** of ${usd(c.maxUsd)} cap.`, "");
  L.push("## Configuration", "");
  L.push(`- Surface: ${c.surface}; rounds: up to ${c.rounds}; reps: ${c.reps}`);
  L.push(`- Train cases: ${c.trainIds.join(", ")}`, `- Test cases: ${c.testIds.join(", ")}`);
  L.push(`- Baseline: ${c.baselineRun ? `reused ${c.baselineRun} (missing reps replayed)` : "replayed by this run"}`);
  L.push(`- Decision scores: ${c.judgeNote}`);
  L.push(
    "- Keep rule: trainΔ > noise AND testΔ > 0. Noise = max over splits of (mean over the split's cases of the sample stdev of that case's `overall` across reps), measured on the baseline.",
  );
  L.push("", "## Baseline", "");
  L.push(`- Train mean overall: ${f3(s.baseline.splitMeans.train)}; test mean overall: ${f3(s.baseline.splitMeans.test)}`);
  L.push(
    `- Noise: ${f3(s.baseline.noise)} (train ${f3(s.baseline.noiseBySplit.train)}, test ${f3(s.baseline.noiseBySplit.test)})`,
  );
  L.push(`- Baseline cost this run: ${usd(s.baseline.spentUsd)} (full evaluation cost ${usd(s.baseline.fullUsd)})`);
  for (const n of s.notes) L.push(`- ${n}`);

  L.push("", "## Rounds", "");
  if (s.rounds.length === 0) L.push("No rounds ran.");
  else {
    L.push("| Round | Root cause | Files | Train before → after | Test before → after | Noise | Decision | Cost |");
    L.push("|---|---|---|---|---|---|---|---|");
    for (const r of s.rounds) {
      L.push(
        `| ${r.round} | ${cell(r.root_cause || "(no valid proposal)")} | ${cell((r.files || []).map((p) => p.split("/").pop()).join(", ") || "-")} | ${
          r.after ? pair(r.before.train, r.after.train) : `${f3(r.before.train)} → -`
        } | ${r.after ? pair(r.before.test, r.after.test) : `${f3(r.before.test)} → -`} | ${f3(s.baseline.noise)} | ${cell(r.decision)} | ${usd(r.spentUsd)} |`,
      );
    }
    L.push("");
    for (const r of s.rounds) {
      L.push(`### Round ${r.round}: ${r.decision}`, "", `Reason: ${r.reason}`);
      if (r.rationale) L.push("", `Rationale: ${r.rationale}`);
      if (r.patchFile) L.push("", `Patch: \`${r.patchFile}\``);
      if (r.errors?.length) L.push("", ...r.errors.map((e) => `- ${e}`));
      L.push("");
    }
  }
  if (s.reflection) L.push("## Reflection: remaining train failures by root cause", "", s.reflection.trim(), "");
  L.push("## Output", "", `- Final candidate dir: ${s.finalCandidate ? `\`${s.finalCandidate}\`` : "(none)"}`);
  L.push("- No git commits were made and the real `scripts/sync-from-base-std/` was not modified.", "");
  return L.join("\n");
}
