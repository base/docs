#!/usr/bin/env node
/**
 * Human calibration tool. See PLAN.md, "Lane B: graders", item 5.
 *
 *   node scripts/doc-evals/calibrate.mjs [--runs-dir <dir>] [--sample-size 20] [--seed <string>]
 *   node scripts/doc-evals/calibrate.mjs --score [--calibration-dir <dir>]
 *
 * Default mode samples ~20 judged pages across every `grade.json` under
 * `scripts/doc-evals/runs/**` and writes two files to
 * `scripts/doc-evals/calibration/`:
 *   - `labels.json`: one entry per sampled page, each of the six judge
 *     claims with the judge's own verdict tucked under `judge` (kept in the
 *     file for `--score` to compare against later, but never rendered in
 *     `labels.md`) and an empty `human: {pass: null, reason: ""}` for a
 *     person to fill in by hand.
 *   - `labels.md`: the same pages and claims, human-readable, with no
 *     judge verdict shown — so labeling stays blind.
 * `--score` reads an already human-labeled `labels.json`, computes
 * per-claim judge/human agreement, and prints whether the judge clears the
 * 80% bar PLAN.md sets before judge scores count toward hillclimb decisions.
 *
 * `scripts/doc-evals/calibration/` is gitignored (Lane A's `.gitignore`,
 * per PLAN.md item 5: "Commit only the tool, not labels") — this file
 * itself is the only thing this lane commits here.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CLAIMS } from "./graders/judge/prompt.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_RUNS_DIR = path.join(__dirname, "runs");
const DEFAULT_CALIBRATION_DIR = path.join(__dirname, "calibration");
const AGREEMENT_THRESHOLD = 0.8;

/** Tiny deterministic PRNG (mulberry32) so `--seed` reproduces the same sample. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Recursively find every `grade.json` under `runsDir` and flatten its
 * judge-layer checks into one entry per (case, rep, page).
 *
 * @param {string} runsDir
 * @returns {Promise<Array<{caseId: string, rep: number, page: string, pageRole: string|null, claims: Array}>>}
 */
export async function gatherGradedPages(runsDir) {
  const gradeFiles = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name === "grade.json") gradeFiles.push(full);
    }
  }
  await walk(runsDir);

  const pages = [];
  for (const file of gradeFiles) {
    const grade = JSON.parse(await fs.readFile(file, "utf8"));
    const byPage = new Map();
    for (const check of grade.checks || []) {
      if (check.layer !== "judge" || !check.page) continue;
      const claimId = check.id.replace(/^judge\./, "");
      if (!byPage.has(check.page)) byPage.set(check.page, []);
      byPage.get(check.page).push({ claimId, judgePass: check.pass, judgeReason: check.detail });
    }
    for (const [page, claims] of byPage) {
      pages.push({ caseId: grade.caseId, rep: grade.rep, page, claims });
    }
  }
  return pages;
}

/**
 * @param {Array} gradedPages   from `gatherGradedPages`
 * @param {{sampleSize?: number, seed?: string}=} opts
 * @returns {Array} label entries — see file header for shape
 */
export function sampleForCalibration(gradedPages, opts = {}) {
  const sampleSize = opts.sampleSize ?? 20;
  const rand = mulberry32(hashSeed(opts.seed ?? "doc-evals-calibration"));

  // Seeded Fisher-Yates over a copy, so the same seed + input always
  // produces the same sample regardless of the input's original order.
  const pool = [...gradedPages];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const claimText = new Map(CLAIMS.map((c) => [c.id, c.text]));
  return pool.slice(0, sampleSize).map((p) => ({
    id: `${p.caseId}/rep-${p.rep}/${p.page}`,
    caseId: p.caseId,
    rep: p.rep,
    page: p.page,
    claims: p.claims.map((c) => ({
      claimId: c.claimId,
      claimText: claimText.get(c.claimId) ?? "",
      judge: { pass: c.judgePass, reason: c.judgeReason },
      human: { pass: null, reason: "" },
    })),
  }));
}

/**
 * @param {Array} entries  `labels.json` contents (from `sampleForCalibration`
 *        or a human-edited copy of it)
 * @returns {string}
 */
