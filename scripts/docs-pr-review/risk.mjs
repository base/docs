/**
 * Risk label for base/docs pull requests: the "review ladder" from
 * "Risk-based review for base/docs pull requests" (v4,
 * https://bdocs.cbhq.net/d/base-docs-pr-risk-review-proposal-v4).
 *
 * Deterministic: no model call. Input is the PR's file list (from the GitHub
 * API), docs.json at the PR's base and head, the trusted gate config from the
 * default branch, and whether this is the author's first merged PR.
 *
 * Ladder:
 *   - What the PR changes sets a starting level.
 *   - Size can only raise a level, never lower it.
 *   - Missing information or uncertainty sends the PR to a person (high).
 *   - The PR takes the highest level any rule gives it.
 *
 * Shadow mode: the level is shown in the summary comment and as one
 * `risk: <level>` label. Nothing is enforced: it never approves or blocks.
 *
 * Reasons name the rule and the file, never the matched value (an address,
 * a URL), so the label cannot echo sensitive-looking content.
 */

import { activateByPaths, activateGetStarted, activateSolutionGroups } from "../../.github/scripts/check-ia-approvals.mjs";
import { findTab, parseNavConfig, topLevelGroupNames } from "../../.github/scripts/lib/docs-nav.mjs";
import { matchesAnyGlob } from "../../.github/scripts/lib/glob.mjs";

export const LEVELS = ["low", "medium", "high", "critical"];
export const LEVEL_LABEL = { low: "Low", medium: "Medium", high: "High", critical: "Critical" };
export const LEVEL_MEANING = {
  low: "one AI review",
  medium: "three AI models review independently",
  high: "one human reviewer (the tab owner), with an AI pre-review",
  critical: "the existing approval gates stay in charge",
};

const GET_STARTED = { tab: "Get Started", prefix: "docs/get-started/" };
const BUILD_ON_BASE = { tab: "Build on Base", prefix: "docs/build-on-base/" };
const PRIMARY_TABS = [GET_STARTED, BUILD_ON_BASE];

const LEGAL_PAGES = new Set(["docs/terms-of-service.mdx", "docs/privacy-policy.mdx", "docs/cookie-policy.mdx"]);
const LOCKFILES = new Set(["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb", "bun.lock", "npm-shrinkwrap.json"]);
const CODE_EXT = /\.(?:[cm]?[jt]sx?|sol|py|go|rs|sh|ya?ml|toml)$/i;
const CONTENT_PAGE = /^docs\/.+\.mdx?$/i;

// Added-line signals. Each regex runs on lines a PR adds, never on context.
const CONTRACT_ADDRESS = /\b0x[0-9a-fA-F]{40}\b/;
const RPC_URL = /\b(?:https?|wss?):\/\/[^\s)"'`<>\]]*(?:rpc|mainnet\.base\.org|sepolia\.base\.org|preconf)/i;
const KEY_HANDLING = /\b(?:private[ _-]?keys?|PRIVATE_KEY|seed[ _-]?phrases?|mnemonic|secret[ _-]?keys?|keystore)\b/i;
const CHAIN_ID_OR_FEE = /\b(?:8453|84532)\b|chain[ _-]?id\b[^\n]{0,40}\d|\b\d+(?:\.\d+)?\s*g?wei\b|\b(?:base fee|priority fee|gas price|l1 fee|data fee)\b[^\n]{0,40}\d/i;

// Size thresholds from the proposal's "How big" table.
const SIZE = {
  lowMaxLines: 20,
  lowMaxFiles: 3,
  pageDeleteMedium: 20,
  getStartedEditHigh: 10,
  buildOnBaseEditHigh: 20,
  otherTabNavHigh: 3,
  otherTabPagesHigh: 3,
  redirectsRemovedHigh: 3,
  pagesRemovedHigh: 10,
  linesDeletedHigh: 500,
};

const SITE_WIDE_TOP = ["navbar", "theme", "integrations"];
const SITE_WIDE_NAV = ["anchors", "global"];

