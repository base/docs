#!/usr/bin/env node
/**
 * IA approval gates for base/docs.
 *
 * Publishes one check run per gate on a pull request's head SHA, enforcing the approval
 * rules in "Base Docs CI Approval Gates". Gate definitions live in
 * .github/ia-governance.json.
 *
 * SECURITY MODEL
 * This script runs from the *default branch* under pull_request_target. Its own source and
 * .github/ia-governance.json are therefore always the trusted copies -- a pull request
 * cannot add itself to governanceOwners or weaken a threshold for its own evaluation.
 * Pull request content (docs/docs.json at the head SHA) is read as data and JSON.parsed;
 * it is never executed, and it never reaches a shell.
 *
 * Usage:
 *   node .github/scripts/check-ia-approvals.mjs --pr 1234
 *   node .github/scripts/check-ia-approvals.mjs --sweep
 *   node .github/scripts/check-ia-approvals.mjs --pr 1234 --dry-run   # compute, never publish
 *
 * Env: GITHUB_TOKEN (required), GITHUB_REPOSITORY (required), GITHUB_STEP_SUMMARY (optional)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { GitHub } from "./lib/gh.mjs";
import { matchesAnyGlob } from "./lib/glob.mjs";
import { summarizeApprovals, hasWriteAccess, evaluateRequirement } from "./lib/approvals.mjs";
import {
  parseNavConfig,
  pageRefsForTab,
  topLevelGroupNames,
  added,
  setsDiffer,
} from "./lib/docs-nav.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");
const CONFIG_PATH = path.join(REPO_ROOT, ".github", "ia-governance.json");

/** Cap on how many open PRs one sweep will look at, to bound API spend. */
const SWEEP_LIMIT = 50;
/** Re-publish a verdict before GitHub's 7-day required-check expiry retires it. */
const REPUBLISH_AFTER_DAYS = 5;

const log = (...args) => console.log(...args);

// ---------------------------------------------------------------------------
// Gate activation
// ---------------------------------------------------------------------------

/** Paths added by this PR, including renames whose destination is a new location. */
function addedPaths(files) {
  return files
    .filter((f) => f.status === "added" || f.status === "copied" || f.status === "renamed")
    .map((f) => f.filename);
}

function touchedPaths(files) {
  // Every status counts -- the guideline gate covers add, modify, rename and delete.
  return files.flatMap((f) => (f.previous_filename ? [f.filename, f.previous_filename] : [f.filename]));
}

/**
 * Load docs.json at both ends of the PR.
 *
 * Returns null when the PR does not touch docs.json at all, which means navigation cannot
 * have changed and the two nav-aware gates can skip the fetch entirely.
 */
async function loadNavPair(gh, pr, files, navConfigPath) {
  if (!touchedPaths(files).includes(navConfigPath)) return null;

  const [base, head] = await Promise.all([
    gh.getFileAtRef(navConfigPath, pr.base.sha),
    gh.getFileAtRef(navConfigPath, pr.head.sha),
  ]);

  return {
    base: base.missing ? null : parseNavConfig(base.text),
    head: head.missing ? null : parseNavConfig(head.text),
    headDeleted: head.missing,
  };
}

function activateGetStarted(gate, files, nav) {
  const reasons = [];

  const newPages = addedPaths(files).filter((p) => matchesAnyGlob(p, gate.addedPathGlobs));
  for (const p of newPages) reasons.push(`adds page file ${p}`);

  if (nav) {
    if (nav.headDeleted) {
      reasons.push("deletes docs/docs.json");
    } else if (nav.base) {
      const newRefs = added(pageRefsForTab(nav.base, gate.navTab), pageRefsForTab(nav.head, gate.navTab));
      for (const ref of newRefs) reasons.push(`adds "${ref}" to the ${gate.navTab} tab`);
    }
  }

  return reasons;
}

function activateSolutionGroups(gate, nav) {
  if (!nav) return [];
  if (nav.headDeleted) return ["deletes docs/docs.json"];
  if (!nav.base) return [`adds docs/docs.json, defining the ${gate.navTab} tab`];

  const before = topLevelGroupNames(nav.base, gate.navTab);
  const after = topLevelGroupNames(nav.head, gate.navTab);
  if (!setsDiffer(before, after)) return [];

  const reasons = [];
  for (const g of added(before, after)) reasons.push(`adds solution group "${g}"`);
  for (const g of added(after, before)) reasons.push(`removes solution group "${g}"`);
  return reasons;
}

