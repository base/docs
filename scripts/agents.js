#!/usr/bin/env node

/**
 * Generates docs/AGENTS.md — a human-readable LLM entry point followed by a
 * compact, minified index aligned with the public documentation sidebar.
 *
 * Pipeline:
 *   1. discoverNavigationTabs — reads docs.json and uses its tab/group/page
 *      hierarchy as the source of truth for public documentation organization.
 *   2. discoverFeaturedPages — walks all .md/.mdx files, collecting pages
 *      whose frontmatter has `featured: true`.
 *   3. generateAgentsMd — assembles frontmatter + LLM entry point + tools +
 *      featured pages + compact index, writes to docs/AGENTS.md.
 *
 * Hardcoded values (per spec): docs URL, MCP URL, skills repo URL/install cmd.
 * Everything else is derived from the repo at run time.
 *
 * To surface a page under "Recommended starting points", add to its frontmatter:
 *   featured: true
 *   order: 10        # optional sort key (lower = earlier)
 *
 * Usage: node scripts/agents.js
 */

const fs = require('fs');
const path = require('path');
const {
  humanize,
  stripNumericPrefixes,
  parseFrontmatter,
  loadNavigation,
  collectNavigationPages,
  resolvePageFile,
  walkDocFiles,
} = require('./lib/docs-utils');

const CONFIG = {
  docsDir: './docs',
  outputFile: './docs/AGENTS.md',

  // The only hardcoded external references allowed.
  docsUrl: 'https://docs.base.org',
  mcpUrl: 'https://docs.base.org/mcp',
  skillsRepoUrl: 'https://github.com/base/skills',
  skillsInstallCmd: 'npx skills add base/base-skills',
};

function discoverFeaturedPages() {
  const featured = [];
  for (const file of walkDocFiles(CONFIG.docsDir)) {
    const { frontmatter } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
    if (frontmatter.featured !== true) continue;

    const relWithExt = path.relative(CONFIG.docsDir, file).replace(/\\/g, '/');
    const rel = stripNumericPrefixes(relWithExt.replace(/\.mdx?$/, ''));
    const title = frontmatter.title
      ? String(frontmatter.title)
      : humanize(path.basename(file, path.extname(file)));
    featured.push({
      title,
      url: `${CONFIG.docsUrl}/${rel}`,
      order: typeof frontmatter.order === 'number' ? frontmatter.order : 9999,
    });
  }
  return featured.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

function discoverNavigationTabs() {
  const navigation = loadNavigation(CONFIG.docsDir);
  return (navigation.tabs || []).map((tab) => ({
    title: tab.tab,
    nodes: [...(tab.groups || []), ...(tab.pages || [])],
  }));
}

function pageMetadata(page) {
  const file = resolvePageFile(CONFIG.docsDir, page);
  if (!file) throw new Error(`Navigation references a missing page: ${page}`);
  const { frontmatter } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
  return {
    url: `${CONFIG.docsUrl}/${page}`,
    description: frontmatter.description ? String(frontmatter.description).trim() : '',
  };
}

function buildEntryPointSection(tabs) {
  const bullets = tabs.map((tab) => {
    const firstPage = collectNavigationPages(tab.nodes)[0];
    if (!firstPage) throw new Error(`Navigation tab has no pages: ${tab.title}`);
    const { url, description } = pageMetadata(firstPage);
    const desc = description ? ` — ${description}` : '';
    return `- [${tab.title}](${url})${desc}`;
  }).join('\n');

  return `## Base Documentation — LLM Entry Point

> High-signal index of the public documentation tabs. Jump to each tab's primary page for concise intros, curated links, and fast navigation.

${bullets}`;
}

function collectNavigationIndexEntries(nodes, trail, entries) {
  const directPages = nodes.filter((node) => typeof node === 'string');
  if (directPages.length) entries.push(`|${trail.join('/')}:${directPages.join(',')}`);

  for (const node of nodes) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) continue;
    const label = node.group || node.anchor;
    if (!label) continue;
    collectNavigationIndexEntries(
      [...(node.pages || []), ...(node.groups || [])],
      [...trail, label],
      entries,
    );
  }
}

function buildNavigationIndex(tabs) {
  const entries = [];
  for (const tab of tabs) collectNavigationIndexEntries(tab.nodes, [tab.title], entries);
  return `[Docs Navigation]\n${entries.join('\n')}`;
}

function buildToolsSection() {
  return `## Tools Available for AI Assistants

These resources give AI assistants direct access to Base documentation and reusable workflows.

### Base MCP Server

\`${CONFIG.mcpUrl}\`

### Base Skills

AI agents can use Base skills to perform onchain actions directly from their tool loop — no custom integration required. Available skills include:

[${CONFIG.skillsRepoUrl}](${CONFIG.skillsRepoUrl})

Install Base skills for your AI assistant:

\`\`\`
${CONFIG.skillsInstallCmd}
\`\`\``;
}

function buildFeaturedSection(featured) {
  if (featured.length === 0) return '';
  const bullets = featured.map(f => `- [${f.title}](${f.url})`).join('\n');
  return `## Recommended starting points

Narrow context to a specific type of work:

${bullets}`;
}

function generateAgentsMd() {
  const tabs = discoverNavigationTabs();

  // Frontmatter description rules: ≤200 chars, action-oriented, complete
  // sentences, no "you can"/"users can"/"this page explains", includes
  // "with [tool]" scoping, no colons in value, plain text, no versions,
  // avoid "teaching"/"enable"/"disable".
  const description = 'Look up Base documentation with a compact sidebar-aligned index built for AI coding agents. Lists every navigation page in its public documentation hierarchy.';
  if (description.length > 200) {
    throw new Error(`agents.md description exceeds 200 chars (${description.length})`);
  }

  const featured = discoverFeaturedPages();

  const blocks = [
    `# ${CONFIG.docsUrl}/llms.txt`,
    buildEntryPointSection(tabs),
    buildToolsSection(),
    buildFeaturedSection(featured),
    `## Compact Docs Index\n\n${buildNavigationIndex(tabs)}`,
  ].filter(Boolean);

  const content = `---
title: Base Docs Index
description: ${description}
---
${blocks.join('\n\n')}
`;

  fs.writeFileSync(CONFIG.outputFile, content);

  const size = Buffer.byteLength(content, 'utf8');
  console.log(`Generated: ${CONFIG.outputFile}`);
  console.log(`Size: ${(size / 1024).toFixed(2)} KB`);
  console.log(`Tabs: ${tabs.length}`);
  console.log(`Featured pages: ${featured.length}`);
  console.log(`Index entries: ${buildNavigationIndex(tabs).split('\n').length - 1} navigation groups`);
  console.log('');
  console.log(`A new ${CONFIG.outputFile} has been generated. Review changes with: git diff ${CONFIG.outputFile}`);
}

generateAgentsMd();
