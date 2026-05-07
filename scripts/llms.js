#!/usr/bin/env node

/**
 * Generates docs/llms.txt and docs/llms-full.txt — the LLM-facing site indexes
 * defined by https://llmstxt.org.
 *
 * llms.txt        Strict-spec index. H1 = project name, blockquote summary,
 *                 H2 per top-level section with `- [title](url): description`
 *                 bullets, and a single `## Optional` for skippable extras
 *                 (MCP server, skills, full-context pointer).
 *
 * llms-full.txt   Spec-aligned but with two regions:
 *                   - LLMS_EXTRAS markers wrap hand-written cross-cutting
 *                     guides (auth, networks, errors, etc.). The script reads
 *                     and re-emits this region verbatim.
 *                   - LLMS_AUTOGEN markers wrap the per-page index. Always
 *                     regenerated from the current docs/ tree.
 *                 First-run migration: if no markers are found in the existing
 *                 file, everything after the first blockquote is captured as
 *                 extras so hand-written content survives.
 *
 * Usage: node scripts/llms.js
 */

const fs = require('fs');
const path = require('path');
const {
  CONSTANTS,
  humanize,
  stripNumericPrefixes,
  parseFrontmatter,
  loadMintIgnore,
  walkDocFiles,
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

  summary: "Build on Base — Coinbase's Ethereum L2. Smart Wallet, OnchainKit, MiniKit, Base Chain RPCs, and AI Agents. This index points AI assistants at the canonical page for each topic; follow the links for full context.",

  fullSummary: "Full context for AI agents working with Base. Cross-cutting concept guides (networks, auth, errors, rate limits) sit above an exhaustive per-page index of every documentation file. Follow page URLs for source content.",

  // Canonical display order for top-level sections. Unknown sections appear
  // after these in alphabetical order.
  sectionOrder: ['get-started', 'base-chain', 'base-account', 'ai-agents', 'apps'],

  // Frontmatter keys whose truthy value excludes a page from llms output.
  hiddenFrontmatterKeys: ['hidden', 'draft'],

  extrasStartMarker: '<!-- LLMS_EXTRAS_START -->',
  extrasEndMarker: '<!-- LLMS_EXTRAS_END -->',
  autogenStartMarker: '<!-- LLMS_AUTOGEN_START -->',
  autogenEndMarker: '<!-- LLMS_AUTOGEN_END -->',
};

// ---------- Page discovery ----------

function isHidden(frontmatter) {
  return CONFIG.hiddenFrontmatterKeys.some(k => frontmatter[k] === true);
}

function pageRecord(absPath) {
  const rel = path.relative(CONFIG.docsDir, absPath).replace(/\\/g, '/');
  const baseName = path.basename(rel).replace(/\.mdx?$/, '');
  if (CONSTANTS.skipFilePatterns.some(p => p.test(baseName))) return null;

  const { frontmatter } = parseFrontmatter(fs.readFileSync(absPath, 'utf8'));
  if (isHidden(frontmatter)) return null;

  const cleanRel = stripNumericPrefixes(rel.replace(/\.mdx?$/, ''));
  const segments = cleanRel.split('/');
  const section = segments[0];
  const subPath = segments.slice(1).join('/');

  const title = frontmatter.title
    ? String(frontmatter.title)
    : humanize(baseName);
  const description = frontmatter.description
    ? String(frontmatter.description).trim()
    : '';

  return {
    section,
    subPath,
    cleanRel,
    title,
    description,
    url: `${CONFIG.docsUrl}/${cleanRel}`,
    isIndex: /^(index|overview)$/i.test(baseName),
  };
}

function discoverPages(ignored) {
  const pages = [];
  for (const file of walkDocFiles(CONFIG.docsDir)) {
    const rel = path.relative(CONFIG.docsDir, file).replace(/\\/g, '/');
    const baseName = path.basename(rel).replace(/\.mdx?$/, '');
    const dirPath = path.dirname(rel);
    const dirSegments = dirPath === '.' ? [] : dirPath.split('/');
    if (ignored.bareFiles.has(baseName)) continue;
    if (ignored.files.has(rel.replace(/\.mdx?$/, ''))) continue;
    if (dirSegments.some(seg => ignored.dirs.has(seg))) continue;

    // Top-level files (no parent section) are skipped — llms*.txt indexes
    // describe sectioned docs, not root-level meta files like agents.md.
    if (dirSegments.length === 0) continue;

    const record = pageRecord(file);
    if (record) pages.push(record);
  }
  return pages;
}

