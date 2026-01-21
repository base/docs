#!/usr/bin/env node

/**
 * MDX Linter for Mintlify Documentation
 *
 * Deterministic checks for MDX files:
 * - Frontmatter validation
 * - Heading structure
 * - Code block language specifiers
 * - Mintlify component syntax
 * - Internal link validation
 *
 * Usage:
 *   node scripts/lint-mdx.js           # Check changed files only
 *   node scripts/lint-mdx.js all       # Check all MDX files
 *   node scripts/lint-mdx.js docs/api  # Check specific path
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const DOCS_DIR = path.join(__dirname, "..", "docs");

// -----------------------------------------------------------------------------
// File Discovery
// -----------------------------------------------------------------------------

function getChangedFiles() {
  try {
    const uncommitted = execSync("git diff --name-only HEAD", {
      encoding: "utf-8",
      cwd: path.join(__dirname, ".."),
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    const committed = execSync("git diff --name-only master...HEAD", {
      encoding: "utf-8",
      cwd: path.join(__dirname, ".."),
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    const allChanged = [...new Set([...uncommitted, ...committed])];
    return allChanged.filter(
      (f) => f.startsWith("docs/") && f.endsWith(".mdx")
    );
  } catch {
    return [];
  }
}

function getAllMdxFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllMdxFiles(fullPath));
    } else if (entry.name.endsWith(".mdx")) {
      files.push(path.relative(path.join(__dirname, ".."), fullPath));
    }
  }
  return files;
}

function getFilesToCheck(arg) {
  if (!arg) {
    return { files: getChangedFiles(), mode: "changed" };
  }
  if (arg === "all") {
    return { files: getAllMdxFiles(DOCS_DIR), mode: "all" };
  }
  // Specific path
  const targetPath = path.join(__dirname, "..", arg);
  if (fs.existsSync(targetPath)) {
    if (fs.statSync(targetPath).isDirectory()) {
      return { files: getAllMdxFiles(targetPath), mode: `path: ${arg}` };
    }
    if (arg.endsWith(".mdx")) {
      return { files: [arg], mode: `file: ${arg}` };
    }
  }
  return { files: [], mode: "invalid path" };
}

// -----------------------------------------------------------------------------
// Linting Rules
// -----------------------------------------------------------------------------

function checkFrontmatter(content, filePath) {
  const issues = [];
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    issues.push({ line: 1, severity: "error", message: "Missing frontmatter" });
    return issues;
  }

  const frontmatter = frontmatterMatch[1];

  if (!/^title:\s*.+/m.test(frontmatter)) {
    issues.push({
      line: 1,
      severity: "error",
      message: "Frontmatter missing required `title` field",
    });
  }

  if (!/^description:\s*.+/m.test(frontmatter)) {
    issues.push({
      line: 1,
      severity: "error",
      message: "Frontmatter missing required `description` field",
    });
  }

  return issues;
}

function checkHeadingStructure(content, filePath) {
  const issues = [];
  const lines = content.split("\n");
  let inCodeBlock = false;
  let lastHeadingLevel = 0;
  let h1Count = 0;
  let totalHeadingCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const headingMatch = line.match(/^(#{1,6})\s+/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      totalHeadingCount++;

      if (level === 1) {
        h1Count++;
        if (h1Count > 1) {
          issues.push({
            line: i + 1,
            severity: "error",
            message: "Multiple H1 headings found (should have at most one)",
          });
        }
      }

      if (lastHeadingLevel > 0 && level > lastHeadingLevel + 1) {
        issues.push({
          line: i + 1,
          severity: "warning",
          message: `Skipped heading level: H${lastHeadingLevel} → H${level}`,
        });
      }

      lastHeadingLevel = level;
    }
  }

  // Check for pages with no headings (bad for SEO)
  if (totalHeadingCount === 0) {
    issues.push({
      line: 1,
      severity: "warning",
      message: "No headings found (at least one heading improves SEO)",
    });
  }

  return issues;
}

function checkCodeBlocks(content, filePath) {
  const issues = [];
  const lines = content.split("\n");
  let inCodeGroup = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes("<CodeGroup>")) inCodeGroup = true;
    if (line.includes("</CodeGroup>")) inCodeGroup = false;

    // Check for code block opening
    const codeBlockMatch = line.match(/^```(\S*)/);
    if (codeBlockMatch) {
      const lang = codeBlockMatch[1];

      // Check for empty language
      if (!lang) {
        issues.push({
          line: i + 1,
          severity: "error",
          message: "Code block missing language specifier",
        });
      }

      // In CodeGroup, should have language AND label
      if (inCodeGroup && lang && !lang.includes(" ") && !/\s+\S+/.test(line.slice(3 + lang.length))) {
        // Check if there's a label after the language
        const afterLang = line.slice(3 + lang.length).trim();
        if (!afterLang) {
          issues.push({
            line: i + 1,
            severity: "warning",
            message: "Code block in <CodeGroup> should have a label (e.g., ```javascript Node.js)",
          });
        }
      }
    }
  }

  return issues;
}

function checkMintlifyComponents(content, filePath) {
  const issues = [];
  const lines = content.split("\n");

  // Track component nesting
  const componentStack = [];

  // Components that need specific children
  const parentChildRules = {
    Steps: "Step",
    Tabs: "Tab",
    AccordionGroup: "Accordion",
  };

  // Required attributes
  const requiredAttrs = {
    Step: ["title"],
    Tab: ["title"],
    Accordion: ["title"],
    Card: ["title"],
    ParamField: ["type"],
    ResponseField: ["name", "type"],
  };

  // Valid callout components
  const validCallouts = ["Note", "Tip", "Warning", "Info", "Check"];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for HTML comments
    if (line.includes("<!--")) {
      issues.push({
        line: i + 1,
        severity: "error",
        message: "Use MDX comments {/* */} instead of HTML comments <!-- -->",
      });
    }

    // Check for typos in callouts
    const calloutTypos = ["<Warnings>", "<Notes>", "<Tips>", "<Infos>", "<Checks>"];
    for (const typo of calloutTypos) {
      if (line.includes(typo)) {
        issues.push({
          line: i + 1,
          severity: "error",
          message: `Typo: ${typo} should be <${typo.slice(1, -2)}>`,
        });
      }
    }

    // Check opening tags
    const openTagMatch = line.match(/<(Step|Tab|Accordion|Card|CardGroup|ParamField|ResponseField|Frame|Steps|Tabs|AccordionGroup)(\s[^>]*)?\/?>/);
    if (openTagMatch) {
      const tag = openTagMatch[1];
      const attrs = openTagMatch[2] || "";
      const isSelfClosing = line.includes("/>");

      // Check required attributes
      if (requiredAttrs[tag]) {
        for (const attr of requiredAttrs[tag]) {
          if (!new RegExp(`${attr}=`).test(attrs)) {
            issues.push({
              line: i + 1,
              severity: "warning",
              message: `<${tag}> should have \`${attr}\` attribute`,
            });
          }
        }
      }

      // CardGroup should have cols
      if (tag === "CardGroup" && !attrs.includes("cols")) {
        issues.push({
          line: i + 1,
          severity: "warning",
          message: "<CardGroup> should have `cols` attribute",
        });
      }

      // Track parent components
      if (parentChildRules[tag] && !isSelfClosing) {
        componentStack.push({ tag, line: i + 1 });
      }
    }

    // Check for img without Frame
    if (line.includes("<img") && !line.includes("<Frame")) {
      // Look backwards for Frame
      let hasFrame = false;
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        if (lines[j].includes("<Frame")) {
          hasFrame = true;
          break;
        }
      }
      if (!hasFrame) {
        issues.push({
          line: i + 1,
          severity: "warning",
          message: "Image should be wrapped in <Frame>",
        });
      }
    }

    // Check for img without alt
    if (line.includes("<img") && !line.includes("alt=")) {
      issues.push({
        line: i + 1,
        severity: "warning",
        message: "<img> should have `alt` attribute",
      });
    }
  }

  return issues;
}

