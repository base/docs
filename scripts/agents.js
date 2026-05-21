#!/usr/bin/env node

/**
 * Generates docs/agents.md — a human-readable LLM entry point followed by a
 * compact, minified directory index of all documentation files.
 *
 * Pipeline:
 *   1. loadMintIgnore — reads docs/.mintignore (gitignore-style) to skip files.
 *   2. discoverTopLevelSections — scans top-level dirs in docs/, humanizes names
 *      (with acronym handling), pulls each section's description from its
 *      index.{md,mdx} or overview.{md,mdx} frontmatter.
 *   3. discoverFeaturedPages — walks all .md/.mdx files, collects pages whose
 *      frontmatter has `featured: true`. Used to build the "Recommended
 *      starting points" section. Section is omitted if no flagged pages exist.
 *   4. scanDocs — recursively groups .md/.mdx files by parent directory for
 *      the compact pipe-delimited index at the bottom of the file.
 *   5. generateAgentsMd — assembles frontmatter + LLM entry point + tools +
 *      featured pages + compact index, writes to docs/agents.md.
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
  CONSTANTS,
  humanize,
  stripNumericPrefixes,
  parseFrontmatter,
  loadMintIgnore,
  discoverTopLevelSections,
  walkDocFiles,
} = require('./lib/docs-utils');

const CONFIG = {
  docsDir: './docs',
  outputFile: './docs/agents.md',

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

function scanDocs(dir, basePath = '', ignored) {
  const index = {};
  if (!fs.existsSync(dir)) return index;

  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (CONSTANTS.skipFiles.includes(entry.name) || entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (CONSTANTS.skipDirs.includes(entry.name)) continue;
      Object.assign(index, scanDocs(fullPath, basePath ? `${basePath}/${entry.name}` : entry.name, ignored));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (!CONSTANTS.extensions.includes(ext)) continue;
      const baseName = entry.name.replace(/\.mdx?$/, '');
      if (CONSTANTS.skipFilePatterns.some(p => p.test(baseName))) continue;
      if (ignored.bareFiles.has(baseName)) continue;
      if (ignored.files.has(basePath ? `${basePath}/${baseName}` : baseName)) continue;
      const { frontmatter } = parseFrontmatter(fs.readFileSync(fullPath, 'utf8'));
      if (frontmatter.hidden === true || frontmatter.draft === true) continue;
      files.push(baseName);
    }
  }

  if (files.length > 0 && !ignored.dirs.has(basePath)) {
    const key = (basePath || 'root').replace(/\/?\d+-/g, '/').replace(/^\//, '');
    index[key] = files;
  }
  return index;
}

function buildEntryPointSection(sections) {
  const bullets = sections.map(s => {
    const desc = s.description ? ` — ${s.description}` : '';
    const llmsPath = `./${s.slug}/llms.txt`;
    return `- [${s.title}](${llmsPath})${desc}`;
  }).join('\n');

  return `## Base Documentation — LLM Entry Point

> High-signal index of section guides. Jump to a section's llms.txt for concise intros, curated links, and fast navigation.

${bullets}`;
}

function buildToolsSection() {
  return `## Tools available for AI assistants

These resources give AI assistants direct access to Base documentation and reusable workflows.

### Base MCP server

\`${CONFIG.mcpUrl}\`

### Base skills

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
  const ignored = loadMintIgnore(`${CONFIG.docsDir}/.mintignore`);
  const index = scanDocs(CONFIG.docsDir, '', ignored);

  const indexLines = Object.entries(index)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dir, files]) => `|${dir}:${files.join(',')}`);

  // Frontmatter description rules: ≤200 chars, action-oriented, complete
  // sentences, no "you can"/"users can"/"this page explains", includes
  // "with [tool]" scoping, no colons in value, plain text, no versions,
  // avoid "teaching"/"enable"/"disable".
  const description = 'Look up Base documentation with a compact directory-grouped index built for AI coding agents. Lists every markdown page by parent directory so agents find context before generating code.';
  if (description.length > 200) {
    throw new Error(`agents.md description exceeds 200 chars (${description.length})`);
  }

  const sections = discoverTopLevelSections(CONFIG.docsDir);
  const featured = discoverFeaturedPages();

  const blocks = [
    `# ${CONFIG.docsUrl}/llms.txt`,
    buildEntryPointSection(sections),
    buildToolsSection(),
    buildFeaturedSection(featured),
    `## Compact docs index\n\n[Docs]|root:./docs\n${indexLines.join('\n')}`,
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
  console.log(`Sections: ${sections.length}`);
  console.log(`Featured pages: ${featured.length}`);
  console.log(`Index entries: ${indexLines.length} directories`);
  console.log('');
  console.log(`A new ${CONFIG.outputFile} has been generated. Review changes with: git diff ${CONFIG.outputFile}`);
}

generateAgentsMd();
