/**
 * Zero-dependency helpers for the release-discovery path.
 *
 * These live outside index.mjs (which imports the internal Gateway client via
 * ./llm/client.mjs) so the unit-test suite can import and exercise them
 * directly — same reason safety.mjs is kept dependency-free. Every function
 * here is pure: no file IO, no network, no module-level state.
 */

/**
 * Run `fn` over `items` with at most `limit` in flight at once, preserving
 * input order in the returned results array. A tiny dependency-free worker
 * pool: keep `limit` promises running and feed the next index as each
 * finishes. Used for the per-page transform, the manifest-chunk pre-pass, and
 * release page selection so a large release can't serialize into a slow run
 * or fan out into an unbounded burst of gateway calls.
 *
 * Rejections propagate (Promise.all semantics) — callers that want
 * best-effort per item must catch inside `fn`.
 *
 * @template T, R
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T, index: number) => Promise<R>} fn
 * @returns {Promise<R[]>}
 */
export async function mapWithConcurrency(items, limit, fn) {
  const list = Array.isArray(items) ? items : [];
  const results = new Array(list.length);
  const effectiveLimit = Math.max(1, Math.min(limit | 0 || 1, list.length || 1));
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= list.length) return;
      results[i] = await fn(list[i], i);
    }
  }
  const workers = [];
  for (let w = 0; w < effectiveLimit; w++) workers.push(worker());
  await Promise.all(workers);
  return results;
}

/**
 * Split a unified diff into chunks of at most ~maxBytes, cutting only on
 * `diff --git ` file boundaries so each chunk holds whole files (and thus
 * whole hunks). A single file larger than maxBytes becomes its own oversized
 * chunk rather than being split mid-hunk — the manifest pre-pass tolerates a
 * large chunk better than a syntactically broken one. Returns [] for empty
 * input.
 *
 * @param {string} diff
 * @param {number} maxBytes
 * @returns {string[]}
 */
export function chunkDiffBySize(diff, maxBytes) {
  if (typeof diff !== "string" || diff.trim().length === 0) return [];
  const cap = Math.max(1, maxBytes | 0);
  // Split into per-file sections. The first element may be a preamble before
  // the first `diff --git`; it stays attached to the first file section.
  const parts = diff.split(/(?=^diff --git )/m).filter((s) => s.length > 0);
  const chunks = [];
  let buf = "";
  for (const part of parts) {
    if (buf.length > 0 && buf.length + part.length > cap) {
      chunks.push(buf);
      buf = "";
    }
    if (part.length > cap && buf.length === 0) {
      // Oversized single file: emit it alone.
      chunks.push(part);
      continue;
    }
    buf += part;
  }
  if (buf.length > 0) chunks.push(buf);
  return chunks;
}

/**
 * Merge per-chunk manifests into one, de-duplicating on file+kind+subject so
 * the same change reported by two overlapping chunks isn't counted twice.
 * Non-array inputs and non-object entries are skipped.
 *
 * @param {Array<Array<object>>} manifests
 * @returns {Array<object>}
 */
