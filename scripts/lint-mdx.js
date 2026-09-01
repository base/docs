#!/usr/bin/env node

/**
 * MDX Linter for Mintlify Documentation
 *
 * Deterministic checks for MDX files:
 * - Frontmatter validation
 * - Heading structure
 * - Code block language, filename/title and long-block conventions
 * - Mintlify component syntax
 * - Internal link validation
 * - Title case on page and navigation titles
 * - Descriptive link text and image alt text
 *
 * Rules are defined in docs/content-guidelines.md and the Naming Conventions section of
 * docs/ia-guidelines.md. Every issue carries a stable rule id so CI can require a specific
 * subset -- see RULES below and .github/workflows/docs-style-conformance.yml.
 *
 * Usage:
 *   node scripts/lint-mdx.js                      # changed files (vs master)
 *   node scripts/lint-mdx.js all                  # every MDX file
 *   node scripts/lint-mdx.js docs/api             # a specific file or directory
 *   node scripts/lint-mdx.js --files-from=list    # newline-delimited paths (used by CI)
 *   node scripts/lint-mdx.js --check-nav          # also title-case docs.json tab/group names
 *   node scripts/lint-mdx.js --format=github      # ::error:: annotations for PR diffs
 *   node scripts/lint-mdx.js --diff-range=A...B   # report only lines this range changed
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const REPO_ROOT = path.join(__dirname, "..");
const DOCS_DIR = path.join(REPO_ROOT, "docs");
const DOCS_JSON = path.join(DOCS_DIR, "docs.json");
const TITLE_CASE_EXCEPTIONS = path.join(DOCS_DIR, ".title-case-exceptions.txt");

/**
 * Paths that are not published pages and so are exempt from page-level rules.
 *
 * docs/snippets holds reusable MDX and JSX partials -- they are imported into pages and
 * legitimately have no frontmatter of their own, so frontmatter and title rules do not
 * apply to them.
 */
const NON_PAGE_PREFIXES = ["docs/snippets/"];

const { loadMintIgnore } = require("./lib/docs-utils");

let mintIgnored = null;

/** Pages excluded from the Mintlify build, per docs/.mintignore. */
function isMintIgnored(docsRelativePath) {
  if (!mintIgnored) mintIgnored = loadMintIgnore(path.join(DOCS_DIR, ".mintignore"));
  const withoutExtension = docsRelativePath.replace(/\.mdx?$/, "");
  if (mintIgnored.bareFiles.has(withoutExtension)) return true;
  if (mintIgnored.files.has(docsRelativePath)) return true;
  for (const dir of mintIgnored.dirs) {
    if (docsRelativePath.startsWith(`${dir}/`)) return true;
  }
  return false;
}

/**
 * True when a path is a published documentation page, and so subject to page-level rules.
 *
 * Excludes snippets (imported partials with no frontmatter of their own) and anything
 * .mintignore keeps out of the build -- there is no value in blocking a pull request on a
 * page that never ships.
 */