const rank = (level) => LEVELS.indexOf(level);
const lines = (f) => (f.additions || 0) + (f.deletions || 0);
const base = (p) => p.split("/").pop();
const inTab = (file, tab) => file.startsWith(tab.prefix);
const stable = (v) => JSON.stringify(v ?? null);

function addedLines(patch) {
  return (patch || "")
    .split("\n")
    .filter((l) => l.startsWith("+") && !l.startsWith("+++"))
    .map((l) => l.slice(1));
}

/** Every page ref in a tab, mapped to the chain of group names above it. */
function refPositions(config, tabName) {
  const tab = findTab(config, tabName);
  const out = new Map();
  const groups = new Set();
  if (!tab) return { refs: out, groups };
  const walk = (pages, trail, depth) => {
    if (!Array.isArray(pages) || depth > 12) return;
    for (const p of pages) {
      if (typeof p === "string") out.set(p, trail.join(" > "));
      else if (p && typeof p === "object") {
        const next = typeof p.group === "string" ? [...trail, p.group] : trail;
        if (typeof p.group === "string") groups.add(next.join(" > "));
        walk(p.pages, next, depth + 1);
      }
    }
  };
  for (const g of Array.isArray(tab.groups) ? tab.groups : []) {
    if (!g || typeof g !== "object") continue;
    const trail = typeof g.group === "string" ? [g.group] : [];
    if (trail.length) groups.add(trail[0]);
    walk(g.pages, trail, 1);
  }
  return { refs: out, groups };
}

const tabNames = (config) => (config?.navigation?.tabs || []).map((t) => t?.tab);
const tabShell = (config) =>
  (config?.navigation?.tabs || []).map((t) => {
    const { groups, pages, ...rest } = t || {};
    return rest;
  });
const redirectKeys = (config) =>
  new Set((Array.isArray(config?.redirects) ? config.redirects : []).map((r) => `${r?.source} -> ${r?.destination}`));

/**
 * @param {object} input
 * @param {Array<{filename,status,additions,deletions,patch,previous_filename}>} input.files
 * @param {number} [input.changedFiles]   pr.changed_files, to detect a truncated file list
 * @param {{base:string|null, head:string|null, baseMissing?:boolean, headMissing?:boolean, error?:string}|null} input.nav
 *        raw docs.json text at base and head; null when the PR does not touch it
 * @param {object} input.governance       .github/ia-governance.json from the default branch
 * @param {boolean|null} input.firstTimeAuthor  null when it could not be checked
 * @returns {{level:string, reasons:Array<{level:string, rule:string, text:string}>}}
 */