export function mergeManifests(manifests) {
  const seen = new Set();
  const merged = [];
  for (const m of manifests || []) {
    if (!Array.isArray(m)) continue;
    for (const entry of m) {
      if (!entry || typeof entry !== "object") continue;
      const key = `${entry.file || ""}|${entry.kind || ""}|${entry.subject || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(entry);
    }
  }
  return merged;
}

/**
 * Accept only the bounded manifest shape that may be forwarded from the
 * untrusted-diff extraction pass to later model calls. This is deliberately a
 * sanitizer rather than a parser: malformed/model-invented records are simply
 * dropped, and every accepted string is single-line and size-bounded.
 */
const MANIFEST_KINDS = new Set([
  "field_type_change", "field_added", "field_removed", "field_renamed",
  "signature_change", "return_type_change", "enum_variant_added",
  "enum_variant_removed", "default_change", "other",
]);
const cleanManifestString = (value, max) =>
  typeof value === "string" && value.length > 0 && value.length <= max && !/[\r\n\0]/.test(value)
    ? value
    : null;

export function sanitizeManifestRecords(records, cap = 500) {
  if (!Array.isArray(records)) return [];
  const out = [];
  for (const record of records) {
    if (out.length >= cap || !record || typeof record !== "object") continue;
    const file = cleanManifestString(record.file, 512);
    const kind = cleanManifestString(record.kind, 64);
    const subject = cleanManifestString(record.subject, 512);
    const summary = cleanManifestString(record.summary, 2048);
    if (!file || !kind || !subject || !summary || !MANIFEST_KINDS.has(kind)) continue;
    const next = { file, kind, subject, summary };
    const before = cleanManifestString(record.before, 512);
    const after = cleanManifestString(record.after, 512);
    if (before) next.before = before;
    if (after) next.after = after;
    out.push(next);
  }
  return out;
}

/**
 * Minimal glob -> RegExp for the discovery exclude list. Supports `**`, `*`,
 * and `?`; everything else is matched literally. Anchored to the full path.
 * Kept tiny on purpose — this matches config we author, not user input, so it
 * doesn't need a full globbing dependency.
 *
 * @param {string} glob
 * @returns {RegExp}
 */
export function globToRegExp(glob) {
  let re = "^";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        // Globstar. `**/` matches any number of path segments INCLUDING zero
        // (so `a/**/b` matches `a/b`); a trailing `**` matches the rest.
        if (glob[i + 2] === "/") {
          re += "(?:.*/)?";
          i += 2;
        } else {
          re += ".*";
          i += 1;
        }
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  re += "$";
  return new RegExp(re);
}

/**
 * Render a compact, one-line-per-entry manifest summary for the selection
 * prompt. Capped so the selection call stays cheap regardless of manifest
 * size; a final line notes how many entries were elided.
 *
 * @param {Array<object>} manifest
 * @param {number} cap
 * @returns {string}
 */
export function summarizeManifest(manifest, cap = 120) {
  if (!Array.isArray(manifest) || manifest.length === 0) return "";
  const shown = manifest.slice(0, cap);
  const lines = shown.map((e) => {
    const kind = e.kind || "other";
    const subject = e.subject || "(unspecified)";
    const file = e.file || "";
    return `- [${kind}] ${subject}${file ? ` (${file})` : ""}`;
  });
  if (manifest.length > shown.length) {
    lines.push(`- ... and ${manifest.length - shown.length} more change(s)`);
  }
  return lines.join("\n");
}

/**
 * Identifier tokens that are too generic to prove a manifest entry is about
 * a given page (Solidity keywords, common types, words that appear on every
 * reference page). Matching on these would attach every entry to every page.
 */
const MANIFEST_SYMBOL_IGNORE = new Set([
  "function", "event", "error", "address", "uint256", "uint128", "uint64",
  "uint8", "bool", "bytes", "bytes32", "string", "memory", "calldata",
  "external", "public", "view", "pure", "returns", "return", "indexed",
  "mapping", "struct", "enum", "interface", "contract", "policy", "token",
  "role", "admin", "value", "amount", "account", "from", "owner", "sender",
]);

/**
 * Extract the identifier tokens a manifest entry is about: the qualified
 * subject (e.g. `IB20.seizeWithMemo`), its member part(s), and any identifier
 * in `before` / `after` (so a rename matches pages still using the old name).
 * Tokens shorter than 4 characters or on the ignore list are dropped.
 *
 * @param {{subject?: string, before?: string, after?: string}} entry
 * @returns {string[]} unique identifiers, qualified form first
 */
export function manifestEntrySymbols(entry) {
  if (!entry || typeof entry !== "object") return [];
  const out = [];
  const push = (tok) => {
    if (
      typeof tok === "string" &&
      tok.length >= 4 &&
      /^[A-Za-z_][A-Za-z0-9_.]*$/.test(tok) &&
      !MANIFEST_SYMBOL_IGNORE.has(tok.toLowerCase()) &&
      !out.includes(tok)
    ) {
      out.push(tok);
    }
  };
  // Haiku sometimes appends prose to a subject ("IB20.foo() NatSpec",
  // "MockB20.bar() implementation"). Only the leading identifier path counts.
  const rawSubject = typeof entry.subject === "string" ? entry.subject.trim() : "";
  const subject = (rawSubject.match(/^[A-Za-z_][A-Za-z0-9_.]*/) || [""])[0].replace(/\.$/, "");
  if (subject) {
    push(subject);
    // For a qualified subject (`IB20.seizeWithMemo`) only the member is
    // evidence: the qualifier appears on every page of that interface.
    const parts = subject.split(".").filter(Boolean);
    for (const part of parts.length > 1 ? parts.slice(1) : parts) push(part);
  }
  // From before/after, only identifiers that appear on ONE side are evidence:
  // `keccak256("OLD")` → `keccak256("NEW")` renames OLD, not keccak256.
  // Before/after are free text; only identifier-shaped tokens (an uppercase
  // letter, underscore, or digit) count, so words like "internal" or
  // "against" never become evidence.
  const looksLikeIdentifier = (t) => /[A-Z_0-9]/.test(t);
  const ids = (text) =>
    new Set(((typeof text === "string" ? text : "").match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).filter(looksLikeIdentifier));
  const before = ids(entry.before);
  const after = ids(entry.after);
  for (const tok of before) if (!after.has(tok)) push(tok);
  for (const tok of after) if (!before.has(tok)) push(tok);
  return out;
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Filter the dispatch-level manifest down to the entries relevant to one page.
 *
 * An entry is relevant when EITHER:
 *   - its `file` is one of the page's routed source files (exact or
 *     path-suffix match) — unless `requireSymbolMatch` is set, OR
 *   - one of its symbols (see manifestEntrySymbols) appears on the page as a
 *     whole identifier.
 *
 * The symbol rule is what makes the manifest useful on changelog-routed
 * pages: Haiku names the Solidity file it inferred from the entry text, while
 * the page's routed source is the changelog path, so the file rule alone
 * never matches there.
 *
 * @param {Array<object>} manifest
 * @param {{sourceFiles?: string[], pageContent?: string}} page
 * @returns {Array<object>}
 */
export function manifestForPage(
  manifest,
  { sourceFiles = [], pageContent = "", requireSymbolMatch = false } = {},
) {
  if (!Array.isArray(manifest) || manifest.length === 0) return [];
  const sources = Array.isArray(sourceFiles) ? sourceFiles : [];
  const content = typeof pageContent === "string" ? pageContent : "";
  return manifest.filter((entry) => {
    if (!entry || typeof entry !== "object") return false;
    // Pages that document exactly one callable (function-reference) must
    // mention the entry's symbol: sharing a source file with fifty sibling
    // pages is not evidence the change is about THIS page.
    if (!requireSymbolMatch && typeof entry.file === "string") {
      for (const sf of sources) {
        if (entry.file === sf || entry.file.endsWith(sf) || sf.endsWith(entry.file)) return true;
      }
    }
    if (!content) return false;
    return manifestEntrySymbols(entry).some((sym) =>
      new RegExp(`(?<![A-Za-z0-9_])${escapeRegExp(sym)}(?![A-Za-z0-9_])`).test(content),
    );
  });
}

// ------------------------------------------------------------ routing (code-change)

/**
 * Symbols worth grepping the docs tree for: manifest subjects (qualified and
 * bare), plus `before` names so a rename finds pages still using the old
 * identifier. Stricter than manifestEntrySymbols (min length 6 by default)
 * because these decide which pages get a Sonnet call at all.
 *
 * @param {Array<object>} manifest
 * @param {{minLength?: number}} opts
 * @returns {string[]}
 */
export function routingSymbols(manifest, { minLength = 6 } = {}) {
  if (!Array.isArray(manifest)) return [];
  const out = new Set();
  for (const entry of manifest) {
    // Mocks and tests document the reference implementation, not the public
    // surface; their internals (`_requireSeizable`, `policyId() implementation`)
    // must not route docs pages.
    if (typeof entry?.file === "string" && /^test\//.test(entry.file)) continue;
    for (const sym of manifestEntrySymbols({ subject: entry?.subject, before: entry?.before, after: entry?.after })) {
      const bare = sym.includes(".") ? sym.split(".").pop() : sym;
      if (bare.length >= minLength) out.add(bare);
      if (sym.includes(".")) out.add(sym);
    }
  }
  return [...out];
}

/**
 * Return only the code portions of a Markdown/MDX page: fenced blocks and
 * inline backtick spans. Symbol-mention routing matches inside these only, so
 * prose that happens to use a word like "announce" doesn't route the page.
 */
export function extractCodeSpans(content) {
  if (typeof content !== "string" || !content) return "";
  const fenced = content.match(/```[\s\S]*?```/g) || [];
  const inline = content.replace(/```[\s\S]*?```/g, "").match(/`[^`\n]+`/g) || [];
  return [...fenced, ...inline].join("\n");
}

/**
 * Find which pages mention which symbols inside code spans.
 *
 * @param {Array<{path: string, content: string}>} pages
 * @param {string[]} symbols
 * @returns {Map<string, string[]>} page path → matched symbols
 */
export function findSymbolMentions(pages, symbols) {
  const hits = new Map();
  if (!Array.isArray(pages) || !Array.isArray(symbols) || symbols.length === 0) return hits;
  const matchers = symbols.map((sym) => [
    sym,
    new RegExp(`(?<![A-Za-z0-9_])${escapeRegExp(sym)}(?![A-Za-z0-9_])`),
  ]);
  for (const page of pages) {
    const code = extractCodeSpans(page?.content);
    if (!code) continue;
    const matched = matchers.filter(([, re]) => re.test(code)).map(([sym]) => sym);
    if (matched.length > 0) hits.set(page.path, matched);
  }
  return hits;
}

/**
 * Merge symbol-mention hits into a path-routed work list. Path-routed pages
 * gain `reasons`; pages routed only by symbol are appended with the manifest
 * files that introduced those symbols as their sourceFiles (so per-page diff
 * slicing still works). Pure: returns a new array.
 *
 * @param {Array<{page: string, transformer: string, sourceFiles: string[], kinds?: string[]}>} work
 * @param {Map<string, string[]>} mentions
 * @param {Array<object>} manifest
 * @returns {Array<object>} work items with `reasons: string[]`
 */
export function mergeSymbolRoutes(work, mentions, manifest) {
  const byPage = new Map();
  for (const item of Array.isArray(work) ? work : []) {
    byPage.set(item.page, {
      ...item,
      reasons: (item.sourceFiles || []).map((s) => `path:${s}`),
    });
  }
  const filesForSymbol = (sym) =>
    (Array.isArray(manifest) ? manifest : [])
      .filter((e) => manifestEntrySymbols(e).some((s) => s === sym || s.endsWith(`.${sym}`) || s.split(".").pop() === sym))
      .map((e) => e.file)
      .filter(Boolean);
  for (const [page, syms] of mentions || []) {
    const reasons = syms.map((s) => `symbol:${s}`);
    const existing = byPage.get(page);
    if (existing) {
      existing.reasons.push(...reasons);
      continue;
    }
    const sourceFiles = [...new Set(syms.flatMap(filesForSymbol))];
    byPage.set(page, { page, transformer: "claude", sourceFiles, kinds: [], reasons });
  }
  return [...byPage.values()];
}

/**
 * Split a unified diff into per-file sections keyed by the post-image path
 * (`b/<path>` in the `diff --git` header; falls back to the a/ path).
 *
 * @param {string} diff
 * @returns {Map<string, string>}
 */
export function splitDiffByFile(diff) {
  const out = new Map();
  if (typeof diff !== "string" || diff.trim().length === 0) return out;
  const parts = diff.split(/(?=^diff --git )/m).filter((s) => s.trim().length > 0);
  for (const part of parts) {
    const m = part.match(/^diff --git a\/(\S+) b\/(\S+)/m);
    if (!m) continue;
    const file = m[2] || m[1];
    out.set(file, (out.get(file) || "") + part);
  }
  return out;
}

/**
 * Classify a docs page by the role it plays, from its path alone. Used to pick
 * the ownership rules in the prompt and the deterministic transformers.
 *
 * @param {string} pagePath  repo-relative docs path
 * @param {{entryDir: string, summaryPage: string}} layout
 * @returns {"changelog-entry"|"changelog-index"|"function-reference"|"interface-index"|"shared-reference"|"guide"}
 */
export function pageRoleFor(pagePath, { entryDir, summaryPage }) {
  const p = String(pagePath || "");
  if (summaryPage && p === summaryPage) return "changelog-index";
  if (entryDir && p.startsWith(entryDir.replace(/\/?$/, "/"))) return "changelog-entry";
  const iface = p.match(/\/reference\/interfaces\/[^/]+\/([^/]+)\.mdx$/);
  if (iface) return iface[1] === "index" ? "interface-index" : "function-reference";
  if (/\/reference\/[^/]+\.mdx$/.test(p)) return "shared-reference";
  return "guide";
}

/**
 * Parse the index-table rows that a base-std `changelog/README.md` diff adds
 * or rewrites. A row is `| Product(s) | Change | Affected interfaces | Entry |`
 * where Entry links the entry file, e.g. `[02_Cobalt_B20_seize](02_Cobalt_B20_seize.md)`.
 * Only `+` lines are considered; header/separator rows are skipped.
 *
 * @param {string} readmeDiff  the README's section of the unified diff
 * @returns {Array<{products: string, change: string, interfaces: string, entryFile: string}>}
 */
export function parseChangelogIndexRows(readmeDiff) {
  const rows = [];
  if (typeof readmeDiff !== "string") return rows;
  for (const line of readmeDiff.split("\n")) {
    if (!line.startsWith("+|")) continue;
    const cells = line.slice(1).split("|").map((c) => c.trim());
    // ["", products, change, interfaces, entry, ""]
    if (cells.length < 6) continue;
    const [, products, change, interfaces, entry] = cells;
    if (/^-+$/.test(products) || /^Product/i.test(products)) continue;
    const link = entry.match(/\(([^)]+\.md)\)/);
    if (!link) continue;
    rows.push({ products, change, interfaces, entryFile: `changelog/${link[1].replace(/^\.?\//, "")}` });
  }
  return rows;
}

/**
 * Add or update one row in the summary page's per-hardfork table.
 * The table is found under the heading that names the hardfork
 * (`## [Cobalt](...)` or `## Cobalt`). A row is matched by its entry route; an
 * existing row keeps its link label, a new row uses `change` as the label.
 * Returns the content unchanged (and `changed: false`) when the hardfork has
 * no section yet — creating sections is a writer's job.
 *
 * @param {string} content       current summary page
 * @param {string} hardfork      e.g. "Cobalt"
 * @param {{products: string, change: string, interfaces: string, route: string}} row
 * @returns {{content: string, changed: boolean, action: "added"|"updated"|"unchanged"|"no-section"}}
 */
export function upsertSummaryRow(content, hardfork, row) {
  const lines = content.split("\n");
  const headingRe = new RegExp(`^##\\s+(\\[${escapeRegExp(hardfork)}\\]|${escapeRegExp(hardfork)}\\b)`, "i");
  const start = lines.findIndex((l) => headingRe.test(l));
  if (start < 0) return { content, changed: false, action: "no-section" };
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) {
      end = i;
      break;
    }
  }
  const ifaceCell = formatInterfacesCell(row.interfaces);
  let tableLast = -1;
  for (let i = start + 1; i < end; i++) {
    if (!lines[i].startsWith("|")) continue;
    tableLast = i;
    if (lines[i].includes(`](${row.route})`)) {
      const label = (lines[i].match(/\[([^\]]+)\]\(/) || [])[1] || row.change;
      const next = `| ${row.products} | ${row.change} | ${ifaceCell} | [${label}](${row.route}) |`;
      if (next === lines[i]) return { content, changed: false, action: "unchanged" };
      lines[i] = next;
      return { content: lines.join("\n"), changed: true, action: "updated" };
    }
  }
  if (tableLast < 0) return { content, changed: false, action: "no-section" };
  lines.splice(tableLast + 1, 0, `| ${row.products} | ${row.change} | ${ifaceCell} | [${row.change}](${row.route}) |`);
  return { content: lines.join("\n"), changed: true, action: "added" };
}

/** `src/interfaces/IB20Asset.sol` → `` `IB20Asset` ``; keeps prose like "(shared surface)". */
function formatInterfacesCell(text) {
  return String(text || "")
    .replace(/`?src\/interfaces\/([A-Za-z0-9_]+)\.sol`?/g, "`$1`")
    .replace(/\s*→\s*inherited by[^|]*$/i, "")
    .trim();
}

/**
 * Insert a page route into a named nav group (first match, depth-first).
 * Returns true when inserted, false when the group is missing or the route
 * is already present. Mutates `navigation`.
 */
export function insertNavPage(navigation, groupName, route) {
  let done = false;
  const walk = (node) => {
    if (done || !node) return;
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (typeof node !== "object") return;
    if (node.group === groupName && Array.isArray(node.pages)) {
      if (!node.pages.includes(route)) node.pages.push(route);
      done = true;
      return;
    }
    for (const key of ["pages", "groups", "tabs", "anchors"]) if (node[key]) walk(node[key]);
  };
  walk(navigation);
  return done;
}

/** First `# Heading` of a Markdown document, or "". */
export function firstHeading(markdown) {
  const m = String(markdown || "").match(/^#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : "";
}