function isLintablePage(relPath) {
  const normalized = relPath.split(path.sep).join("/");
  if (!normalized.endsWith(".mdx")) return false;
  if (!normalized.startsWith("docs/")) return false;
  if (NON_PAGE_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return false;
  return !isMintIgnored(normalized.slice("docs/".length));
}

// -----------------------------------------------------------------------------
// Rule registry
// -----------------------------------------------------------------------------

/**
 * Every rule id, mapped to its severity. "error" fails the build; "warning" is advisory.
 *
 * The six rules the CI conformance check enforces come from the Language & Style
 * Conformance section of the CI gates spec. `wrap` and `highlight` stay advisory because
 * content-guidelines.md phrases them conditionally ("use `wrap` to prevent horizontal
 * scrolling"), so they are recommendations rather than always-violations.
 */
const RULES = {
  // Frontmatter
  "frontmatter/missing": "error",
  "frontmatter/title": "error",
  "frontmatter/description": "error",
  // Headings -- hierarchy must start at H2, since the H1 comes from frontmatter title
  "heading/no-h1": "error",
  "heading/starts-at-h2": "error",
  "heading/skipped-level": "warning",
  "heading/none": "warning",
  // Title case
  "title-case/page-title": "error",
  "title-case/nav-title": "error",
  // Code blocks
  "codeblock/language": "error",
  "codeblock/filename-or-title": "error",
  "codeblock/long-block-meta": "error",
  "codeblock/codegroup-label": "warning",
  "codeblock/wrap": "warning",
  "codeblock/highlight": "warning",
  // Accessibility
  "a11y/alt-text": "error",
  "a11y/link-text": "error",
  "a11y/image-frame": "warning",
  // Components
  "component/html-comment": "error",
  "component/callout-typo": "error",
  "component/required-attr": "warning",
  "component/cardgroup-cols": "warning",
  // Links
  "link/broken-internal": "warning",
  // Meta
  "file/not-found": "error",
};

function severityOf(rule) {
  const severity = RULES[rule];
  if (!severity) throw new Error(`lint-mdx: unregistered rule id "${rule}"`);
  return severity;
}

/** Build an issue, deriving severity from the rule registry. */
function issue(line, rule, message) {
  return { line, rule, severity: severityOf(rule), message };
}

// -----------------------------------------------------------------------------
// File Discovery
// -----------------------------------------------------------------------------

function getChangedFiles() {
  try {
    const uncommitted = execSync("git diff --name-only HEAD", {
      encoding: "utf-8",
      cwd: path.join(__dirname, ".."),
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    const committed = execSync("git diff --name-only master...HEAD", {
      encoding: "utf-8",
      cwd: path.join(__dirname, ".."),
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    const allChanged = [...new Set([...uncommitted, ...committed])];
    return allChanged.filter(isLintablePage);
  } catch {
    return [];
  }
}

function getAllMdxFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllMdxFiles(fullPath));
    } else {
      const rel = path.relative(REPO_ROOT, fullPath);
      if (isLintablePage(rel)) files.push(rel);
    }
  }
  return files;
}

function getFilesToCheck(arg) {
  if (!arg) {
    return { files: getChangedFiles(), mode: "changed" };
  }
  if (arg === "all") {
    return { files: getAllMdxFiles(DOCS_DIR), mode: "all" };
  }
  // Specific path
  const targetPath = path.join(__dirname, "..", arg);
  if (fs.existsSync(targetPath)) {
    if (fs.statSync(targetPath).isDirectory()) {
      return { files: getAllMdxFiles(targetPath), mode: `path: ${arg}` };
    }
    if (arg.endsWith(".mdx")) {
      return { files: [arg], mode: `file: ${arg}` };
    }
  }
  return { files: [], mode: "invalid path" };
}

// -----------------------------------------------------------------------------
// Linting Rules
// -----------------------------------------------------------------------------

function checkFrontmatter(content, filePath) {
  const issues = [];
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    issues.push(issue(1, "frontmatter/missing", "Missing frontmatter"));
    return issues;
  }

  const frontmatter = frontmatterMatch[1];

  if (!/^title:\s*.+/m.test(frontmatter)) {
    issues.push(issue(1, "frontmatter/title", "Frontmatter missing required `title` field"));
  }

  if (!/^description:\s*.+/m.test(frontmatter)) {
    issues.push(
      issue(1, "frontmatter/description", "Frontmatter missing required `description` field")
    );
  }

  return issues;
}

function checkHeadingStructure(content, filePath) {
  const issues = [];
  const lines = content.split("\n");
  let inCodeBlock = false;
  let lastHeadingLevel = 0;
  let totalHeadingCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const headingMatch = line.match(/^(#{1,6})\s+/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      totalHeadingCount++;

      // The page title lives in frontmatter, so body content must not restate it as an H1.
      // content-guidelines.md: "Ensure proper heading hierarchy starting with H2".
      if (level === 1) {
        issues.push(
          issue(
            i + 1,
            "heading/no-h1",
            "H1 in body content — the page title comes from frontmatter; start body headings at H2"
          )
        );
      } else if (totalHeadingCount === 1 && level !== 2) {
        issues.push(
          issue(i + 1, "heading/starts-at-h2", `First body heading is H${level}; hierarchy must start at H2`)
        );
      }

      if (lastHeadingLevel > 0 && level > lastHeadingLevel + 1) {
        issues.push(
          issue(i + 1, "heading/skipped-level", `Skipped heading level: H${lastHeadingLevel} → H${level}`)
        );
      }

      lastHeadingLevel = level;
    }
  }

  // Check for pages with no headings (bad for SEO)
  if (totalHeadingCount === 0) {
    issues.push(issue(1, "heading/none", "No headings found (at least one heading improves SEO)"));
  }

  return issues;
}

