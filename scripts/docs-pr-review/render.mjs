/**
 * Parse, validate, and render the reviewer's output.
 *
 * The model's JSON is untrusted: every field is type-checked, capped, and
 * sanitized here before it reaches a GitHub comment. Anything that fails
 * validation is dropped, never "fixed up".
 *
 * Suggested edits get one extra gate (SPA-35356): a suggestion is posted only
 * if every URL, link target, address or hash, domain, long number, and code
 * snippet in it already appears verbatim in the lines it replaces, and it
 * passes the same output-safety rules as the docs sync. Anything else is
 * withheld, so a one-click "Commit suggestion" can never introduce new
 * links, addresses, or code into public docs.
 */

import { MAX_FINDINGS } from "./prompts.mjs";
import { validateSafety } from "../sync-from-base-std/safety.mjs";

export const STICKY_MARKER = "<!-- docs-pr-review:summary -->";
export const reviewMarker = (sha) => `<!-- docs-pr-review:sha=${sha} -->`;

const VERDICTS = new Set(["fits", "fits_with_changes", "needs_rework"]);
const SEVERITIES = new Set(["blocking", "suggestion"]);
const CATEGORIES = new Set(["placement", "duplication", "consistency", "accuracy", "writing"]);

/** Pull the first top-level JSON object out of a model response. */
export function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("model output contains no JSON object");
  return JSON.parse(candidate.slice(start, end + 1));
}

/**
 * Make prose links visible but not clickable: `[text](url)` becomes
 * text (`url`), and bare URLs are wrapped in code spans, which GitHub does
 * not autolink. A reader sees exactly where a link would go before using it.
 */
export function defangLinks(s) {
  return s
    .replace(/\[([^\]\n]*)\]\(\s*([^)\s]+)[^)]*\)/g, (_, text, url) => `${text} (\`${url.replace(/`/g, "")}\`)`)
    .replace(/(^|[^`(])\b((?:https?|ftp):\/\/[^\s<>()\[\]"'`]+)/gi, (_, pre, url) => `${pre}\`${url}\``);
}

/**
 * Make model text safe to post: no @-mentions (no pings), no HTML comments
 * (which could spoof our markers), no clickable links, bounded length.
 */
export function sanitizeText(value, maxLen = 1200) {
  if (typeof value !== "string") return "";
  let s = value
    .replace(/<!--|-->/g, "")
    .replace(/@(?=[A-Za-z0-9_-])/g, "@\u200b")
    .trim();
  s = defangLinks(s);
  if (s.length > maxLen) s = `${s.slice(0, maxLen)}…`;
  return s;
}