export function classifyRisk({ files, changedFiles, nav, governance, firstTimeAuthor }) {
  const reasons = [];
  const add = (level, rule, text) => reasons.push({ level, rule, text });
  const navPath = governance?.navConfigPath || "docs/docs.json";

  // ---------------------------------------------------------- missing information
  if (!governance?.gates) add("high", "unknown", "could not read the approval-gate config");
  if (Number.isInteger(changedFiles) && changedFiles > files.length) {
    add("high", "unknown", `the file list is incomplete (${files.length} of ${changedFiles} files)`);
  }
  for (const f of files) {
    if (f.patch === undefined && lines(f) > 0) add("high", "unknown", `no diff available for \`${f.filename}\``);
  }
  if (firstTimeAuthor === null) add("high", "unknown", "could not check whether this is the author's first merged PR");

  // docs.json at both ends.
  let navBase = null;
  let navHead = null;
  let navOk = !!nav && !nav.error;
  if (nav) {
    if (nav.error) add("high", "unknown", `could not read \`${navPath}\`: ${nav.error}`);
    try {
      navBase = nav.base == null ? null : parseNavConfig(nav.base);
      navHead = nav.head == null ? null : parseNavConfig(nav.head);
    } catch (err) {
      add("high", "unknown", `could not parse \`${navPath}\`: ${err.message}`);
      navOk = false;
    }
  }
  // Unreadable navigation must not look like an empty or brand-new docs.json to the gates.
  const navPair = navOk ? { base: navBase, head: navHead, headDeleted: !!nav.headMissing } : null;

  // ---------------------------------------------------------- critical: existing gates
  for (const [name, gate] of Object.entries(governance?.gates || {})) {
    let fired = [];
    try {
      if (name === "get-started") fired = activateGetStarted(gate, files, navPair);
      else if (name === "build-on-base-solutions") fired = navPair ? activateSolutionGroups(gate, navPair) : [];
      else if (gate.touchedPathGlobs) fired = activateByPaths(gate, files);
    } catch (err) {
      add("high", "unknown", `could not evaluate gate "${gate.checkName || name}": ${err.message}`);
    }
    if (fired.length) add("critical", "gate", `${gate.checkName || name} fires (${fired.slice(0, 3).join("; ")})`);
  }

  // ---------------------------------------------------------- docs.json
  if (nav && navBase && navHead) {
    for (const t of PRIMARY_TABS) {
      const before = findTab(navBase, t.tab);
      const after = findTab(navHead, t.tab);
      if (stable(before) === stable(after)) continue;
      const gBefore = topLevelGroupNames(navBase, t.tab);
      const gAfter = topLevelGroupNames(navHead, t.tab);
      const gone = [...gBefore].filter((g) => !gAfter.has(g));
      const fresh = [...gAfter].filter((g) => !gBefore.has(g));
      if (gone.length && fresh.length) add("critical", "section-rename", `renames a section in ${t.tab}`);
      add("high", "primary-nav", `changes navigation in ${t.tab}`);
    }

    const siteWide = [
      ...SITE_WIDE_TOP.filter((k) => stable(navBase[k]) !== stable(navHead[k])),
      ...SITE_WIDE_NAV.filter((k) => stable(navBase.navigation?.[k]) !== stable(navHead.navigation?.[k])).map((k) => `navigation.${k}`),
      ...(stable(tabNames(navBase)) !== stable(tabNames(navHead)) || stable(tabShell(navBase)) !== stable(tabShell(navHead)) ? ["tabs"] : []),
    ];
    if (siteWide.length) add("high", "site-settings", `changes site-wide settings in \`${navPath}\` (${siteWide.join(", ")})`);

    for (const name of tabNames(navHead).filter((n) => n && !PRIMARY_TABS.some((t) => t.tab === n))) {
      const b = refPositions(navBase, name);
      const a = refPositions(navHead, name);
      let removedOrMoved = 0;
      for (const [ref, trail] of b.refs) if (!a.refs.has(ref) || a.refs.get(ref) !== trail) removedOrMoved++;
      if (removedOrMoved >= SIZE.otherTabNavHigh) add("high", "nav-moves", `removes or moves ${removedOrMoved} navigation items in ${name}`);
      const groupsGone = [...b.groups].filter((g) => !a.groups.has(g));
      if (groupsGone.length) add("high", "group-removed", `removes or renames ${groupsGone.length} navigation group(s) in ${name}`);
    }

    const rBefore = redirectKeys(navBase);
    const rAfter = redirectKeys(navHead);
    const redirectsRemoved = [...rBefore].filter((r) => !rAfter.has(r)).length;
    if (redirectsRemoved >= SIZE.redirectsRemovedHigh) add("high", "redirects", `removes ${redirectsRemoved} redirects`);
  }
  if (files.some((f) => f.filename === navPath || f.previous_filename === navPath)) {
    add("medium", "docs-json", `changes \`${navPath}\``);
  }

  // ---------------------------------------------------------- per file
  const primaryEdits = { [GET_STARTED.tab]: 0, [BUILD_ON_BASE.tab]: 0 };
  let pagesRemovedOrRenamed = 0;
  let otherTabPagesRemovedOrRenamed = 0;
  let linesDeleted = 0;
  let totalLines = 0;
  let onlyNonDocs = true;

  for (const f of files) {
    const name = f.filename;
    const isPage = CONTENT_PAGE.test(name) || (f.previous_filename && CONTENT_PAGE.test(f.previous_filename));
    totalLines += lines(f);
    linesDeleted += f.deletions || 0;
    if (name.startsWith("docs/") || name.startsWith(".github/") || name.startsWith("scripts/") || name.startsWith("examples/") || base(name) === "package.json" || LOCKFILES.has(base(name))) {
      onlyNonDocs = false;
    }

    if (LEGAL_PAGES.has(name) || LEGAL_PAGES.has(f.previous_filename)) add("high", "legal", `changes the legal page \`${name}\``);
    if (matchesAnyGlob(name, [".github/workflows/**"])) add("high", "workflow", `changes the workflow \`${name}\``);
    if (base(name) === "package.json" || LOCKFILES.has(base(name))) add("high", "dependencies", `changes \`${name}\``);
    if (name.startsWith("scripts/") || name.startsWith("examples/") || (name.startsWith("docs/") && CODE_EXT.test(name))) {
      add("medium", "code", `changes code in \`${name}\``);
    }

    const plus = addedLines(f.patch);
    if (plus.some((l) => CONTRACT_ADDRESS.test(l))) add("high", "contract-address", `adds a contract address in \`${name}\``);
    if (plus.some((l) => RPC_URL.test(l))) add("high", "rpc-url", `adds an RPC URL in \`${name}\``);
    if (plus.some((l) => KEY_HANDLING.test(l))) add("high", "key-handling", `adds key-handling text in \`${name}\``);
    if (plus.some((l) => CHAIN_ID_OR_FEE.test(l))) add("medium", "chain-id-fee", `adds or changes a chain ID or fee number in \`${name}\``);

    if (!isPage) continue;
    const primary = PRIMARY_TABS.find((t) => inTab(name, t) || (f.previous_filename && inTab(f.previous_filename, t)));
    if (["added", "removed", "renamed", "copied"].includes(f.status)) {
      const verb = { added: "adds", copied: "adds", removed: "removes", renamed: "renames" }[f.status];
      add("medium", "pages-changed", `${verb} the page \`${name}\``);
    }
    if (f.status === "removed" || f.status === "renamed") {
      pagesRemovedOrRenamed++;
      if (!primary) otherTabPagesRemovedOrRenamed++;
    }
    if (primary && f.status !== "removed") {
      primaryEdits[primary.tab] += lines(f);
      add("medium", "primary-content", `edits content in ${primary.tab} (\`${name}\`)`);
    }
    if ((f.deletions || 0) >= SIZE.pageDeleteMedium) add("medium", "page-deletes", `deletes ${f.deletions} lines in \`${name}\``);
  }

  // ---------------------------------------------------------- size
  if (totalLines > SIZE.lowMaxLines || files.length > SIZE.lowMaxFiles) {
    add("medium", "size", `changes ${totalLines} lines across ${files.length} files (low allows up to ${SIZE.lowMaxLines} lines and ${SIZE.lowMaxFiles} files)`);
  }
  if (primaryEdits[GET_STARTED.tab] > SIZE.getStartedEditHigh) {
    add("high", "primary-size", `edits ${primaryEdits[GET_STARTED.tab]} lines in Get Started (over ${SIZE.getStartedEditHigh})`);
  }
  if (primaryEdits[BUILD_ON_BASE.tab] > SIZE.buildOnBaseEditHigh) {
    add("high", "primary-size", `edits ${primaryEdits[BUILD_ON_BASE.tab]} lines in Build on Base (over ${SIZE.buildOnBaseEditHigh})`);
  }
  if (otherTabPagesRemovedOrRenamed >= SIZE.otherTabPagesHigh) {
    add("high", "pages-removed", `removes or renames ${otherTabPagesRemovedOrRenamed} pages outside Get Started and Build on Base`);
  }
  if (pagesRemovedOrRenamed >= SIZE.pagesRemovedHigh) add("high", "pages-removed", `removes or renames ${pagesRemovedOrRenamed} pages`);
  if (linesDeleted >= SIZE.linesDeletedHigh) add("high", "lines-deleted", `deletes ${linesDeleted} lines`);

  // ---------------------------------------------------------- author
  if (firstTimeAuthor === true) {
    const hasMedium = reasons.some((r) => r.level === "medium");
    add("medium", "first-time-author", "this is the author's first PR to this repository");
    if (hasMedium) add("high", "first-time-author", "first-time author with a medium-risk change");
  }

  // ---------------------------------------------------------- result
  if (!reasons.length) {
    add("low", "small", onlyNonDocs && files.length ? "changes non-docs files only" : "small change with no risk signals");
  }
  const level = reasons.reduce((max, r) => (rank(r.level) > rank(max) ? r.level : max), "low");
  const seen = new Set();
  const unique = reasons
    .filter((r) => (seen.has(r.text) ? false : seen.add(r.text)))
    .sort((a, b) => rank(b.level) - rank(a.level));
  return { level, reasons: unique };
}