/**
 * Attribute tokens that may follow the language on a fence. Anything left over after these
 * are removed is treated as the filename or title.
 */
const CODE_FENCE_ATTRS = new Set([
  "lines",
  "wrap",
  "expandable",
  "twoslash",
  "diff",
  "showLineNumbers",
]);
const CODE_FENCE_ATTR_PATTERNS = [/^highlight=/, /^focus=/, /^\{.*\}$/];

/** Length above which content-guidelines.md requires `lines` and `expandable`. */
const LONG_CODE_BLOCK_LINES = 7;

function isFenceAttr(token) {
  return CODE_FENCE_ATTRS.has(token) || CODE_FENCE_ATTR_PATTERNS.some((re) => re.test(token));
}

/**
 * Collect every fenced code block with its metadata and body length.
 *
 * Fences are matched by character and length so a longer outer fence can wrap a shorter
 * inner one -- MDX examples that show fenced markdown rely on that.
 */
function collectCodeBlocks(content) {
  const lines = content.split("\n");
  const blocks = [];
  let open = null;
  let codeGroupDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!open) {
      if (line.includes("<CodeGroup>")) codeGroupDepth++;
      if (line.includes("</CodeGroup>")) codeGroupDepth = Math.max(0, codeGroupDepth - 1);
    }

    const fenceMatch = line.match(/^(`{3,}|~{3,})(.*)$/);
    if (!fenceMatch) continue;

    const fence = fenceMatch[1];
    const metadata = fenceMatch[2].trim();

    if (open) {
      const sameCharacter = fence[0] === open.character;
      const longEnough = fence.length >= open.length;
      if (sameCharacter && longEnough && metadata === "") {
        open.bodyLines = i - open.line;
        blocks.push(open);
        open = null;
      }
      continue;
    }

    const tokens = metadata.split(/\s+/).filter(Boolean);
    open = {
      line: i + 1,
      character: fence[0],
      length: fence.length,
      lang: tokens[0] || "",
      tokens: tokens.slice(1),
      inCodeGroup: codeGroupDepth > 0,
      bodyLines: 0,
    };
  }

  // An unterminated fence still gets reported on its own metadata.
  if (open) {
    open.bodyLines = lines.length - open.line;
    blocks.push(open);
  }

  return blocks;
}

function checkCodeBlocks(content, filePath) {
  const issues = [];

  for (const block of collectCodeBlocks(content)) {
    if (!block.lang) {
      issues.push(issue(block.line, "codeblock/language", "Code block missing language specifier"));
      continue;
    }

    const descriptors = block.tokens.filter((t) => !isFenceAttr(t));
    const attrs = new Set(block.tokens.filter(isFenceAttr));

    // content-guidelines.md: "Every code block must have a filename or a title".
    if (descriptors.length === 0) {
      issues.push(
        issue(
          block.line,
          block.inCodeGroup ? "codeblock/codegroup-label" : "codeblock/filename-or-title",
          block.inCodeGroup
            ? "Code block in <CodeGroup> should have a label (e.g., ```javascript Node.js)"
            : "Code block needs a filename or title after the language (e.g., ```typescript page.tsx)"
        )
      );
    }

    // "Code blocks longer than 7 lines should have line numbers ... and be marked expandable".
    if (block.bodyLines > LONG_CODE_BLOCK_LINES) {
      const missing = ["lines", "expandable"].filter((a) => !attrs.has(a));
      if (missing.length) {
        issues.push(
          issue(
            block.line,
            "codeblock/long-block-meta",
            `Code block is ${block.bodyLines} lines; blocks over ${LONG_CODE_BLOCK_LINES} need ${missing
              .map((m) => `\`${m}\``)
              .join(" and ")}`
          )
        );
      }
      if (!attrs.has("wrap")) {
        issues.push(
          issue(block.line, "codeblock/wrap", "Consider `wrap` to prevent horizontal scrolling")
        );
      }
    }

    // "Highlight the most relevant lines" -- advisory, and only worth suggesting once a
    // block is long enough for highlighting to help.
    if (block.bodyLines > LONG_CODE_BLOCK_LINES && !block.tokens.some((t) => /^highlight=/.test(t))) {
      issues.push(
        issue(block.line, "codeblock/highlight", "Consider `highlight={}` to draw attention to key lines")
      );
    }
  }

  return issues;
}

function checkMintlifyComponents(content, filePath) {
  const issues = [];
  const lines = content.split("\n");

  // Track component nesting
  const componentStack = [];

  // Components that need specific children
  const parentChildRules = {
    Steps: "Step",
    Tabs: "Tab",
    AccordionGroup: "Accordion",
  };

  // Required attributes
  const requiredAttrs = {
    Step: ["title"],
    Tab: ["title"],
    Accordion: ["title"],
    Card: ["title"],
    ParamField: ["type"],
    ResponseField: ["name", "type"],
  };

  // Valid callout components
  const validCallouts = ["Note", "Tip", "Warning", "Info", "Check"];

  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip anything inside fenced code blocks — example code is not doc markup.
    if (/^```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // Check for HTML comments
    if (line.includes("<!--")) {
      issues.push(
        issue(i + 1, "component/html-comment", "Use MDX comments {/* */} instead of HTML comments <!-- -->")
      );
    }

    // Check for typos in callouts
    const calloutTypos = ["<Warnings>", "<Notes>", "<Tips>", "<Infos>", "<Checks>"];
    for (const typo of calloutTypos) {
      if (line.includes(typo)) {
        issues.push(
          issue(i + 1, "component/callout-typo", `Typo: ${typo} should be <${typo.slice(1, -2)}>`)
        );
      }
    }

    // Check opening tags
    const openTagMatch = line.match(/<(Step|Tab|Accordion|Card|CardGroup|ParamField|ResponseField|Frame|Steps|Tabs|AccordionGroup)(\s[^>]*)?\/?>/);
    if (openTagMatch) {
      const tag = openTagMatch[1];
      const attrs = openTagMatch[2] || "";
      const isSelfClosing = line.includes("/>");

      // Check required attributes
      if (requiredAttrs[tag]) {
        for (const attr of requiredAttrs[tag]) {
          if (!new RegExp(`${attr}=`).test(attrs)) {
            issues.push(
              issue(i + 1, "component/required-attr", `<${tag}> should have \`${attr}\` attribute`)
            );
          }
        }
      }

      // CardGroup should have cols
      if (tag === "CardGroup" && !attrs.includes("cols")) {
        issues.push(issue(i + 1, "component/cardgroup-cols", "<CardGroup> should have `cols` attribute"));
      }

      // Track parent components
      if (parentChildRules[tag] && !isSelfClosing) {
        componentStack.push({ tag, line: i + 1 });
      }
    }

    // Check for img without Frame
    if (line.includes("<img") && !line.includes("<Frame")) {
      // Look backwards for Frame
      let hasFrame = false;
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        if (lines[j].includes("<Frame")) {
          hasFrame = true;
          break;
        }
      }
      if (!hasFrame) {
        issues.push(issue(i + 1, "a11y/image-frame", "Image should be wrapped in <Frame>"));
      }
    }

  }

  return issues;
}