export function renderLabelsMd(entries) {
  const lines = [
    "# Calibration labels",
    "",
    "For each page, read `page` and judge each claim yourself: true, false, or leave blank if unsure.",
    "Fill in `human.pass` (`true`/`false`) and a short `human.reason` for each claim directly in `labels.json`.",
    "The judge's own verdict is intentionally not shown here so your label stays independent.",
    "",
  ];
  for (const entry of entries) {
    lines.push(`## ${entry.id}`, "");
    for (const claim of entry.claims) {
      lines.push(`- **${claim.claimId}**: ${claim.claimText}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * @param {Array} entries  human-labeled `labels.json`
 * @returns {{perClaim: Record<string, {agree: number, total: number, rate: number|null}>, overallRate: number|null, clears80: boolean|null}}
 */
export function scoreLabels(entries) {
  const perClaim = new Map(CLAIMS.map((c) => [c.id, { agree: 0, total: 0 }]));
  let agree = 0;
  let total = 0;

  for (const entry of entries) {
    for (const claim of entry.claims || []) {
      if (claim.human?.pass !== true && claim.human?.pass !== false) continue; // unlabeled — skip
      const bucket = perClaim.get(claim.claimId);
      if (!bucket) continue;
      bucket.total++;
      total++;
      if (claim.human.pass === claim.judge.pass) {
        bucket.agree++;
        agree++;
      }
    }
  }

  const perClaimOut = {};
  for (const [id, { agree: a, total: t }] of perClaim) {
    perClaimOut[id] = { agree: a, total: t, rate: t === 0 ? null : a / t };
  }
  const overallRate = total === 0 ? null : agree / total;
  return { perClaim: perClaimOut, overallRate, clears80: overallRate === null ? null : overallRate >= AGREEMENT_THRESHOLD };
}

// -----------------------------------------------------------------------------
// CLI
// -----------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    score: false,
    runsDir: DEFAULT_RUNS_DIR,
    calibrationDir: DEFAULT_CALIBRATION_DIR,
    sampleSize: 20,
    seed: "doc-evals-calibration",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--score") args.score = true;
    else if (a === "--runs-dir") args.runsDir = argv[++i];
    else if (a === "--calibration-dir") args.calibrationDir = argv[++i];
    else if (a === "--sample-size") args.sampleSize = Number(argv[++i]);
    else if (a === "--seed") args.seed = argv[++i];
  }
  return args;
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);

  if (args.score) {
    const labelsPath = path.join(args.calibrationDir, "labels.json");
    const entries = JSON.parse(await fs.readFile(labelsPath, "utf8"));
    const { perClaim, overallRate, clears80 } = scoreLabels(entries);
    for (const [id, stats] of Object.entries(perClaim)) {
      console.log(`${id}: ${stats.total === 0 ? "no labels yet" : `${stats.agree}/${stats.total} (${(stats.rate * 100).toFixed(0)}%)`}`);
    }
    console.log(
      overallRate === null
        ? "no human labels yet — nothing to score"
        : `overall agreement: ${(overallRate * 100).toFixed(0)}% (${clears80 ? "clears" : "below"} the ${AGREEMENT_THRESHOLD * 100}% bar)`,
    );
    return 0;
  }

  const gradedPages = await gatherGradedPages(args.runsDir);
  if (gradedPages.length === 0) {
    console.error(`[calibrate] no grade.json files with judge checks found under ${args.runsDir}`);
    return 1;
  }
  const sample = sampleForCalibration(gradedPages, { sampleSize: args.sampleSize, seed: args.seed });

  await fs.mkdir(args.calibrationDir, { recursive: true });
  await fs.writeFile(path.join(args.calibrationDir, "labels.json"), JSON.stringify(sample, null, 2) + "\n", "utf8");
  await fs.writeFile(path.join(args.calibrationDir, "labels.md"), renderLabelsMd(sample), "utf8");
  console.log(`[calibrate] sampled ${sample.length} page(s) from ${gradedPages.length} into ${args.calibrationDir}`);
  return 0;
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().then((code) => process.exit(code ?? 0));
}
