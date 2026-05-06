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

const CONFIG = {
  docsDir: './docs',
  outputFile: './docs/agents.md',

  // The only hardcoded external references allowed.
  docsUrl: 'https://docs.base.org',
  mcpUrl: 'https://docs.base.org/mcp',
  skillsRepoUrl: 'https://github.com/base/skills',
  skillsInstallCmd: 'npx skills add base/base-skills',

  // Acronyms preserved as upper-case when humanizing directory names.
  acronyms: new Set(['AI', 'MCP', 'API', 'SDK', 'L2', 'EVM', 'NFT', 'DAO', 'P2P', 'RPC']),

  // Files searched (in order) for a section's description. Looked up directly
  // inside the section dir; if none match, the script falls back to the first
  // file inside <section>/quickstart/.
  sectionIndexFiles: ['index.mdx', 'index.md', 'overview.mdx', 'overview.md'],
  sectionFallbackDirs: ['quickstart'],

  skipFiles: [
    'README.md', 'CHANGELOG.md', 'LICENSE.md', '.DS_Store',
    'docs.json', 'package-lock.json', 'llms.txt', 'llms-full.txt',
    'iframe-theme.js', 'style.css', 'instructions.md', 'writing.md', 'CLAUDE.md'
  ],

  skipFilePatterns: [/-vid$/, /-video$/, /-sbs$/],

  skipDirs: [
    'node_modules', '.git', 'dist', 'build', 'coverage',
    '.next', 'images', 'videos', 'logo', 'openapi', '.claude', 'snippets'
  ],

  extensions: ['.md', '.mdx']
};

function humanize(name) {
  const cleaned = name.replace(/^\d+-/, '');
  return cleaned.split('-').map(word => {
    if (!word) return '';
    const upper = word.toUpperCase();
    if (CONFIG.acronyms.has(upper)) return upper;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

function stripNumericPrefixes(relPath) {
  return relPath.split('/').map(seg => seg.replace(/^\d+-/, '')).join('/');
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };

  const fm = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if (/^-?\d+$/.test(value)) value = Number(value);
    fm[m[1]] = value;
  }
  return { frontmatter: fm, body: match[2] };
}

function loadMintIgnore(mintignorePath) {
  const ignored = { dirs: new Set(), files: new Set(), bareFiles: new Set() };
  if (!fs.existsSync(mintignorePath)) return ignored;

  for (const line of fs.readFileSync(mintignorePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (trimmed.endsWith('/*')) {
      ignored.dirs.add(trimmed.slice(1, -2));
    } else if (trimmed.startsWith('/')) {
      ignored.files.add(trimmed.slice(1));
    } else {
      ignored.bareFiles.add(trimmed.replace(/\.mdx?$/, ''));
    }
  }
  return ignored;
}

function descriptionFromFile(file) {
  if (!fs.existsSync(file)) return '';
  const { frontmatter } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
  return frontmatter.description ? String(frontmatter.description).trim() : '';
}

function firstDocFileIn(dir) {
  if (!fs.existsSync(dir)) return '';
  const candidates = fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isFile()
      && CONFIG.extensions.includes(path.extname(e.name).toLowerCase())
      && !CONFIG.skipFiles.includes(e.name))
    .map(e => e.name)
    .sort();
  return candidates.length ? path.join(dir, candidates[0]) : '';
}

function readSectionDescription(sectionDir) {
  // 1. Section-level index/overview file
  for (const candidate of CONFIG.sectionIndexFiles) {
    const desc = descriptionFromFile(path.join(sectionDir, candidate));
    if (desc) return desc;
  }
  // 2. First file inside a known fallback subdir (e.g. quickstart/)
  for (const sub of CONFIG.sectionFallbackDirs) {
    const first = firstDocFileIn(path.join(sectionDir, sub));
    if (first) {
      const desc = descriptionFromFile(first);
      if (desc) return desc;
    }
  }
  return '';
}

function discoverTopLevelSections() {
  if (!fs.existsSync(CONFIG.docsDir)) return [];
  return fs.readdirSync(CONFIG.docsDir, { withFileTypes: true })
    .filter(e => e.isDirectory()
      && !CONFIG.skipDirs.includes(e.name)
      && !e.name.startsWith('.'))
    .map(e => {
      const cleanName = e.name.replace(/^\d+-/, '');
      return {
        slug: cleanName,
        title: humanize(e.name),
        description: readSectionDescription(path.join(CONFIG.docsDir, e.name)),
        llmsPath: `./${cleanName}/llms.txt`,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

function walkDocFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    if (CONFIG.skipFiles.includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (CONFIG.skipDirs.includes(entry.name)) continue;
      walkDocFiles(full, results);
    } else if (CONFIG.extensions.includes(path.extname(entry.name).toLowerCase())) {
      results.push(full);
    }
  }
  return results;
}

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
    if (CONFIG.skipFiles.includes(entry.name) || entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (CONFIG.skipDirs.includes(entry.name)) continue;
      Object.assign(index, scanDocs(fullPath, basePath ? `${basePath}/${entry.name}` : entry.name, ignored));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (!CONFIG.extensions.includes(ext)) continue;
      const baseName = entry.name.replace(/\.mdx?$/, '');
      if (CONFIG.skipFilePatterns.some(p => p.test(baseName))) continue;
      if (ignored.bareFiles.has(baseName)) continue;
      if (ignored.files.has(basePath ? `${basePath}/${baseName}` : baseName)) continue;
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
    return `- [${s.title}](${s.llmsPath})${desc}`;
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

  const sections = discoverTopLevelSections();
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