// -----------------------------------------------------------------------------
// Title case
// -----------------------------------------------------------------------------

/**
 * Short conjunctions, articles and prepositions that stay lowercase mid-title.
 * docs/ia-guidelines.md: "capitalize all words except short conjunctions and articles".
 */
const SMALL_WORDS = new Set([
  "a", "an", "the",
  "and", "but", "or", "nor", "so", "yet",
  "as", "at", "by", "for", "from", "in", "into", "of", "off", "on", "onto",
  "over", "per", "than", "that", "to", "up", "via", "vs", "with",
]);

let titleCaseExceptions = null;

/** Tokens exempt from title case, from docs/.title-case-exceptions.txt. */
function loadTitleCaseExceptions() {
  if (titleCaseExceptions) return titleCaseExceptions;
  titleCaseExceptions = new Set();
  try {
    for (const raw of fs.readFileSync(TITLE_CASE_EXCEPTIONS, "utf-8").split("\n")) {
      const line = raw.trim();
      if (line && !line.startsWith("#")) titleCaseExceptions.add(line);
    }
  } catch {
    // Missing exceptions file is not fatal; the rule just has no allowlist.
  }
  return titleCaseExceptions;
}

/**
 * Words that title case cannot meaningfully judge, and so must never flag.
 *
 * Two categories:
 *   1. anything containing a digit, dot, underscore, slash or colon -- identifiers,
 *      versions and protocol names;
 *   2. anything with an internal capital -- camelCase and PascalCase identifiers such as
 *      `getPaymentStatus` or `dataSuffix`. Many reference pages are titled after the symbol
 *      they document, and capitalizing those would be wrong, not merely noisy.
 *
 * Inline code spans are stripped before we get here.
 */
