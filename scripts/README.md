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

## Docs index generators

Two generators emit AI-facing site indexes from the `docs/` tree. Both share helpers in `lib/docs-utils.js` (frontmatter parser, `.mintignore` loader, file walker, section discovery).

### `agents.js` → `docs/agents.md`

Compact pipe-delimited directory index plus a featured-pages section. Run via `/agents` or directly:

```bash
node scripts/agents.js
```

The repo's `githooks/post-commit` hook re-runs this automatically after any commit whose message contains the substring `agents.md` (case-insensitive).

### `llms.js` → `docs/llms.txt` + `docs/llms-full.txt`

Spec-conformant [llms.txt](https://llmstxt.org) index plus a full-context variant.

```bash
node scripts/llms.js
```

- `llms.txt` is fully regenerated each run: H1, blockquote summary, one H2 per top-level section with `- [title](url): description` bullets, and a single `## Optional` H2 for MCP/skills pointers.
- `llms-full.txt` has two regions delimited by HTML comment markers:
  - `LLMS_EXTRAS_*` wraps hand-written cross-cutting concept guides — preserved verbatim across runs.
  - `LLMS_AUTOGEN_*` wraps the per-page index — regenerated from the current docs tree.
  - First-run migration: if the file has no markers yet, everything after the first blockquote is captured as extras automatically.

The repo's `githooks/post-commit` hook re-runs this automatically after any commit whose message contains the substring `llms.txt` (case-insensitive). If the regenerated files differ from what was committed, the hook creates a follow-up `chore: regenerate docs/llms.txt` commit. See `githooks/README.md` to enable.
