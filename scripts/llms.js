#!/usr/bin/env node

/**
 * Generates docs/llms.txt and docs/llms-full.txt — the LLM-facing site indexes
 * defined by https://llmstxt.org.
 *
 * llms.txt        Navigation-aligned index. H1 = project name, blockquote
 *                 summary, H2 per top-level navigation tab, nested sidebar
 *                 groups, and a single `## Optional` for skippable extras
 *                 (MCP server, skills, full-context pointer).
 *
 * llms-full.txt   Spec-aligned but with two regions:
 *                   - LLMS_EXTRAS markers wrap hand-written cross-cutting
 *                     guides (auth, networks, errors, etc.). The script reads
 *                     and re-emits this region verbatim.
 *                   - LLMS_AUTOGEN markers wrap the navigation page index.
 *                     Always regenerated from docs/docs.json.
 *                 First-run migration: if no markers are found in the existing
 *                 file, everything after the first blockquote is captured as
 *                 extras so hand-written content survives.
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
  skillsInstallCmd: 'npx skills add base/skills --skill base-mcp',

  projectTitle: 'Base Documentation',
  fullProjectTitle: 'Base Documentation — Full Context',

  summary: "Build on Base — Coinbase's Ethereum L2. Smart Wallet, OnchainKit, MiniKit, Base Chain RPCs, and AI Agents. This index points AI assistants at the canonical page for each topic; follow the links for full context.",

  fullSummary: "Full context for AI agents working with Base. Cross-cutting concept guides (networks, auth, errors, rate limits) sit above an index of every page in the public documentation navigation. Follow page URLs for source content.",

  extrasStartMarker: '<!-- LLMS_EXTRAS_START -->',
  extrasEndMarker: '<!-- LLMS_EXTRAS_END -->',
  autogenStartMarker: '<!-- LLMS_AUTOGEN_START -->',
  autogenEndMarker: '<!-- LLMS_AUTOGEN_END -->',
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

function renderOptionalSection(includeFullPointer) {
  const bullets = [
    `- [Base MCP server](${CONFIG.mcpUrl}): Direct AI access to Base documentation`,
    `- [Base skills](${CONFIG.skillsRepoUrl}): Installable agent skills (\`${CONFIG.skillsInstallCmd}\`)`,
  ];
  if (includeFullPointer) {
    bullets.push(`- [Full context (llms-full.txt)](${CONFIG.docsUrl}/llms-full.txt): Same index plus cross-cutting concept guides`);
  } else {
    bullets.push(`- [Index (llms.txt)](${CONFIG.docsUrl}/llms.txt): Navigation index without the full-context extras`);
  }
  return [`## Optional`, ...bullets].join('\n');
}

function renderLlmsTxt(tabs) {
  const sectionBlocks = tabs.map(renderNavigationTab);

  return [
    `# ${CONFIG.projectTitle}`,
    `> ${CONFIG.summary}`,
    ...sectionBlocks,
    renderOptionalSection(true),
  ].join('\n\n') + '\n';
}

function renderAutogenBody(tabs) {
  const sectionBlocks = tabs.map(renderNavigationTab);
  return [...sectionBlocks, renderOptionalSection(false)].join('\n\n');
}

// ---------- llms-full.txt: extras preservation ----------

/**
 * Returns the verbatim bytes between EXTRAS markers in the existing file.
 * If markers are missing, falls back to "everything after the first blockquote
 * and before the AUTOGEN region" so hand-written content survives the first run.
 * Returns '' if there's nothing to preserve.
 */
function extractExtras(existing) {
  if (!existing) return '';

  const startIdx = existing.indexOf(CONFIG.extrasStartMarker);
  const endIdx = existing.indexOf(CONFIG.extrasEndMarker);
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const inner = existing.slice(startIdx + CONFIG.extrasStartMarker.length, endIdx);
    return inner.trim();
  }

  // Migration path: take everything after the first blockquote up to the
  // AUTOGEN start marker (or EOF).
  const blockquoteMatch = existing.match(/^>[^\n]*(\n>[^\n]*)*\n+/m);
  if (!blockquoteMatch) return existing.trim();
  const afterBlockquote = existing.slice(blockquoteMatch.index + blockquoteMatch[0].length);
  const autogenIdx = afterBlockquote.indexOf(CONFIG.autogenStartMarker);
  const sliced = autogenIdx === -1 ? afterBlockquote : afterBlockquote.slice(0, autogenIdx);
  return sliced.trim();
}

function renderLlmsFullTxt(existing, tabs) {
  const extras = extractExtras(existing);
  const autogenBody = renderAutogenBody(tabs);

  const extrasBlock = [
    CONFIG.extrasStartMarker,
    extras || '<!-- Add hand-written cross-cutting guides here. This region is preserved on regeneration. -->',
    CONFIG.extrasEndMarker,
  ].join('\n\n');

  const autogenBlock = [
    CONFIG.autogenStartMarker,
    autogenBody,
    CONFIG.autogenEndMarker,
  ].join('\n\n');

  return [
    `# ${CONFIG.fullProjectTitle}`,
    `> ${CONFIG.fullSummary}`,
    extrasBlock,
    autogenBlock,
  ].join('\n\n') + '\n';
}

// ---------- Entry point ----------

function generate() {
  const tabs = discoverNavigationTabs();
  const pageCount = collectNavigationPages(tabs.flatMap((tab) => tab.nodes)).length;

  const llms = renderLlmsTxt(tabs);
  fs.writeFileSync(CONFIG.llmsFile, llms);

  const existingFull = fs.existsSync(CONFIG.llmsFullFile)
    ? fs.readFileSync(CONFIG.llmsFullFile, 'utf8')
    : '';
  const llmsFull = renderLlmsFullTxt(existingFull, tabs);
  fs.writeFileSync(CONFIG.llmsFullFile, llmsFull);

  const sizeKb = (n) => (Buffer.byteLength(n, 'utf8') / 1024).toFixed(2);

  console.log(`Generated: ${CONFIG.llmsFile} (${sizeKb(llms)} KB)`);
  console.log(`Generated: ${CONFIG.llmsFullFile} (${sizeKb(llmsFull)} KB)`);
  console.log(`Tabs: ${tabs.length}, pages: ${pageCount}`);
  console.log('');
  console.log(`Review changes with: git diff ${CONFIG.llmsFile} ${CONFIG.llmsFullFile}`);
}

generate();
