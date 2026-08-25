/**
 * Output-safety pipeline for sync-from-base.
 *
 * This module owns the validator patterns and helpers that run *after*
 * Claude returns a completion. It has zero runtime dependencies (no LLM
 * SDK, no filesystem access) so it can be unit-tested in isolation and
 * imported into any future tooling without dragging the rest of
 * `index.mjs` along.
 *
 * Two responsibilities:
 *
 *   1. `validateSafety(content)` — server-side mirror of the security
 *      directives in the model's system prompt
 *      (`SYSTEM_PROMPT` in ./llm/prompts.mjs). Hard-rejects pages that
 *      contain raw HTML elements, event-handler attributes, dangerous
 *      URL schemes, URL-embedded credentials, or known secret
 *      patterns. Returns a reject reason string on the first match,
 *      or null when content is clean. Reject reasons NEVER echo the
 *      matched secret substring — only the rule name — so a leaked
 *      key cannot propagate into workflow logs or the PR body.
 *
 *   2. `extractExternalUrls(content)` — pulls every external
 *      (`http://` / `https://`) URL out of a page body, deduplicated
 *      and with trailing markdown punctuation stripped. Used by the
 *      reviewer-checklist diff to surface URLs that are NEW in the
 *      model's output vs. the page on `main`. Surface-only (no
 *      rejection) — humans decide whether an external host belongs
 *      in Coinbase docs.
 *
 * Layering: this module backs `validateMdx` in `index.mjs`. The
 * boundary between the two is structural-vs-content: `validateMdx`
 * checks page shape (frontmatter, MDX components, internal-link
 * routes), `validateSafety` checks for actively dangerous content.
 */

// ----------------------------------------------------------------- patterns

// HTML tag names that, when written as a *raw HTML element*, are either
// active content (script/iframe/etc.) or layout primitives that don't
// belong in MDX (form/meta/base/etc.).
//
// We deliberately do NOT use a case-insensitive single regex here. MDX
// distinguishes raw HTML from a JSX component by the first character of
// the tag name: lowercase → HTML pass-through, PascalCase → component
// (which `validateMdx` then runs against `ALLOWED_MDX_COMPONENTS`). So
// `<Frame>` is a legit allowlisted component while `<frame>` is a
// deprecated HTML element we want to reject. A single `/i` regex over
// the union of names cannot draw that line.
//
// Detection is two-pass:
//   1. `HTML_ELEMENT_CANDIDATE` finds tag-shaped tokens whose first
//      character is lowercase (i.e. parsed as HTML).
//   2. `HTML_DENY_NAMES` is the lowercase set of names we reject.
// Body characters after the first letter may be any case to catch
// obfuscation like `<sCrIpT>`, which a browser still parses as a script
// element.
const HTML_ELEMENT_CANDIDATE = /<\s*([a-z][a-zA-Z0-9]*)\b/g;
const HTML_DENY_NAMES = new Set([
  "script",
  "iframe",
  "style",
  "link",
  "object",
  "embed",
  "form",
  "noscript",
  "template",
  "meta",
  "base",
  "frame",
  "frameset",
  "applet",
]);
const RAW_ANCHOR_OR_IMG_NAMES = new Set(["a", "img"]);

// onclick=, onerror=, onload=, etc. The leading \s prevents matching
// inside legitimate identifiers like `monitor=` or `region=`.
const EVENT_HANDLER_ATTR = /\son[a-z]+\s*=/i;

// URL schemes we forbid anywhere in the file. javascript: / data: /
// vbscript: are classic XSS vectors; file: / ftp: have no place in
// modern docs.
const DANGEROUS_SCHEME = /\b(javascript|data|vbscript|file|ftp):/i;

// Credentials embedded in a URL: https://user:pass@host/...
const CREDS_IN_URL = /https?:\/\/[^\s/@]+:[^\s/@]+@/;

