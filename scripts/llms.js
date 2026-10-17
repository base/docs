#!/usr/bin/env node

/**
 * Generates docs/llms.txt and docs/llms-full.txt — the LLM-facing site files
 * defined by https://llmstxt.org.
 *
 * llms.txt        Navigation-aligned index. H1 = project name, blockquote
 *                 summary, H2 per top-level navigation tab, nested sidebar
 *                 groups, and a single `## Optional` for skippable extras
 *                 (MCP server, skills, full-context pointer).
 *
 * llms-full.txt   The full Markdown content of every page in the public
 *                 navigation, in navigation order, so an agent can load the
 *                 whole site in one request. Each page uses Mintlify's
 *                 llms-full.txt layout: `# Title`, `Source: <url>`, the
 *                 description, then the page body. Bodies are cleaned outside
 *                 code fences: frontmatter, ESM imports/exports, and MDX
 *                 comments are removed; imported .mdx snippets are inlined;
 *                 interactive .jsx demo components are dropped; root-relative
 *                 links are made absolute. Mintlify components (Card, Note,
 *                 Steps, ...) are kept, matching Mintlify's Markdown export.
 *                 Pages with `hidden: true` or `noindex: true` are skipped.
 *
 * Usage: node scripts/llms.js
 */

const fs = require('fs');
const path = require('path');
const {
  humanize,
  parseFrontmatter,
  loadNavigation,
  resolvePageFile,
  collectNavigationPages,
} = require('./lib/docs-utils');

const CONFIG = {
  docsDir: './docs',
  llmsFile: './docs/llms.txt',
  llmsFullFile: './docs/llms-full.txt',

  docsUrl: 'https://docs.base.org',
  mcpUrl: 'https://docs.base.org/mcp',
  skillsRepoUrl: 'https://github.com/base/skills',
  skillsInstallCmd: 'npx skills add base/base-skills',

  projectTitle: 'Base Documentation',
  fullProjectTitle: 'Base Documentation — Full Context',

  summary: 'Base is the blockchain for global finance: an Ethereum L2 built by Coinbase, with stablecoins, payments, tokenized assets, and compliance controls as native chain primitives. This index points AI assistants at the canonical page for each topic across Get Started, Build on Base, Specifications, SDKs & APIs, and Upgrades; follow the links for full context.',

  fullSummary: 'Full context for AI agents building on Base, the blockchain for global finance: an Ethereum L2 built by Coinbase. This file contains the full Markdown content of every page in the public documentation navigation, in navigation order. For a lightweight index of the same pages, use https://docs.base.org/llms.txt.',
};

// ---------- Navigation discovery ----------

function pageRecord(page) {
  const file = resolvePageFile(CONFIG.docsDir, page);
  if (!file) throw new Error(`Navigation references a missing page: ${page}`);

  const baseName = path.basename(file).replace(/\.mdx?$/, '');
  const { frontmatter } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
  const title = frontmatter.title
    ? String(frontmatter.title)
    : humanize(baseName);
  const description = frontmatter.description
    ? String(frontmatter.description).trim()
    : '';

  return {
    page,
    title,
    description,
    url: `${CONFIG.docsUrl}/${page}`,
  };
}

function discoverNavigationTabs() {
  const navigation = loadNavigation(CONFIG.docsDir);
  return (navigation.tabs || []).map((tab) => ({
    title: tab.tab,
    nodes: [...(tab.groups || []), ...(tab.pages || [])],
  }));
}

// ---------- Rendering ----------

function bulletFor(page) {
  return page.description
    ? `- [${page.title}](${page.url}): ${page.description}`
    : `- [${page.title}](${page.url})`;
}

function renderNavigationNode(node, level = 3) {
  if (typeof node === 'string') return bulletFor(pageRecord(node));
  if (!node || typeof node !== 'object') return '';

  const heading = `${'#'.repeat(level)} ${node.group || node.anchor}`;
  const children = [...(node.pages || []), ...(node.groups || [])]
    .map((child) => renderNavigationNode(child, level + 1))
    .filter(Boolean);
  return [heading, ...children].join('\n\n');
}

function renderNavigationTab(tab) {
  const children = tab.nodes
    .map((node) => renderNavigationNode(node))
    .filter(Boolean);
  return [`## ${tab.title}`, ...children].join('\n\n');
}

function renderOptionalSection() {
  return [
    `## Optional`,
    `- [Base MCP server](${CONFIG.mcpUrl}): Direct AI access to Base documentation`,
    `- [Base skills](${CONFIG.skillsRepoUrl}): Installable agent skills (\`${CONFIG.skillsInstallCmd}\`)`,
    `- [Full context (llms-full.txt)](${CONFIG.docsUrl}/llms-full.txt): Full Markdown content of every page`,
  ].join('\n');
}

function renderLlmsTxt(tabs) {
  const sectionBlocks = tabs.map(renderNavigationTab);

  return [
    `# ${CONFIG.projectTitle}`,
    `> ${CONFIG.summary}`,
    ...sectionBlocks,
    renderOptionalSection(),
  ].join('\n\n') + '\n';
}

// ---------- llms-full.txt: page content ----------