function isUnjudgeableWord(word) {
  if (!/^[A-Za-z][A-Za-z'’-]*$/.test(word)) return true;
  if (/[a-z][A-Z]/.test(word)) return true;
  return false;
}

/**
 * Report words that should be capitalized but are not.
 *
 * Deliberately one-directional: it flags a lowercase word that ought to be capitalized, and
 * never flags a capitalized word for being capitalized. Titles legitimately contain
 * OnchainKit, USDC and ERC-20, and guessing at those produces noise rather than signal.
 */
function titleCaseViolations(title) {
  const exceptions = loadTitleCaseExceptions();
  // Drop inline code spans -- `npm install` inside a title is not prose.
  const withoutCode = title.replace(/`[^`]*`/g, " ");
  const words = withoutCode.split(/[\s—–/]+/).filter(Boolean);
  const offenders = [];

  words.forEach((rawWord, index) => {
    // Strip surrounding punctuation and quotes, keeping internal hyphens/apostrophes.
    const word = rawWord.replace(/^[^A-Za-z0-9]+/, "").replace(/[^A-Za-z0-9'’-]+$/, "");
    if (!word) return;
    if (exceptions.has(word)) return;
    if (isUnjudgeableWord(word)) return;
    if (!/^[a-z]/.test(word)) return;

    const isFirst = index === 0;
    const isLast = index === words.length - 1;
    // Small words stay lowercase except at the very start or end of the title.
    if (SMALL_WORDS.has(word.toLowerCase()) && !isFirst && !isLast) return;

    offenders.push(word);
  });

  return offenders;
}

function extractFrontmatterTitle(content) {
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatter) return null;
  const titleLine = frontmatter[1].match(/^title:\s*(.+)$/m);
  if (!titleLine) return null;
  return titleLine[1].trim().replace(/^["']|["']$/g, "");
}

function checkTitleCase(content, filePath) {
  const title = extractFrontmatterTitle(content);
  if (!title) return []; // absence is frontmatter/title's job, not this rule's

  const offenders = titleCaseViolations(title);
  if (offenders.length === 0) return [];

  return [
    issue(
      1,
      "title-case/page-title",
      `Page title should use title case: capitalize ${offenders
        .map((w) => `"${w}"`)
        .join(", ")} in "${title}"`
    ),
  ];
}

/**
 * Title-case the tab and group names in docs.json.
 *
 * Navigation labels are not tied to a single page, so this runs once per invocation rather
 * than per file, and reports against docs/docs.json.
 */
function checkNavTitles(docsJsonPath = DOCS_JSON) {
  const issues = [];
  let config;
  try {
    config = JSON.parse(fs.readFileSync(docsJsonPath, "utf-8"));
  } catch (err) {
    return [issue(1, "title-case/nav-title", `Could not read navigation config: ${err.message}`)];
  }

  const raw = fs.readFileSync(docsJsonPath, "utf-8").split("\n");
  /** Best-effort line lookup so annotations land near the offending label. */
  const lineOf = (label) => {
    const needle = `"${label}"`;
    const idx = raw.findIndex((l) => l.includes(needle));
    return idx === -1 ? 1 : idx + 1;
  };

  const report = (kind, label) => {
    const offenders = titleCaseViolations(label);
    if (offenders.length === 0) return;
    issues.push(
      issue(
        lineOf(label),
        "title-case/nav-title",
        `Navigation ${kind} "${label}" should use title case: capitalize ${offenders
          .map((w) => `"${w}"`)
          .join(", ")}`
      )
    );
  };

  const walkGroups = (groups) => {
    for (const group of Array.isArray(groups) ? groups : []) {
      if (!group || typeof group !== "object") continue;
      if (typeof group.group === "string") report("group", group.group);
      for (const page of Array.isArray(group.pages) ? group.pages : []) {
        if (page && typeof page === "object") walkGroups([page]);
      }
    }
  };

  for (const tab of config?.navigation?.tabs ?? []) {
    if (!tab || typeof tab !== "object") continue;
    if (typeof tab.tab === "string") report("tab", tab.tab);
    walkGroups(tab.groups);
  }

  return issues;
}

// -----------------------------------------------------------------------------
// Accessibility
// -----------------------------------------------------------------------------

/** Alt text that exists but describes nothing. */
const PLACEHOLDER_ALT = new Set([
  "image", "images", "img", "photo", "picture", "screenshot", "screen shot",
  "diagram", "graphic", "icon", "alt", "alt text", "placeholder", "untitled", "todo",
]);

/** Link text that gives the reader no idea where the link goes. */
const NON_DESCRIPTIVE_LINK_TEXT = new Set([
  "click here", "here", "this", "this link", "link", "this page",
  "read more", "more", "see here", "go here", "click", "click this",
]);

function normalizeText(value) {
  return value.trim().replace(/\s+/g, " ").replace(/[.!:]+$/, "").toLowerCase();
}

/**
 * Alt text and link text.
 *
 * content-guidelines.md, Accessibility: "Include descriptive alt text for all images and
 * diagrams" and "Use specific, actionable link text instead of 'click here'".
 */
function checkAccessibility(content, filePath) {
  const issues = [];
  const lines = content.split("\n");
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^(`{3,}|~{3,})/.test(line)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // Markdown images: ![alt](src)
    for (const match of line.matchAll(/!\[([^\]]*)\]\(/g)) {
      const alt = match[1].trim();
      if (!alt) {
        issues.push(issue(i + 1, "a11y/alt-text", "Image has empty alt text"));
      } else if (PLACEHOLDER_ALT.has(normalizeText(alt))) {
        issues.push(
          issue(i + 1, "a11y/alt-text", `Alt text "${alt}" does not describe the image`)
        );
      }
    }

    // JSX images: <img ... alt="..." /> and <Frame>-wrapped equivalents
    for (const match of line.matchAll(/<img\b([^>]*)>/g)) {
      const attrs = match[1];
      const alt = attrs.match(/\balt\s*=\s*["']([^"']*)["']/);
      if (!alt) {
        issues.push(issue(i + 1, "a11y/alt-text", "<img> is missing an `alt` attribute"));
      } else if (!alt[1].trim()) {
        issues.push(issue(i + 1, "a11y/alt-text", "<img> has empty alt text"));
      } else if (PLACEHOLDER_ALT.has(normalizeText(alt[1]))) {
        issues.push(
          issue(i + 1, "a11y/alt-text", `Alt text "${alt[1]}" does not describe the image`)
        );
      }
    }

    // Markdown links: [text](target). The negative lookbehind skips images.
    for (const match of line.matchAll(/(?<!!)\[([^\]]+)\]\(/g)) {
      const text = match[1];
      if (NON_DESCRIPTIVE_LINK_TEXT.has(normalizeText(text))) {
        issues.push(
          issue(
            i + 1,
            "a11y/link-text",
            `Link text "${text}" is not descriptive — say what the reader will find`
          )
        );
      }
    }
  }

  return issues;
}