// Content a suggestion may only carry over, never introduce. Each entry
// returns the matched values; `group` picks a capture group.
const TRACKED_CONTENT = [
  { kind: "URL", re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s<>()\[\]"'`]+/gi },
  { kind: "link target", re: /\]\(\s*([^)\s]+)/g, group: 1 },
  { kind: "link target", re: /\b(?:href|src|to)\s*=\s*["'{]\s*([^"'}\s]+)/gi, group: 1 },
  { kind: "address or hash", re: /\b0x[0-9a-f]{6,}\b/gi },
  { kind: "domain", re: /\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}\b/gi },
  { kind: "number", re: /\b\d{4,}\b/g },
  { kind: "code", re: /`([^`\n]+)`/g, group: 1 },
];

const trimPunct = (v) => v.replace(/[.,;:!?)\]>]+$/, "");

/** Non-blank lines inside fenced code blocks. */
function fencedCodeLines(text) {
  const out = [];
  let inFence = false;
  for (const line of text.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence && line.trim()) out.push(line.trim());
  }
  return out;
}

/**
 * Kinds of content in `replacement` that do not appear verbatim in
 * `original` (the lines being replaced). Values are never returned, so a
 * malicious URL is never echoed into a comment or log.
 *
 * @returns {string[]} distinct kinds, e.g. ["URL", "address or hash"]
 */
export function newTrackedContent(replacement, original) {
  const haystack = original.toLowerCase();
  const kinds = new Set();
  for (const { kind, re, group = 0 } of TRACKED_CONTENT) {
    for (const m of replacement.matchAll(re)) {
      const value = trimPunct(m[group] || "");
      if (value && !haystack.includes(value.toLowerCase())) kinds.add(kind);
    }
  }
  for (const line of fencedCodeLines(replacement)) {
    if (!haystack.includes(line.toLowerCase())) kinds.add("code");
  }
  return [...kinds];
}

/**
 * Decide whether a suggested edit may be posted inline.
 * @returns {string|null} null if allowed, otherwise a short reason (no values)
 */
export function suggestionWithheldReason(replacement, original) {
  if (original == null) return "the original lines could not be read";
  if (validateSafety(replacement)) return "it failed the output-safety check";
  const kinds = newTrackedContent(replacement, original);
  if (kinds.length) return `it adds ${kinds.join(", ")} not present in the lines it replaces`;
  return null;
}

/** Shannon entropy in bits per character. */
function shannon(s) {
  const counts = new Map();
  for (const c of s) counts.set(c, (counts.get(c) || 0) + 1);
  let h = 0;
  for (const n of counts.values()) {
    const p = n / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

/**
 * Random-looking strings (32+ chars, mixed case and digits, >= 4.5 bits/char)
 * that do NOT appear anywhere in `source`, the material the model was given.
 * Hex strings (addresses, hashes) are public chain data and are skipped.
 * Tested against all of base/docs: strings copied from the docs, such as
 * Solana addresses, are in `source` and never flagged.
 */
export function unexplainedHighEntropyTokens(text, source = "") {
  const out = [];
  for (const [token] of text.matchAll(/[A-Za-z0-9+=_-]{32,}/g)) {
    if (/^(0x)?[0-9a-f]+$/i.test(token)) continue;
    if (!/[a-z]/.test(token) || !/[A-Z]/.test(token) || !/[0-9]/.test(token)) continue;
    if (shannon(token) < 4.5 || source.includes(token)) continue;
    out.push(token);
  }
  return out;
}

/**
 * Output policy gate (SPA-26751): run on every comment body right before it
 * is posted. Returns a reason (never the matched value) or null.
 *
 * Secret patterns come from validateSafety() in the shared sync module, read
 * only. It is applied per token and per line so that its other rules (raw
 * HTML, `data:` in prose) cannot fire first and hide a secret match.
 */
export function outboundViolation(text, source = "") {
  const pieces = [...text.split(/\s+/), ...text.split("\n").filter((l) => /PRIVATE KEY/.test(l))];
  for (const piece of pieces) {
    const reason = piece && validateSafety(piece);
    if (reason && (reason.startsWith("secret_match") || reason.includes("credentials"))) return reason;
  }
  const n = unexplainedHighEntropyTokens(text, source).length;
  if (n) return `${n} high-entropy string(s) not found in the review input (possible secret)`;
  return null;
}

const asLine = (v) => (Number.isInteger(v) && v > 0 && v < 100000 ? v : null);

/**
 * @param {object} raw            parsed JSON from the model
 * @param {Set<string>} validFiles changed page paths the model may reference
 */
export function validateReview(raw, validFiles) {
  if (!raw || typeof raw !== "object") throw new Error("review is not an object");
  const verdict = VERDICTS.has(raw.verdict) ? raw.verdict : null;
  if (!verdict) throw new Error(`invalid verdict: ${JSON.stringify(raw.verdict)}`);
  const dropped = [];
  const findings = [];
  for (const f of Array.isArray(raw.findings) ? raw.findings : []) {
    if (findings.length >= MAX_FINDINGS) break;
    if (!f || !SEVERITIES.has(f.severity) || !CATEGORIES.has(f.category) || !validFiles.has(f.file)) {
      dropped.push(f?.title ?? "(untitled)");
      continue;
    }
    const line = asLine(f.line);
    let endLine = asLine(f.end_line);
    if (endLine && (!line || endLine < line || endLine - line > 40)) endLine = null;
    findings.push({
      severity: f.severity,
      category: f.category,
      file: f.file,
      line,
      endLine,
      title: sanitizeText(f.title, 120),
      detail: sanitizeText(f.detail, 1200),
      evidence: sanitizeText(f.evidence, 400),
      // Replacement text is code-ish; keep it verbatim apart from markers and
      // mentions. planInlineComments() decides whether it may be posted.
      replacement:
        typeof f.replacement === "string" && f.replacement.length <= 4000 && line
          ? f.replacement.replace(/<!--|-->/g, "").replace(/@(?=[A-Za-z0-9_-])/g, "@\u200b")
          : null,
    });
  }
  return { verdict, summary: sanitizeText(raw.summary, 1500), findings, dropped };
}

/** Right-side (head) line numbers that GitHub accepts review comments on. */
export function commentableLines(patch = "") {
  const lines = new Set();
  let newLine = 0;
  for (const row of patch.split("\n")) {
    const h = row.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (h) {
      newLine = Number(h[1]);
      continue;
    }
    if (!newLine) continue;
    if (row.startsWith("-")) continue;
    // Empty context lines in a unified diff start with a space; a bare "" is
    // the artifact of a trailing newline and is not a line of the file.
    if (row.startsWith("+") || row.startsWith(" ")) {
      lines.add(newLine);
      newLine++;
    }
  }
  return lines;
}

function fence(text) {
  const longest = Math.max(2, ...(text.match(/`+/g) || []).map((m) => m.length));
  return "`".repeat(longest + 1);
}

