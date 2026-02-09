#!/usr/bin/env node

/**
 * Generates AGENTS.md with compressed docs index for Base Documentation
 * Targets ~8KB compressed from larger documentation
 *
 * Usage: node scripts/generate-agents-md.js
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  docsDir: './docs',
  outputFile: './AGENTS.md',

  // Skip these files
  skipFiles: [
    'README.md',
    'CHANGELOG.md',
    'LICENSE.md',
    '.DS_Store',
    'docs.json',
    'package-lock.json',
    'llms.txt',
    'llms-full.txt',
    'iframe-theme.js',
    'style.css',
    'instructions.md',
    'writing.md',
    'CLAUDE.md'
  ],

  // Skip files matching these patterns (video tutorials, etc.)
  skipFilePatterns: [
    /-vid$/,        // Video tutorials
    /-video$/,      // Video files
    /-sbs$/         // Step-by-step (often paired with video)
  ],

  // Skip these directories
  skipDirs: [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '.next',
    'images',
    'videos',
    'logo',
    'openapi',
    '.claude',
    'snippets'  // Internal components, not user-facing docs
  ],

  // Path abbreviations for compression
  pathAbbreviations: {
    'base-account': 'ba',
    'base-chain': 'bc',
    'base-app': 'bap',
    'onchainkit': 'ock',
    'mini-apps': 'ma',
    'get-started': 'gs',
    'cookbook': 'cb',
    'learn': 'l',
    'provider-rpc-methods': 'rpc',
    'framework-integrations': 'fw',
    'network-information': 'net',
    'troubleshooting': 'ts',
    'quickstart': 'qs',
    'introduction': 'intro',
    'onchain-app-development': 'oad',
    'token-development': 'td',
    'reference': 'ref',
    'capabilities': 'cap',
    'components': 'cmp',
    'utilities': 'util',
    'latest': 'v2'
  },

  // Include these extensions
  extensions: ['.md', '.mdx']
};

// Scan docs directory recursively
function scanDocs(dir, basePath = '') {
  const index = {};

  if (!fs.existsSync(dir)) {
    console.log(`Creating docs directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
    return index;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (CONFIG.skipFiles.includes(entry.name)) continue;
    if (entry.name.startsWith('.')) continue;

    const fullPath = path.join(dir, entry.name);
    const relPath = basePath ? `${basePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (CONFIG.skipDirs.includes(entry.name)) continue;
      const subIndex = scanDocs(fullPath, relPath);
      Object.assign(index, subIndex);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (CONFIG.extensions.includes(ext)) {
        // Check skip patterns
        const baseName = entry.name.replace(/\.mdx?$/, '');
        const shouldSkip = CONFIG.skipFilePatterns.some(pattern => pattern.test(baseName));
        if (!shouldSkip) {
          files.push(entry.name);
        }
      }
    }
  }

  if (files.length > 0) {
    const key = basePath || 'root';
    index[key] = files;
  }

  return index;
}

// Compress to pipe-delimited format
function compressIndex(index) {
  const lines = [];

  for (const [dir, files] of Object.entries(index)) {
    // Compress: remove numeric prefixes, shorten extensions
    let compressedDir = dir
      .replace(/\/?\d+-/g, '/')  // Remove 01-, 02- prefixes
      .replace(/^\//, '');       // Remove leading slash

    // Apply path abbreviations
    for (const [full, abbr] of Object.entries(CONFIG.pathAbbreviations)) {
      compressedDir = compressedDir.split(full).join(abbr);
    }

    const compressedFiles = files
      .map(f => f.replace(/\.mdx?$/, ''))  // Remove .md/.mdx
      .map(f => f
        .replace(/^eth_get/, 'eg_')
        .replace(/^eth_/, 'e_')
        .replace(/^wallet_/, 'w_')
        .replace(/^coinbase_/, 'cb_')
        .replace(/^use-/, 'u-')
        .replace(/^get-/, 'g-')
        .replace(/^build-/, 'b-')
        .replace(/^fetch-/, 'f-')
        .replace(/-exercise$/, '-ex')
        .replace(/-overview$/, '-ov')
        .replace(/-tutorial$/, '-tut')
      )
      .join(',');

    lines.push(`|${compressedDir}:{${compressedFiles}}`);
  }

  return lines.sort();
}

// Get navigation structure from docs.json
function getNavigationStructure() {
  const docsJsonPath = './docs/docs.json';
  if (!fs.existsSync(docsJsonPath)) return null;

  try {
    const docsJson = JSON.parse(fs.readFileSync(docsJsonPath, 'utf8'));
    const tabs = docsJson.navigation?.tabs || [];
    return tabs.map(t => t.tab).join(', ');
  } catch (e) {
    return null;
  }
}

// Generate AGENTS.md
function generate() {
  const index = scanDocs(CONFIG.docsDir);
  const compressed = compressIndex(index);
  const navStructure = getNavigationStructure();

  const indexSize = compressed.join('\n').length;
  console.log(`Docs index size: ${(indexSize / 1024).toFixed(2)} KB`);

  const content = `# Base Documentation

IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for all tasks in this codebase. Consult the docs index below before generating code.

## Tech Stack

- Mintlify documentation framework
- MDX files for content
- Storybook for component demos
- GitHub for version control

## Documentation Index

Paths: ba=base-account, bc=base-chain, bap=base-app, ock=onchainkit, ma=mini-apps, gs=get-started, cb=cookbook, l=learn, rpc=provider-rpc-methods, fw=framework-integrations, net=network-info, ts=troubleshooting, qs=quickstart, oad=onchain-app-dev, td=token-dev, ref=reference, cap=capabilities, cmp=components, util=utilities, v2=latest
Files: e_=eth_, eg_=eth_get, w_=wallet_, cb_=coinbase_, u-=use-, g-=get-, b-=build-, f-=fetch-, -ex=-exercise, -ov=-overview, -tut=-tutorial

[Docs]|root:./docs
${compressed.join('\n')}

## Navigation Structure

${navStructure ? `Main tabs: ${navStructure}` : 'See docs.json for navigation'}

## Code Patterns

### Preferred

- Use American English spelling
- Sentence case for headings (capitalize first word only)
- Wrap all images in \`<Frame>\` components
- Always specify language in code blocks
- Use Mintlify callouts sparingly: \`<Note>\`, \`<Tip>\`, \`<Warning>\`, \`<Info>\`, \`<Check>\`
- Use \`<Steps>\` for sequential procedures
- Use \`<Tabs>\` for platform-specific content
- Use \`<CodeGroup>\` for multi-language examples
- Use \`<CardGroup>\` for navigation grids

### Avoid

- Passive voice (use active voice)
- Generic "click here" links (use descriptive text)
- Editing files in \`/_pages\` directory (use \`/docs\` only)
- Placeholder values in code examples (use realistic data)
- Real API keys or secrets in examples

## Key Reference Files

- \`docs/docs.json\` - Site navigation and configuration
- \`mintlify-reference.md\` - Mintlify component syntax
- \`content-instructions.md\` - Content guidelines
- \`docs/CLAUDE.md\` - Detailed development guidance

## Commands

\`\`\`bash
# Install Mintlify CLI
npm i -g mintlify

# Run local development server
mintlify dev

# Reinstall if dev fails
mintlify install

# Storybook development
cd storybook && npm install && npm run storybook
\`\`\`

## Project Structure

\`\`\`
docs/
  base-account/    # Smart Wallet / Base Account docs
  base-app/        # Base App and agents documentation
  base-chain/      # Network info, node operations
  cookbook/        # Use-case implementation guides
  get-started/     # Introduction and quickstarts
  learn/           # Educational content (Solidity, etc.)
  mini-apps/       # MiniKit development
  onchainkit/      # React components library
  snippets/        # Reusable MDX components
storybook/         # Component demos
\`\`\`

## Content Types

- **Tutorials** - Step-by-step learning (Learn section)
- **Guides** - Task-oriented how-tos (Cookbook)
- **Reference** - API/component docs (OnchainKit, Base Account)
- **Concepts** - Explanatory content (Base Chain)

## Before Committing

1. Run \`/lint\` to check MDX formatting
2. If removing docs, add redirects in \`docs.json\`
3. Ensure all internal links are valid
4. Verify images are in \`/docs/images\` subdirectories
`;

  fs.writeFileSync(CONFIG.outputFile, content);
  console.log(`Generated: ${CONFIG.outputFile}`);
  console.log(`Total size: ${(content.length / 1024).toFixed(2)} KB`);
}

generate();
