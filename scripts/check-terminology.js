#!/usr/bin/env node

// Terminology guard for Base docs.
//
// Enforces the rules in the consolidated docs rules doc (Legal language +
// retired-brand policy). Two sources of truth back this check:
//   - Legal guidance: "Tokenized equities (B20): content and code guidance"
//     (avoid "equity"/"security" as classifiers in RWA narrative; lead with
//     "one of many use cases"; ship the required disclaimers).
//   - Product change: Base Account / Base Pay / Wallet SDK are moving to
//     Coinbase Wallet and must not be referenced as live Base surfaces.
//
// Run: node scripts/check-terminology.js   (exit 1 on any violation)

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const docs = path.join(root, 'docs');
const errors = [];

// Pages allowed to name the retired brands (the "it moved" pointers).
const BRAND_ALLOWLIST = new Set([
  'sdks/coinbase-wallet.mdx',
  'sdks/overview.mdx',
]);

// Retired-brand terms that must not appear as live Base surfaces.
const BRAND_TERMS = [/\bBase Pay\b/, /\bBase Account\b/, /@base-org\/account/, /\bCoinbase Wallet SDK\b/];

// Classifiers Legal asked us to keep out of RWA narrative.
const RWA_CLASSIFIERS = /\b(equit(y|ies)|securit(y|ies))\b/i;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full);
    return /\.(mdx|jsx)$/.test(e.name) ? [full] : [];
  });
}

const files = walk(docs);

for (const file of files) {
  const rel = path.relative(docs, file);
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  // Rule A: retired brands (repo-wide, except the "it moved" pointers).
  if (!BRAND_ALLOWLIST.has(rel)) {
    lines.forEach((line, i) => {
      for (const re of BRAND_TERMS) {
        if (re.test(line)) errors.push(`${rel}:${i + 1}: retired brand term "${line.match(re)[0]}" (moved to Coinbase Wallet)`);
      }
    });
  }

  // Rules B & C: only for the Issue RWA section.
  const isRwa = rel.startsWith('build-on-base/issue-rwa/') || rel === 'get-started/issue-rwa.mdx';
  if (isRwa) {
    lines.forEach((line, i) => {
      // Skip fenced/inline code and sample markers — flag prose classifiers only.
      if (/^\s*```/.test(line)) return;
      const prose = line.replace(/`[^`]*`/g, '');
      const m = prose.match(RWA_CLASSIFIERS);
      if (m) errors.push(`${rel}:${i + 1}: RWA-narrative classifier "${m[0]}" (use asset/RWA/stock-token framing per Legal)`);
    });
    // Rule C: the required disclaimer snippet must be present.
    if (!content.includes('RwaDisclaimer')) {
      errors.push(`${rel}: missing <RwaDisclaimer /> (required CB disclaimers on RWA pages)`);
    }
  }
}

if (errors.length) {
  console.error(`Terminology check failed (${errors.length}):`);
  errors.forEach((e) => console.error(`- ${e}`));
  process.exit(1);
}

console.log('Terminology check passed: no retired brands, RWA framing compliant.');
