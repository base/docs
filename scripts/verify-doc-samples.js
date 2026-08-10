#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const fixtureRoot = path.join(root, 'examples', 'verified-doc-samples');
const manifestPath = path.join(fixtureRoot, 'verification-manifest.json');
const skipped = new Set(['node_modules', 'lib', 'out', 'cache', '__pycache__', '.venv']);

function walk(dir, accept) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || skipped.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full, accept));
    else if (accept(full)) files.push(full);
  }
  return files;
}

function dedent(value) {
  const lines = value.replace(/\r\n/g, '\n').replace(/\s+$/, '').split('\n');
  const widths = lines.filter((line) => line.trim()).map((line) => (line.match(/^[ \t]*/) || [''])[0].length);
  const width = widths.length ? Math.min(...widths) : 0;
  return lines.map((line) => line.slice(width)).join('\n');
}

const regions = new Map();
for (const file of walk(fixtureRoot, () => true)) {
  const source = fs.readFileSync(file, 'utf8');
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const start = lines[i].match(/^\s*(?:\/\/|#) docs:start ([a-z0-9-]+)\s*$/);
    if (!start) continue;
    const id = start[1];
    const body = [];
    i++;
    while (i < lines.length && !new RegExp(`^\\s*(?:\\/\\/|#) docs:end ${id}\\s*$`).test(lines[i])) {
      body.push(lines[i++]);
    }
    if (i === lines.length) throw new Error(`Unclosed source region ${id} in ${file}`);
    if (regions.has(id)) throw new Error(`Duplicate source region ${id}`);
    regions.set(id, { code: dedent(body.join('\n')), file: path.relative(root, file) });
  }
}

const published = new Map();
for (const file of walk(path.join(root, 'docs'), (name) => name.endsWith('.mdx'))) {
  const source = fs.readFileSync(file, 'utf8');
  const marker = /\{\/\* sample: ([a-z0-9-]+) \*\/\}[\t ]*\n[\t ]*```[^\n]*\n/g;
  for (let match; (match = marker.exec(source));) {
    const id = match[1];
    const tail = source.slice(match.index + match[0].length);
    const close = tail.match(/\n[ \t]*```/);
    if (!close) throw new Error(`Missing closing fence for ${id} in ${file}`);
    const fenceEnd = match.index + match[0].length + close.index;
    const code = source.slice(match.index + match[0].length, fenceEnd);
    if (published.has(id)) throw new Error(`Duplicate published sample ${id}`);
    published.set(id, { code: dedent(code), file: path.relative(root, file) });
  }
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const manifestEntries = new Map(manifest.samples.map((sample) => [sample.id, sample]));
const errors = [];

for (const [id, page] of published) {
  const source = regions.get(id);
  const entry = manifestEntries.get(id);
  if (!source) errors.push(`${id}: no fixture region`);
  else if (source.code !== page.code) errors.push(`${id}: MDX differs from ${source.file}`);
  if (!entry) errors.push(`${id}: missing from verification manifest`);
  else {
    if (entry.document !== page.file) errors.push(`${id}: manifest document is ${entry.document}, expected ${page.file}`);
    if (source && entry.fixture !== source.file) errors.push(`${id}: manifest fixture is ${entry.fixture}, expected ${source.file}`);
  }
}

for (const id of manifestEntries.keys()) {
  if (!published.has(id)) errors.push(`${id}: manifest entry is not published`);
}

if (errors.length) {
  console.error(`Verified sample check failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Verified ${published.size} synchronized documentation samples.`);