function checkInternalLinks(content, filePath) {
  const issues = [];
  const lines = content.split("\n");

  // Match markdown links and href attributes pointing to internal paths
  const linkPatterns = [
    /\[([^\]]*)\]\(\/([^)#]+)/g, // [text](/path)
    /href="\/([^"#]+)/g, // href="/path"
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const pattern of linkPatterns) {
      let match;
      pattern.lastIndex = 0;

      while ((match = pattern.exec(line)) !== null) {
        const linkPath = match[pattern === linkPatterns[0] ? 2 : 1];

        // Skip external-looking paths and anchors
        if (linkPath.startsWith("http") || linkPath.startsWith("#")) continue;

        // Skip image paths
        if (linkPath.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) continue;

        // Check if file exists
        const possiblePaths = [
          path.join(DOCS_DIR, linkPath + ".mdx"),
          path.join(DOCS_DIR, linkPath, "index.mdx"),
          path.join(DOCS_DIR, linkPath),
        ];

        const exists = possiblePaths.some((p) => fs.existsSync(p));

        if (!exists) {
          issues.push(
            issue(i + 1, "link/broken-internal", `Possibly broken internal link: /${linkPath}`)
          );
        }
      }
    }
  }

  return issues;
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

function lintFile(filePath) {
  const fullPath = path.join(__dirname, "..", filePath);
  if (!fs.existsSync(fullPath)) {
    return [issue(0, "file/not-found", "File not found")];
  }

  const content = fs.readFileSync(fullPath, "utf-8");

  const issues = [
    ...checkFrontmatter(content, filePath),
    ...checkTitleCase(content, filePath),
    ...checkHeadingStructure(content, filePath),
    ...checkCodeBlocks(content, filePath),
    ...checkMintlifyComponents(content, filePath),
    ...checkAccessibility(content, filePath),
    ...checkInternalLinks(content, filePath),
  ];

  return issues.sort((a, b) => a.line - b.line);
}

// -----------------------------------------------------------------------------
// CLI
// -----------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = {
    target: "",
    filesFrom: null,
    format: "markdown",
    checkNav: false,
    diffRange: null,
  };

  for (const arg of argv) {
    if (arg.startsWith("--files-from=")) opts.filesFrom = arg.slice("--files-from=".length);
    else if (arg.startsWith("--format=")) opts.format = arg.slice("--format=".length);
    else if (arg === "--check-nav") opts.checkNav = true;
    else if (arg.startsWith("--diff-range=")) opts.diffRange = arg.slice("--diff-range=".length);
    else if (!arg.startsWith("--")) opts.target = arg;
  }

  return opts;
}