/**
 * Split findings into inline suggestion comments (lines GitHub will accept,
 * content that passes the suggestion gate) and summary-only findings.
 *
 * @param {Array} findings                 validateReview() findings
 * @param {Map<string,string>} patches      file -> unified diff
 * @param {Map<string,string|null>} heads   file -> PR head content
 * @returns {{inline: Array, withheld: Map<object,string>}}
 */
export function planInlineComments(findings, patches, heads = new Map()) {
  const inline = [];
  const withheld = new Map();
  for (const f of findings) {
    if (!f.replacement || !f.line) continue;
    const ok = commentableLines(patches.get(f.file) || "");
    const end = f.endLine ?? f.line;
    let allInDiff = true;
    for (let n = f.line; n <= end; n++) if (!ok.has(n)) allInDiff = false;
    if (!allInDiff) continue;
    const head = heads.get(f.file);
    const original = typeof head === "string" ? head.split("\n").slice(f.line - 1, end).join("\n") : null;
    const reason = suggestionWithheldReason(f.replacement, original);
    if (reason) {
      withheld.set(f, reason);
      continue;
    }
    const ticks = fence(f.replacement);
    const comment = {
      path: f.file,
      line: end,
      side: "RIGHT",
      body: `**${f.title}**\n\n${f.detail}\n\n${ticks}suggestion\n${f.replacement}\n${ticks}`,
    };
    if (end !== f.line) {
      comment.start_line = f.line;
      comment.start_side = "RIGHT";
    }
    inline.push({ finding: f, comment });
  }
  return { inline, withheld };
}

const VERDICT_LABEL = {
  fits: "Fits",
  fits_with_changes: "Fits, with changes",
  needs_rework: "Needs rework",
};

function placementCell(fact) {
  const p = fact.placement;
  if (p.status === "live") return "Live in navigation";
  if (p.status === "redirected") return `Redirected to \`/${p.destination}\` (readers never see this file)`;
  return "Not in navigation (orphan)";
}

/** The sticky summary comment, updated in place on every run. */
const FOOTER = (runUrl) =>
  `_Advisory review from the Docs PR review workflow${runUrl ? ` ([run](${runUrl}))` : ""}. It does not approve, block, or edit this PR. Add the \`skip-ai-review\` label to turn it off for this PR._`;

/** Summary for a PR with no documentation pages: the risk label only. */
export function renderRiskOnlySummary({ riskBlock, headSha, runUrl }) {
  return [STICKY_MARKER, "## Docs review", "", riskBlock, `No documentation pages changed in \`${headSha.slice(0, 7)}\`, so there is no content review.`, "", FOOTER(runUrl)].join("\n");
}

export function renderSummary({ review, facts, headSha, inlineFindings, withheld = new Map(), runUrl, riskBlock = "", model = "" }) {
  const inlineSet = new Set(inlineFindings);
  const out = [STICKY_MARKER, "## Docs review", ""];
  if (riskBlock) out.push(riskBlock);
  out.push(`**Verdict:** ${VERDICT_LABEL[review.verdict]} · reviewed \`${headSha.slice(0, 7)}\`${model ? ` with \`${model}\`` : ""}`, "");
  if (review.summary) out.push(review.summary, "");

  const section = (label, items) => {
    if (!items.length) return;
    out.push(`### ${label}`, "");
    items.forEach((f, i) => {
      const where = f.line ? `\`${f.file}\` L${f.line}${f.endLine && f.endLine !== f.line ? `–${f.endLine}` : ""}` : `\`${f.file}\``;
      const note = inlineSet.has(f)
        ? " — suggestion posted inline"
        : withheld.has(f)
          ? ` — suggested edit withheld because ${withheld.get(f)}; make this change by hand if you agree`
          : "";
      out.push(`${i + 1}. **${f.title}** (${f.category}, ${where})${note}`);
      if (f.detail) out.push(`   ${f.detail}`);
      if (f.evidence) out.push(`   _Evidence:_ ${f.evidence}`);
    });
    out.push("");
  };
  section("Blocking", review.findings.filter((f) => f.severity === "blocking"));
  section("Suggestions", review.findings.filter((f) => f.severity === "suggestion"));
  if (!review.findings.length) out.push("No findings.", "");

  out.push("<details><summary>What the reviewer checked</summary>", "");
  out.push("| Page | Placement | Index section | Neighbors read |", "|---|---|---|---|");
  for (const f of facts) {
    out.push(
      `| \`${f.filename}\` | ${placementCell(f)} | ${f.index ? f.index.section : "not in llms-full.txt"} | ${f.neighbors.length} |`,
    );
  }
  const links = facts.flatMap((f) => f.links);
  if (links.length) {
    out.push("", "Links added: " + links.map((l) => `\`${l.href}\` (${l.verdict})`).join(", "));
  }
  if (review.dropped.length) out.push("", `${review.dropped.length} malformed finding(s) were discarded.`);
  out.push("", "</details>", "");
  out.push(FOOTER(runUrl));
  return out.join("\n");
}
