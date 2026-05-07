/**
 * Shared primitives for docs-tree generators (agents.js, llms.js).
 *
 * Pure helpers + a base CONSTANTS object with the file/dir skiplists, file
 * extensions, acronym set, and section-discovery fallback lists. Each generator
 * imports CONSTANTS and the helpers it needs; generator-specific config (output
 * paths, hardcoded URLs, etc.) stays in the generator script.
 */

const fs = require('fs');
const path = require('path');

const CONSTANTS = {
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

  extensions: ['.md', '.mdx'],
};

function humanize(name) {
  const cleaned = name.replace(/^\d+-/, '');
  return cleaned.split('-').map(word => {
    if (!word) return '';
    const upper = word.toUpperCase();
    if (CONSTANTS.acronyms.has(upper)) return upper;
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
      && CONSTANTS.extensions.includes(path.extname(e.name).toLowerCase())
      && !CONSTANTS.skipFiles.includes(e.name))
    .map(e => e.name)
    .sort();
  return candidates.length ? path.join(dir, candidates[0]) : '';
}

function readSectionDescription(sectionDir) {
  for (const candidate of CONSTANTS.sectionIndexFiles) {
    const desc = descriptionFromFile(path.join(sectionDir, candidate));
    if (desc) return desc;
  }
  for (const sub of CONSTANTS.sectionFallbackDirs) {
    const first = firstDocFileIn(path.join(sectionDir, sub));
    if (first) {
      const desc = descriptionFromFile(first);
      if (desc) return desc;
    }
  }
  return '';
}

function discoverTopLevelSections(docsDir) {
  if (!fs.existsSync(docsDir)) return [];
  return fs.readdirSync(docsDir, { withFileTypes: true })
    .filter(e => e.isDirectory()
      && !CONSTANTS.skipDirs.includes(e.name)
      && !e.name.startsWith('.'))
    .map(e => {
      const cleanName = e.name.replace(/^\d+-/, '');
      return {
        slug: cleanName,
        dirName: e.name,
        title: humanize(e.name),
        description: readSectionDescription(path.join(docsDir, e.name)),
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

function walkDocFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    if (CONSTANTS.skipFiles.includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (CONSTANTS.skipDirs.includes(entry.name)) continue;
      walkDocFiles(full, results);
    } else if (CONSTANTS.extensions.includes(path.extname(entry.name).toLowerCase())) {
      results.push(full);
    }
  }
  return results;
}

module.exports = {
  CONSTANTS,
  humanize,
  stripNumericPrefixes,
  parseFrontmatter,
  loadMintIgnore,
  descriptionFromFile,
  firstDocFileIn,
  readSectionDescription,
  discoverTopLevelSections,
  walkDocFiles,
};
