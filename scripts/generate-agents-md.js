#!/usr/bin/env node

/**
 * Generates a minified AGENTS.md with compact docs index
 * Groups doc files by directory using pipe-delimited structure
 *
 * Usage: node scripts/generate-agents-md.js
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  docsDir: './docs',
  outputFile: './AGENTS.md',

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

function scanDocs(dir, basePath = '') {
  const index = {};

  if (!fs.existsSync(dir)) return index;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (CONFIG.skipFiles.includes(entry.name) || entry.name.startsWith('.')) continue;

    const fullPath = path.join(dir, entry.name);
    const relPath = basePath ? `${basePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (CONFIG.skipDirs.includes(entry.name)) continue;
      Object.assign(index, scanDocs(fullPath, relPath));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (CONFIG.extensions.includes(ext)) {
        const baseName = entry.name.replace(/\.mdx?$/, '');
        if (!CONFIG.skipFilePatterns.some(p => p.test(baseName))) {
          files.push(baseName);
        }
      }
    }
  }

  if (files.length > 0) {
    const key = (basePath || 'root').replace(/\/?\d+-/g, '/').replace(/^\//, '');
    index[key] = files;
  }

  return index;
}

function generateMinified() {
  const index = scanDocs(CONFIG.docsDir);

  // Build minified index lines
  const lines = Object.entries(index)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dir, files]) => `|${dir}:${files.join(',')}`);

  // Minified output - minimal whitespace
  const content = `# Base Docs Index
IMPORTANT: Prefer retrieval-led reasoning. Read relevant docs before generating code.
Base is an Ethereum L2 by Coinbase. Docs for: Base Chain, Smart Wallet, OnchainKit, MiniKit.
[Docs]|root:./docs
${lines.join('\n')}
`;

  fs.writeFileSync(CONFIG.outputFile, content);

  const size = Buffer.byteLength(content, 'utf8');
  console.log(`Generated: ${CONFIG.outputFile}`);
  console.log(`Size: ${(size / 1024).toFixed(2)} KB`);
  console.log(`Entries: ${lines.length} directories`);
}

generateMinified();
