# Scripts

## MDX Linter

Deterministic linter for MDX documentation files.

### Usage

```bash
# Check only files you've changed (default)
node scripts/lint-mdx.js

# Check a specific file
node scripts/lint-mdx.js docs/cookbook/my-guide.mdx

# Check a directory
node scripts/lint-mdx.js docs/onchainkit

# Check all MDX files
node scripts/lint-mdx.js all
```

### Checks

| Check | Severity | Description |
|-------|----------|-------------|
| Frontmatter | Error | `title` and `description` required |
| Headings | Error | Max one H1, no skipped levels |
| Headings | Warning | At least one heading per page (SEO) |
| Code blocks | Error | Language specifier required |
| Code blocks | Warning | Labels required in `<CodeGroup>` |
| Components | Warning | Required attributes on Mintlify components |
| Comments | Error | MDX `{/* */}` not HTML `<!-- -->` |
| Links | Warning | Internal links must point to existing files |

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | No errors (warnings may exist) |
| `1` | Errors found |

### CI Integration

```bash
# Fail CI if linting errors exist
node scripts/lint-mdx.js all || exit 1
```