/**
 * Model for the content review, by risk level. Low-risk PRs use GPT-6 Luna;
 * every other level uses Claude Sonnet. Both go through the same LLM Gateway
 * client and host. Repository variables override the defaults without a code
 * change: DOCS_PR_REVIEW_MODEL_LOW for low, DOCS_PR_REVIEW_MODEL (passed as
 * CLAUDE_MODEL) for the rest.
 */
export const DEFAULT_REVIEW_MODELS = { low: "gpt-6-luna", other: "claude-sonnet-5-5" };
export function reviewModelFor(level, env = process.env) {
  if (level === "low") return env.DOCS_PR_REVIEW_MODEL_LOW || DEFAULT_REVIEW_MODELS.low;
  return env.CLAUDE_MODEL || DEFAULT_REVIEW_MODELS.other;
}

/** The only labels this workflow ever adds or removes. Created once by a maintainer. */
export const RISK_LABELS = { low: "risk: low", medium: "risk: medium", high: "risk: high", critical: "risk: critical" };

/**
 * Which risk labels to add and remove so the PR carries exactly one, matching `level`.
 * Labels outside RISK_LABELS (including skip-ai-review) are never touched.
 */
export function planRiskLabels(currentNames, level) {
  const want = RISK_LABELS[level];
  const owned = new Set(Object.values(RISK_LABELS));
  return {
    add: currentNames.includes(want) ? null : want,
    remove: currentNames.filter((n) => owned.has(n) && n !== want),
  };
}