function activateByPaths(gate, files) {
  return touchedPaths(files)
    .filter((p) => matchesAnyGlob(p, gate.touchedPathGlobs))
    .map((p) => `changes ${p}`);
}

// ---------------------------------------------------------------------------
// Approver classification
// ---------------------------------------------------------------------------

/**
 * Split approvers into governance owners and writers.
 *
 * Owner matching is by case-insensitive login against the config list; GitHub logins are
 * case-insensitive, and a renamed owner handle fails closed (the gate stays red) rather
 * than silently granting access to someone else.
 *
 * Writer status comes from the live collaborator-permission API, so it tracks the spec's
 * definition ("individuals with write access") with no list to maintain. A lookup that
 * cannot be completed throws -- "could not verify" must never read as "not a writer".
 */
async function classifyApprovers(gh, approvers, ownerLogins, cache) {
  const ownerSet = new Set(ownerLogins.map((l) => l.toLowerCase()));
  const ownerIds = new Set();
  const writerIds = new Set();
  const notes = [];

  for (const approver of approvers) {
    if (ownerSet.has(approver.login.toLowerCase())) ownerIds.add(approver.id);

    if (!cache.has(approver.login)) {
      // Throws on 5xx / network failure, which fails the whole gate closed.
      cache.set(approver.login, await gh.getCollaboratorPermission(approver.login));
    }
    const payload = cache.get(approver.login);

    if (payload === null) {
      notes.push({ login: approver.login, reason: "not a collaborator on this repository" });
      continue;
    }
    if (hasWriteAccess(payload)) {
      writerIds.add(approver.id);
    } else {
      const role = payload?.role_name ?? payload?.permission ?? "unknown";
      notes.push({ login: approver.login, reason: `role "${role}" does not include write access` });
    }
  }

  return { ownerIds, writerIds, notes };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function renderSummary({ gateId, gate, reasons, requirement, discarded, permissionNotes }) {
  const lines = [];

  if (reasons.length === 0) {
    lines.push("This pull request does not touch the surface this gate protects, so no approvals are required.");
    lines.push("");
    lines.push(`Gate \`${gateId}\`. Rules are documented in \`docs/ia-guidelines.md\`.`);
    return lines.join("\n");
  }

  lines.push(`**Why this gate is active**`);
  for (const r of reasons) lines.push(`- ${r}`);
  lines.push("");
  lines.push(`**Requirement** — ${gate.count} approval${gate.count === 1 ? "" : "s"} from ${
    gate.requires === "governanceOwners" ? "a Governance Owner" : "distinct Writers"
  }, on the current head SHA, excluding the pull request author.`);
  lines.push("");
  lines.push(requirement.summary);

  if (requirement.qualifying.length) {
    lines.push("");
    lines.push("**Counted**");
    for (const a of requirement.qualifying) lines.push(`- @${a.login}`);
  }

  const rejected = [...discarded, ...permissionNotes];
  if (rejected.length) {
    lines.push("");
    lines.push("**Not counted**");
    for (const d of rejected) lines.push(`- @${d.login} — ${d.reason}`);
  }

  if (!requirement.satisfied && gate.requires === "governanceOwners") {
    lines.push("");
    lines.push(`Governance Owners: ${(gate._owners ?? []).map((o) => `@${o}`).join(", ")}`);
  }
  if (!requirement.satisfied) {
    lines.push("");
    lines.push(
      "_Approvals are re-counted when the pull request is updated, and on a scheduled sweep roughly every 10 minutes after a review lands._"
    );
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Evaluate one pull request
// ---------------------------------------------------------------------------

async function evaluatePull(gh, config, prNumber, { stepSummary, dryRun = false } = {}) {
  // Re-read the pull request: the webhook payload snapshots head at event time, so a push
  // racing this run would otherwise have us count reviews for one SHA and publish against
  // another.
  const pr = await gh.getPull(prNumber);
  const headSha = pr.head?.sha;
  if (typeof headSha !== "string" || headSha.length < 7) {
    throw new Error(`PR #${prNumber} has no usable head SHA`);
  }

  log(`\n#${prNumber} "${pr.title}" — head ${headSha.slice(0, 7)}, base ${pr.base.ref}`);

  const files = await gh.listPullFiles(prNumber);
  const nav = await loadNavPair(gh, pr, files, config.navConfigPath);

  const gateEntries = Object.entries(config.gates);
  const activation = new Map();
  for (const [gateId, gate] of gateEntries) {
    let reasons;
    switch (gateId) {
      case "get-started":
        reasons = activateGetStarted(gate, files, nav);
        break;
      case "build-on-base-solutions":
        reasons = activateSolutionGroups(gate, nav);
        break;
      default:
        reasons = activateByPaths(gate, files);
    }
    activation.set(gateId, reasons);
  }

  const anyActive = [...activation.values()].some((r) => r.length > 0);

  // Only pay for reviews and permission lookups when at least one gate is active.
  let approvers = [];
  let discarded = [];
  let ownerIds = new Set();
  let writerIds = new Set();
  let permissionNotes = [];

  if (anyActive) {
    const reviews = await gh.listReviews(prNumber);
    ({ approvers, discarded } = summarizeApprovals(reviews, {
      headSha,
      authorId: pr.user?.id,
    }));
    const cache = new Map();
    ({ ownerIds, writerIds, notes: permissionNotes } = await classifyApprovers(
      gh,
      approvers,
      config.governanceOwners,
      cache
    ));
  }

  const results = [];

  for (const [gateId, gate] of gateEntries) {
    const reasons = activation.get(gateId);
    const active = reasons.length > 0;

    const requirement = active
      ? evaluateRequirement({
          approvers,
          requires: gate.requires,
          count: gate.count,
          writerIds,
          ownerIds,
        })
      : { satisfied: true, qualifying: [], summary: "Not applicable." };

    const conclusion = !active ? "neutral" : requirement.satisfied ? "success" : "failure";
    const title = !active
      ? "No protected surface touched"
      : requirement.satisfied
        ? `Approved — ${requirement.qualifying.length}/${gate.count}`
        : `Needs ${gate.count - requirement.qualifying.length} more approval${
            gate.count - requirement.qualifying.length === 1 ? "" : "s"
          }`;

    const payload = {
      name: gate.checkName,
      head_sha: headSha,
      status: "completed",
      conclusion,
      completed_at: new Date().toISOString(),
      output: {
        title,
        summary: renderSummary({
          gateId,
          gate: { ...gate, _owners: config.governanceOwners },
          reasons,
          requirement,
          discarded,
          permissionNotes,
        }),
      },
    };

    if (dryRun) {
      log(`\n  [dry run] ${gate.checkName}: ${conclusion} — ${title}`);
      log(payload.output.summary.split("\n").map((l) => `      ${l}`).join("\n"));
    } else {
      await gh.createCheckRun(payload);
      log(`  ${gate.checkName}: ${conclusion} — ${title}`);
    }
    results.push({ gateId, checkName: gate.checkName, conclusion, title, reasons });
  }

  if (stepSummary) {
    const rows = results
      .map((r) => `| ${r.checkName} | ${r.conclusion} | ${r.title} |`)
      .join("\n");
    fs.appendFileSync(
      stepSummary,
      `\n### IA gates — #${prNumber} @ ${headSha.slice(0, 7)}\n\n` +
        `| Gate | Result | Detail |\n| --- | --- | --- |\n${rows}\n`
    );
  }

  return results;
}

// ---------------------------------------------------------------------------
// Sweep
// ---------------------------------------------------------------------------

/**
 * Decide whether a sweep should spend API calls re-evaluating a pull request.
 *
 * Re-evaluate when a gate verdict is missing (never ran, or the head moved), when one is
 * failing (an approval may have landed since), or when the newest verdict is old enough to
 * be approaching GitHub's 7-day required-check expiry.
 */
export function sweepNeedsEvaluation(checkRuns, expectedNames, now = Date.now()) {
  const byName = new Map(checkRuns.map((c) => [c.name, c]));

  for (const name of expectedNames) {
    const run = byName.get(name);
    if (!run) return "verdict missing for the current head SHA";
    if (run.conclusion === "failure") return "a gate is failing; approvals may have landed";
    const stamp = Date.parse(run.completed_at ?? run.started_at ?? "");
    if (!stamp) return "verdict has no usable timestamp";
    if (now - stamp > REPUBLISH_AFTER_DAYS * 86_400_000) return "verdict is approaching the 7-day expiry";
  }
  return null;
}

async function sweep(gh, config, { stepSummary, dryRun = false } = {}) {
  const expectedNames = Object.values(config.gates).map((g) => g.checkName);
  const open = (await gh.listOpenPulls()).slice(0, SWEEP_LIMIT);
  log(`Sweep: ${open.length} open pull request(s) under review (cap ${SWEEP_LIMIT}).`);

  let evaluated = 0;
  let skipped = 0;

  for (const pr of open) {
    if (pr.draft) {
      skipped++;
      continue;
    }
    let reason;
    try {
      const runs = await gh.listCheckRunsForRef(pr.head.sha);
      reason = sweepNeedsEvaluation(runs, expectedNames);
    } catch (err) {
      // Could not read current state -- re-evaluate rather than assume it is fine.
      reason = `could not read existing check runs (${err.message})`;
    }

    if (!reason) {
      skipped++;
      continue;
    }

    log(`#${pr.number}: ${reason}`);
    try {
      await evaluatePull(gh, config, pr.number, { stepSummary, dryRun });
      evaluated++;
    } catch (err) {
      // One bad PR must not abort the sweep for the rest.
      console.error(`::warning::Sweep could not evaluate #${pr.number}: ${err.message}`);
    }
  }

  log(`Sweep done: ${evaluated} evaluated, ${skipped} already current.`);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function loadConfig(configPath = CONFIG_PATH) {
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  if (!Array.isArray(config.governanceOwners) || config.governanceOwners.length === 0) {
    throw new Error("ia-governance.json must list at least one governanceOwners entry");
  }
  if (!config.gates || typeof config.gates !== "object") {
    throw new Error("ia-governance.json must define a gates object");
  }
  for (const [id, gate] of Object.entries(config.gates)) {
    if (typeof gate.checkName !== "string" || !gate.checkName) {
      throw new Error(`gate "${id}" is missing checkName`);
    }
    if (gate.requires !== "writers" && gate.requires !== "governanceOwners") {
      throw new Error(`gate "${id}" has invalid requires "${gate.requires}"`);
    }
    if (!Number.isInteger(gate.count) || gate.count < 1) {
      throw new Error(`gate "${id}" has invalid count "${gate.count}"`);
    }
  }
  if (typeof config.navConfigPath !== "string") {
    throw new Error("ia-governance.json must set navConfigPath");
  }
  return config;
}

function parseArgs(argv) {
  const out = { sweep: false, pr: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--sweep") out.sweep = true;
    else if (argv[i] === "--dry-run") out.dryRun = true;
    else if (argv[i] === "--pr") out.pr = Number(argv[++i]);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  const stepSummary = process.env.GITHUB_STEP_SUMMARY || null;

  if (!token) throw new Error("GITHUB_TOKEN is required");
  if (!repo) throw new Error("GITHUB_REPOSITORY is required");

  const config = loadConfig();
  const gh = new GitHub({ token, repo, log });

  if (args.dryRun) log("Dry run: verdicts are computed and printed, never published.\n");

  if (args.sweep) {
    await sweep(gh, config, { stepSummary, dryRun: args.dryRun });
  } else if (Number.isInteger(args.pr) && args.pr > 0) {
    await evaluatePull(gh, config, args.pr, { stepSummary, dryRun: args.dryRun });
  } else {
    throw new Error("pass --pr <number> or --sweep");
  }

  log(`\nGitHub API requests used: ${gh.requestCount}`);
}

// Exported for tests; only run when invoked directly.
export { evaluatePull, activateGetStarted, activateSolutionGroups, activateByPaths, classifyApprovers };

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    // Fail closed and loudly: an unhandled error must never look like a passing gate.
    console.error(`::error::IA gate evaluation failed: ${err.message}`);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  });
}