// Secret patterns. Each match is a hard reject; we report the rule name
// (e.g. "aws_access_key") but NEVER the matched substring, so the
// suspected secret doesn't propagate into the workflow log or PR body.
// Each pattern is conservative enough that the false-positive rate on
// real docs is near zero.
const SECRET_PATTERNS = [
  { name: "aws_access_key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "github_pat_classic", re: /\bghp_[A-Za-z0-9]{36}\b/ },
  { name: "github_pat_fine", re: /\bgithub_pat_[A-Za-z0-9_]{82}\b/ },
  { name: "github_oauth", re: /\bgho_[A-Za-z0-9]{36}\b/ },
  { name: "github_app", re: /\b(?:ghu|ghs)_[A-Za-z0-9]{36}\b/ },
  { name: "slack_token", re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
  {
    name: "pem_private_key",
    re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/,
  },
  // JWT: three base64url segments separated by dots; header starts with
  // eyJ (the base64url of `{"`) so we anchor on that to keep the
  // false-positive rate down.
  {
    name: "jwt",
    re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/,
  },
];

// ----------------------------------------------------------------- helpers

/**
 * Run the server-side mirror of system-prompt rules 3–5. Returns a
 * reject reason string on the first violation, or null if the content
 * is clean. The string format matches `validateMdx`'s shape so the
 * existing reject-row code path in main() carries it without changes.
 *
 * The secret check never echoes the matched substring back into the
 * return value — only the rule name. This keeps a leaked secret out of
 * GitHub Actions logs and the PR-body "Skipped pages" section.
 *
 * @param {string} content - the MDX content to validate
 * @returns {string|null}
 */
export function validateSafety(content) {
  // Two-pass scan for raw HTML elements — only tags whose first letter
  // is lowercase parse as HTML; PascalCase tags are MDX components and
  // are validated against ALLOWED_MDX_COMPONENTS in `validateMdx`.
  HTML_ELEMENT_CANDIDATE.lastIndex = 0;
  let m;
  while ((m = HTML_ELEMENT_CANDIDATE.exec(content)) !== null) {
    const tag = m[1].toLowerCase();
    if (HTML_DENY_NAMES.has(tag)) {
      return `raw HTML element <${tag}> is not allowed; use an allowlisted MDX component instead`;
    }
    if (RAW_ANCHOR_OR_IMG_NAMES.has(tag)) {
      return `raw HTML <${tag}> element is not allowed; use markdown link syntax or the Frame component`;
    }
  }
  if (EVENT_HANDLER_ATTR.test(content)) {
    return "event-handler attribute (on...=) is not allowed in MDX output";
  }
  if (DANGEROUS_SCHEME.test(content)) {
    const m = content.match(DANGEROUS_SCHEME);
    return `forbidden URL scheme \`${m[1].toLowerCase()}:\` in output`;
  }
  if (CREDS_IN_URL.test(content)) {
    return "URL with embedded credentials (https://user:pass@…) is not allowed";
  }
  for (const { name, re } of SECRET_PATTERNS) {
    if (re.test(content)) {
      return `secret_match: ${name} pattern detected in output`;
    }
  }
  return null;
}

/**
 * Extract every external (http/https) URL appearing in the page body.
 *
 * Used by the reviewer-checklist diff to surface URLs that are NEW in
 * the model's output vs. the page on `main`. Surface-only — no
 * rejection — because legitimate doc additions routinely introduce new
 * external references (GitHub PRs, ecosystem docs). The PR body table
 * lets a human spot-check each one before merging.
 *
 * Matcher accepts http:// and https:// only by design. mailto: / tel:
 * / site-relative `/path` URLs are out of scope here (mailto is
 * allowed, tel isn't a doc concern, internal links have their own
 * validator). Dangerous schemes (javascript:, data:, ...) are blocked
 * outright by `validateSafety`, so we don't need to consider them
 * here.
 *
 * Trailing markdown punctuation (`.`, `,`, `;`, `:`, `!`, `?`, `)`,
 * `]`, `>`) is stripped so two references to the same URL —
 * one ending a sentence with a period and one in the middle of prose
 * — deduplicate to a single entry.
 *
 * @param {string} content
 * @returns {Set<string>}
 */
export function extractExternalUrls(content) {
  const re = /\bhttps?:\/\/[^\s<>()\[\]"'`]+/gi;
  const out = new Set();
  let m;
  while ((m = re.exec(content)) !== null) {
    const cleaned = m[0].replace(/[.,;:!?)\]>]+$/, "");
    if (cleaned) out.add(cleaned);
  }
  return out;
}