/** Markdown block for the top of the summary comment. */
export function renderRisk(risk, { maxReasons = 8 } = {}) {
  const top = risk.reasons.filter((r) => r.level === risk.level);
  const rest = risk.reasons.filter((r) => r.level !== risk.level);
  const out = [`**Risk:** ${LEVEL_LABEL[risk.level]} (${LEVEL_MEANING[risk.level]}) · \`${RISK_LABELS[risk.level]}\` · shadow mode, not enforced`, ""];
  for (const r of top.slice(0, maxReasons)) out.push(`- ${r.text}`);
  if (top.length > maxReasons) out.push(`- and ${top.length - maxReasons} more`);
  if (rest.length) {
    out.push("", "<details><summary>Lower-level signals</summary>", "");
    for (const r of rest.slice(0, maxReasons)) out.push(`- ${LEVEL_LABEL[r.level]}: ${r.text}`);
    if (rest.length > maxReasons) out.push(`- and ${rest.length - maxReasons} more`);
    out.push("", "</details>");
  }
  // Machine-readable record for the shadow-week comparison. Rule ids only.
  const record = { level: risk.level, rules: [...new Set(risk.reasons.map((r) => `${r.level}:${r.rule}`))] };
  out.push("", `<!-- docs-pr-review:risk ${JSON.stringify(record)} -->`, "");
  return out.join("\n");
}