function groupBySection(pages) {
  const groups = new Map();
  for (const page of pages) {
    if (!groups.has(page.section)) groups.set(page.section, []);
    groups.get(page.section).push(page);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => {
      // Section index/overview first, then alphabetical by subPath.
      if (a.isIndex !== b.isIndex) return a.isIndex ? -1 : 1;
      return a.subPath.localeCompare(b.subPath);
    });
  }
  return groups;
}

function orderedSectionEntries(groups) {
  const order = new Map(CONFIG.sectionOrder.map((s, i) => [s, i]));
  return [...groups.entries()].sort(([a], [b]) => {
    const ai = order.has(a) ? order.get(a) : 1000;
    const bi = order.has(b) ? order.get(b) : 1000;
    if (ai !== bi) return ai - bi;
    return a.localeCompare(b);
  });
}

// ---------- Rendering ----------

function bulletFor(page) {
  return page.description
    ? `- [${page.title}](${page.url}): ${page.description}`
    : `- [${page.title}](${page.url})`;
}

function renderSection(sectionSlug, pages) {
  const heading = humanize(sectionSlug);
  const lines = [`## ${heading}`, ...pages.map(bulletFor)];
  return lines.join('\n');
}

function renderOptionalSection(includeFullPointer) {
  const bullets = [
    `- [Base MCP server](${CONFIG.mcpUrl}): Direct AI access to Base documentation`,
    `- [Base skills](${CONFIG.skillsRepoUrl}): Installable agent skills (\`${CONFIG.skillsInstallCmd}\`)`,
  ];
  if (includeFullPointer) {
    bullets.push(`- [Full context (llms-full.txt)](${CONFIG.docsUrl}/llms-full.txt): Same index plus cross-cutting concept guides`);
  } else {
    bullets.push(`- [Index (llms.txt)](${CONFIG.docsUrl}/llms.txt): Strict-spec section index without the full-context extras`);
  }
  return [`## Optional`, ...bullets].join('\n');
}

function renderLlmsTxt(groups) {
  const sectionBlocks = orderedSectionEntries(groups)
    .map(([slug, pages]) => renderSection(slug, pages));

  return [
    `# ${CONFIG.projectTitle}`,
    `> ${CONFIG.summary}`,
    ...sectionBlocks,
    renderOptionalSection(true),
  ].join('\n\n') + '\n';
}

function renderAutogenBody(groups) {
  const sectionBlocks = orderedSectionEntries(groups)
    .map(([slug, pages]) => renderSection(slug, pages));
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

function renderLlmsFullTxt(existing, groups) {
  const extras = extractExtras(existing);
  const autogenBody = renderAutogenBody(groups);

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
  const ignored = loadMintIgnore(`${CONFIG.docsDir}/.mintignore`);
  const pages = discoverPages(ignored);
  const groups = groupBySection(pages);

  const llms = renderLlmsTxt(groups);
  fs.writeFileSync(CONFIG.llmsFile, llms);

  const existingFull = fs.existsSync(CONFIG.llmsFullFile)
    ? fs.readFileSync(CONFIG.llmsFullFile, 'utf8')
    : '';
  const llmsFull = renderLlmsFullTxt(existingFull, groups);
  fs.writeFileSync(CONFIG.llmsFullFile, llmsFull);

  const sectionCount = groups.size;
  const sizeKb = (n) => (Buffer.byteLength(n, 'utf8') / 1024).toFixed(2);

  console.log(`Generated: ${CONFIG.llmsFile} (${sizeKb(llms)} KB)`);
  console.log(`Generated: ${CONFIG.llmsFullFile} (${sizeKb(llmsFull)} KB)`);
  console.log(`Sections: ${sectionCount}, pages: ${pages.length}`);
  console.log('');
  console.log(`Review changes with: git diff ${CONFIG.llmsFile} ${CONFIG.llmsFullFile}`);
}

generate();