function checkInternalLinks(content, filePath) {
  const issues = [];
  const lines = content.split("\n");

  // Match markdown links and href attributes pointing to internal paths
  const linkPatterns = [
    /\[([^\]]*)\]\(\/([^)#]+)/g, // [text](/path)
    /href="\/([^"#]+)/g, // href="/path"
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const pattern of linkPatterns) {
      let match;
      pattern.lastIndex = 0;

      while ((match = pattern.exec(line)) !== null) {
        const linkPath = match[pattern === linkPatterns[0] ? 2 : 1];

        // Skip external-looking paths and anchors
        if (linkPath.startsWith("http") || linkPath.startsWith("#")) continue;

        // Skip image paths
        if (linkPath.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) continue;

        // Check if file exists
        const possiblePaths = [
          path.join(DOCS_DIR, linkPath + ".mdx"),
          path.join(DOCS_DIR, linkPath, "index.mdx"),
          path.join(DOCS_DIR, linkPath),
        ];

        const exists = possiblePaths.some((p) => fs.existsSync(p));

        if (!exists) {
          issues.push({
            line: i + 1,
            severity: "warning",
            message: `Possibly broken internal link: /${linkPath}`,
          });
        }
      }
    }
  }

  return issues;
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

function lintFile(filePath) {
  const fullPath = path.join(__dirname, "..", filePath);
  if (!fs.existsSync(fullPath)) {
    return [{ line: 0, severity: "error", message: "File not found" }];
  }

  const content = fs.readFileSync(fullPath, "utf-8");

  const issues = [
    ...checkFrontmatter(content, filePath),
    ...checkHeadingStructure(content, filePath),
    ...checkCodeBlocks(content, filePath),
    ...checkMintlifyComponents(content, filePath),
    ...checkInternalLinks(content, filePath),
  ];

  return issues.sort((a, b) => a.line - b.line);
}

function main() {
  const arg = process.argv[2];
  const { files, mode } = getFilesToCheck(arg);

  console.log("## Lint Results\n");
  console.log(`### Files checked`);
  console.log(`- ${files.length} files (${mode})`);

  if (files.length === 0) {
    if (mode === "changed") {
      console.log("- No changed MDX files found\n");
    } else {
      console.log("- No files to check\n");
    }
    console.log("### ✅ Summary");
    console.log("- 0 files checked, 0 errors, 0 warnings");
    process.exit(0);
  }

  console.log("");

  const allErrors = [];
  const allWarnings = [];

  for (const file of files) {
    const issues = lintFile(file);
    for (const issue of issues) {
      const entry = `\`${file}:${issue.line}\` — ${issue.message}`;
      if (issue.severity === "error") {
        allErrors.push(entry);
      } else {
        allWarnings.push(entry);
      }
    }
  }

  if (allErrors.length > 0) {
    console.log("### ❌ Errors (must fix)");
    for (const e of allErrors) {
      console.log(`- ${e}`);
    }
    console.log("");
  }

  if (allWarnings.length > 0) {
    console.log("### ⚠️ Warnings (should fix)");
    for (const w of allWarnings) {
      console.log(`- ${w}`);
    }
    console.log("");
  }

  if (allErrors.length === 0 && allWarnings.length === 0) {
    console.log("### ✅ All checks passed\n");
  }

  console.log("### Summary");
  console.log(
    `- ${files.length} files checked, ${allErrors.length} errors, ${allWarnings.length} warnings`
  );

  // Exit with error code if there are errors
  process.exit(allErrors.length > 0 ? 1 : 0);
}

main();