/** Read a newline-delimited path list, as produced by `git diff --name-only`. */
function readFileList(listPath) {
  if (!fs.existsSync(listPath)) {
    throw new Error(`--files-from list not found: ${listPath}`);
  }
  return fs
    .readFileSync(listPath, "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && isLintablePage(l));
}

/**
 * Line numbers a diff range touched, keyed by path.
 *
 * Used to scope reporting to new work: on a large existing corpus, a rule that is correct
 * but newly enforced would otherwise block every edit on debt the author did not create.
 */
function changedLinesByFile(diffRange) {
  const map = new Map();
  let output;
  try {
    output = execSync(`git diff --unified=0 --no-color ${diffRange}`, {
      encoding: "utf-8",
      cwd: REPO_ROOT,
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    throw new Error(`could not compute diff for ${diffRange}: ${err.message}`);
  }

  let current = null;
  for (const line of output.split("\n")) {
    const fileMatch = line.match(/^\+\+\+ b\/(.+)$/);
    if (fileMatch) {
      current = fileMatch[1];
      if (!map.has(current)) map.set(current, new Set());
      continue;
    }
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (hunk && current) {
      const start = Number(hunk[1]);
      const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
      const lines = map.get(current);
      for (let n = start; n < start + count; n++) lines.add(n);
      // A pure deletion (count 0) still marks the surrounding line as touched.
      if (count === 0) lines.add(start);
    }
  }
  return map;
}

function formatGithub(file, issue) {
  const level = issue.severity === "error" ? "error" : "warning";
  const line = Math.max(1, issue.line);
  // Annotation messages must be single-line.
  const message = `[${issue.rule}] ${issue.message}`.replace(/\n/g, " ");
  return `::${level} file=${file},line=${line},title=Docs style::${message}`;
}

function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);

  let files;
  let mode;
  if (opts.filesFrom) {
    files = readFileList(opts.filesFrom);
    mode = `--files-from=${opts.filesFrom}`;
  } else {
    ({ files, mode } = getFilesToCheck(opts.target));
  }

  const changed = opts.diffRange ? changedLinesByFile(opts.diffRange) : null;

  const errors = [];
  const warnings = [];
  const annotations = [];

  const record = (file, issue) => {
    // When scoped to a diff, only report issues on lines this change actually touched.
    // File-level issues (line 0/1) are kept for files the change added outright.
    if (changed) {
      const touched = changed.get(file);
      if (!touched || (touched.size > 0 && !touched.has(Math.max(1, issue.line)))) return;
    }
    const entry = `\`${file}:${issue.line}\` — [${issue.rule}] ${issue.message}`;
    if (issue.severity === "error") errors.push(entry);
    else warnings.push(entry);
    annotations.push(formatGithub(file, issue));
  };

  for (const file of files) {
    for (const issue of lintFile(file)) record(file, issue);
  }

  if (opts.checkNav) {
    const navPath = path.relative(REPO_ROOT, DOCS_JSON);
    for (const issue of checkNavTitles()) {
      // Navigation labels are not part of any single page's diff, so report them
      // unconditionally once navigation is in scope.
      const entry = `\`${navPath}:${issue.line}\` — [${issue.rule}] ${issue.message}`;
      if (issue.severity === "error") errors.push(entry);
      else warnings.push(entry);
      annotations.push(formatGithub(navPath, issue));
    }
  }

  if (opts.format === "github") {
    for (const annotation of annotations) console.log(annotation);
    console.log(
      `\nChecked ${files.length} file(s)${opts.checkNav ? " plus navigation titles" : ""}: ` +
        `${errors.length} error(s), ${warnings.length} warning(s).`
    );
    if (errors.length) {
      console.log("\nRules are documented in docs/content-guidelines.md.");
      console.log(
        "Brand and protocol terms that should not be title-cased belong in docs/.title-case-exceptions.txt."
      );
    }
    return errors.length > 0 ? 1 : 0;
  }

  console.log("## Lint Results\n");
  console.log(`### Files checked`);
  console.log(`- ${files.length} files (${mode})`);
  if (opts.checkNav) console.log(`- plus navigation titles in docs/docs.json`);
  if (changed) console.log(`- scoped to lines changed in ${opts.diffRange}`);
  console.log("");

  if (files.length === 0 && !opts.checkNav) {
    console.log(mode === "changed" ? "- No changed MDX files found\n" : "- No files to check\n");
    console.log("### ✅ Summary");
    console.log("- 0 files checked, 0 errors, 0 warnings");
    return 0;
  }

  if (errors.length > 0) {
    console.log("### ❌ Errors (must fix)");
    for (const e of errors) console.log(`- ${e}`);
    console.log("");
  }

  if (warnings.length > 0) {
    console.log("### ⚠️ Warnings (should fix)");
    for (const w of warnings) console.log(`- ${w}`);
    console.log("");
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log("### ✅ All checks passed\n");
  }

  console.log("### Summary");
  console.log(`- ${files.length} files checked, ${errors.length} errors, ${warnings.length} warnings`);

  return errors.length > 0 ? 1 : 0;
}

// Exported so tests and other tooling can reach individual rules.
module.exports = {
  RULES,
  isLintablePage,
  lintFile,
  main,
  parseArgs,
  checkFrontmatter,
  checkTitleCase,
  checkHeadingStructure,
  checkCodeBlocks,
  checkMintlifyComponents,
  checkAccessibility,
  checkInternalLinks,
  checkNavTitles,
  titleCaseViolations,
  collectCodeBlocks,
  changedLinesByFile,
};

if (require.main === module) {
  process.exit(main());
}
