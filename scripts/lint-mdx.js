#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const DOCS_DIR = path.join(ROOT, "docs");

// ---------------- CACHE ----------------
const fileCache = new Set();

function buildFileCache() {
const walk = (dir) => {
for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
const full = path.join(dir, entry.name);
if (entry.isDirectory()) walk(full);
else fileCache.add(full);
}
};
walk(DOCS_DIR);
}

// ---------------- FILE DISCOVERY ----------------

function getChangedFiles() {
try {
const output = execSync("git diff --name-only origin/main...HEAD", {
encoding: "utf-8",
cwd: ROOT,
});

```
return output
  .trim()
  .split("\n")
  .filter((f) => f.startsWith("docs/") && f.endsWith(".mdx"));
```

} catch {
return [];
}
}

function getAllMdxFiles(dir) {
const result = [];

const walk = (d) => {
for (const e of fs.readdirSync(d, { withFileTypes: true })) {
const full = path.join(d, e.name);
if (e.isDirectory()) walk(full);
else if (e.name.endsWith(".mdx")) {
result.push(path.relative(ROOT, full));
}
}
};

walk(dir);
return result;
}

// ---------------- RULES ----------------

function checkCodeBlocks(content) {
const issues = [];
const lines = content.split("\n");
let inCode = false;

for (let i = 0; i < lines.length; i++) {
const line = lines[i];

````
if (line.startsWith("```")) {
  const match = line.match(/^```([^\s]*)/);
  const lang = match?.[1];

  if (!inCode && !lang) {
    issues.push({
      line: i + 1,
      severity: "error",
      message: "Missing language in code block",
    });
  }

  inCode = !inCode;
}
````

}

return issues;
}

function checkInternalLinks(content) {
const issues = [];
const regex = /](/([^)#]+))/g;

let match;
while ((match = regex.exec(content))) {
const link = match[1];

```
const possible = [
  path.join(DOCS_DIR, link + ".mdx"),
  path.join(DOCS_DIR, link, "index.mdx"),
];

const exists = possible.some((p) => fileCache.has(p));

if (!exists) {
  issues.push({
    line: 0,
    severity: "warning",
    message: `Broken link: /${link}`,
  });
}
```

}

return issues;
}

function checkFrontmatter(content) {
const issues = [];

const match = content.match(/^---\n([\s\S]*?)\n---/);

if (!match) {
issues.push({ line: 1, severity: "error", message: "Missing frontmatter" });
return issues;
}

const fm = match[1];

if (!/title:/.test(fm)) {
issues.push({ line: 1, severity: "error", message: "Missing title" });
}

if (!/description:/.test(fm)) {
issues.push({ line: 1, severity: "error", message: "Missing description" });
}

return issues;
}

// ---------------- MAIN ----------------

function lintFile(file) {
const full = path.join(ROOT, file);
const content = fs.readFileSync(full, "utf-8");

return [
...checkFrontmatter(content),
...checkCodeBlocks(content),
...checkInternalLinks(content),
];
}

function main() {
buildFileCache();

const arg = process.argv[2];
const files = arg === "all" ? getAllMdxFiles(DOCS_DIR) : getChangedFiles();

let errors = 0;
let warnings = 0;

for (const file of files) {
const issues = lintFile(file);

```
for (const i of issues) {
  const label = i.severity === "error" ? "❌" : "⚠️";
  console.log(`${label} ${file}:${i.line} — ${i.message}`);

  if (i.severity === "error") errors++;
  else warnings++;
}
```

}

console.log(`\nSummary: ${errors} errors, ${warnings} warnings`);

process.exit(errors > 0 ? 1 : 0);
}

main();