const FENCE_RE = /^\s*(`{3,}|~{3,})/;

/**
 * Splits markdown into alternating prose / fenced-code segments so cleanup
 * never touches code samples. Returns [{ code: boolean, text: string }].
 */
function splitFences(markdown) {
  const segments = [];
  let current = [];
  let fence = null;

  const flush = (code) => {
    if (current.length) segments.push({ code, text: current.join('\n') });
    current = [];
  };

  for (const line of markdown.split('\n')) {
    const m = line.match(FENCE_RE);
    if (!fence && m) {
      flush(false);
      fence = m[1];
      current.push(line);
    } else if (fence && m && m[1][0] === fence[0] && m[1].length >= fence.length && line.trim() === m[1]) {
      current.push(line);
      flush(true);
      fence = null;
    } else {
      current.push(line);
    }
  }
  flush(Boolean(fence));
  return segments;
}

/** Applies fn to prose segments only; code fences pass through unchanged. */
function mapProse(markdown, fn) {
  return splitFences(markdown)
    .map((seg) => (seg.code ? seg.text : fn(seg.text)))
    .join('\n');
}

const IMPORT_RE = /^import\s+(?:(\w+)|\{([^}]*)\})\s+from\s+['"]([^'"]+)['"];?[ \t]*$/gm;

/** Collects ESM imports from prose: { name -> source path }. */
function collectImports(markdown) {
  const imports = {};
  mapProse(markdown, (text) => {
    for (const m of text.matchAll(IMPORT_RE)) {
      const names = m[1] ? [m[1]] : m[2].split(',').map((n) => n.trim().split(/\s+as\s+/).pop()).filter(Boolean);
      for (const name of names) imports[name] = m[3];
    }
    return text;
  });
  return imports;
}

/** Removes a self-closing `<Name ... />` tag (props may span lines), replacing it via fn. */
function replaceSelfClosing(text, name, fn) {
  const re = new RegExp(`<${name}(?:\\s(?:[^>]|=>)*?)?\\s*\\/>`, 'g');
  return text.replace(re, fn);
}

function absolutizeLinks(text, docsUrl) {
  return text
    .replace(/\]\(\/(?!\/)/g, `](${docsUrl}/`)
    .replace(/\b(href|src)=(["'])\/(?!\/)/g, `$1=$2${docsUrl}/`);
}

/**
 * Cleans one MDX body for llms-full.txt. `loadSnippet(path)` returns the raw
 * contents of an imported .mdx snippet (path as written in the import).
 */
function cleanMdxBody(body, { docsUrl, loadSnippet, seen = new Set() }) {
  const imports = collectImports(body);

  let out = mapProse(body, (text) => {
    let t = text
      .replace(IMPORT_RE, '')
      .replace(/^export\s+const\s+[\s\S]*?^(?:\};?|\);?)[ \t]*$/gm, '')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

    for (const [name, source] of Object.entries(imports)) {
      if (source.endsWith('.mdx') || source.endsWith('.md')) {
        t = replaceSelfClosing(t, name, () => {
          if (seen.has(source)) throw new Error(`Snippet import cycle: ${source}`);
          const { body: snippetBody } = parseFrontmatter(loadSnippet(source));
          const nested = new Set(seen).add(source);
          return cleanMdxBody(snippetBody, { docsUrl, loadSnippet, seen: nested });
        });
      } else if (/\.(jsx|tsx|js|ts)$/.test(source)) {
        t = replaceSelfClosing(t, name, () => '');
      }
    }
    return absolutizeLinks(t, docsUrl);
  });

  return out.replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, '\n\n').trim();
}

function loadSnippetFromDocs(source) {
  const file = path.join(CONFIG.docsDir, source.replace(/^\//, ''));
  if (!fs.existsSync(file)) throw new Error(`Imported snippet is missing: ${source}`);
  return fs.readFileSync(file, 'utf8');
}

function renderPageFull(page) {
  const file = resolvePageFile(CONFIG.docsDir, page);
  if (!file) throw new Error(`Navigation references a missing page: ${page}`);
  const { frontmatter, body } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
  if (frontmatter.hidden === true || frontmatter.noindex === true) return '';

  const record = pageRecord(page);
  const content = cleanMdxBody(body, {
    docsUrl: CONFIG.docsUrl,
    loadSnippet: loadSnippetFromDocs,
  });

  return [
    `# ${record.title}`,
    `Source: ${record.url}`,
    record.description,
    content,
  ].filter(Boolean).join('\n\n');
}

function renderLlmsFullTxt(tabs) {
  const pages = [...new Set(collectNavigationPages(tabs.flatMap((tab) => tab.nodes)))];
  const sections = pages.map(renderPageFull).filter(Boolean);

  return [
    `# ${CONFIG.fullProjectTitle}`,
    `> ${CONFIG.fullSummary}`,
    `Also available: the [Base MCP server](${CONFIG.mcpUrl}) for direct AI access to these docs, and [Base skills](${CONFIG.skillsRepoUrl}) (\`${CONFIG.skillsInstallCmd}\`).`,
    ...sections,
  ].join('\n\n') + '\n';
}

// ---------- Entry point ----------

function generate() {
  const tabs = discoverNavigationTabs();
  const pageCount = collectNavigationPages(tabs.flatMap((tab) => tab.nodes)).length;

  const llms = renderLlmsTxt(tabs);
  fs.writeFileSync(CONFIG.llmsFile, llms);

  const llmsFull = renderLlmsFullTxt(tabs);
  fs.writeFileSync(CONFIG.llmsFullFile, llmsFull);

  const sizeKb = (n) => (Buffer.byteLength(n, 'utf8') / 1024).toFixed(2);

  console.log(`Generated: ${CONFIG.llmsFile} (${sizeKb(llms)} KB)`);
  console.log(`Generated: ${CONFIG.llmsFullFile} (${sizeKb(llmsFull)} KB)`);
  console.log(`Tabs: ${tabs.length}, pages: ${pageCount}`);
  console.log('');
  console.log(`Review changes with: git diff ${CONFIG.llmsFile} ${CONFIG.llmsFullFile}`);
}

module.exports = { splitFences, cleanMdxBody, absolutizeLinks };

if (require.main === module) generate();
