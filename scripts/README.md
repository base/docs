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

# Check an explicit list of paths (one per line) -- how CI invokes it
node scripts/lint-mdx.js --files-from=changed-docs.txt

# Also title-case the tab and group names in docs/docs.json
node scripts/lint-mdx.js --check-nav

# Emit ::error:: annotations so violations appear inline on a PR diff
node scripts/lint-mdx.js --format=github

# Report only issues on lines a range touched, ignoring pre-existing debt
node scripts/lint-mdx.js --diff-range=origin/master...HEAD
```

Snippets under `docs/snippets/` and anything listed in `docs/.mintignore` are skipped:
snippets are imported partials with no frontmatter of their own, and ignored pages never ship.

### Checks

Every issue carries a stable rule id, so a specific subset can be required in CI without
depending on message wording. Rules come from [content-guidelines.md](../docs/content-guidelines.md)
and the Naming Conventions section of [ia-guidelines.md](../docs/ia-guidelines.md).

| Rule | Severity | Description |
|------|----------|-------------|
| `frontmatter/missing` | Error | Page has no frontmatter block |
| `frontmatter/title` | Error | `title` is required |
| `frontmatter/description` | Error | `description` is required |
| `title-case/page-title` | Error | Frontmatter `title` uses title case |
| `title-case/nav-title` | Error | `docs.json` tab and group names use title case (`--check-nav`) |
| `heading/no-h1` | Error | No H1 in body; the H1 comes from frontmatter `title` |
| `heading/starts-at-h2` | Error | First body heading is H2 |
| `heading/skipped-level` | Warning | No H2 → H4 jumps |
| `heading/none` | Warning | At least one heading per page (SEO) |
| `codeblock/language` | Error | Language specifier required |
| `codeblock/filename-or-title` | Error | Filename or title required after the language |
| `codeblock/long-block-meta` | Error | Blocks over 7 lines need `lines` and `expandable` |
| `codeblock/codegroup-label` | Warning | Labels required inside `<CodeGroup>` |
| `codeblock/wrap` | Warning | Long blocks should consider `wrap` |
| `codeblock/highlight` | Warning | Long blocks should consider `highlight={}` |
| `a11y/alt-text` | Error | Images need descriptive alt text |
| `a11y/link-text` | Error | No "click here" / "here" style link text |
| `a11y/image-frame` | Warning | Images should be wrapped in `<Frame>` |
| `component/html-comment` | Error | MDX `{/* */}` not HTML `<!-- -->` |
| `component/callout-typo` | Error | `<Warning>` not `<Warnings>`, etc. |
| `component/required-attr` | Warning | Required attributes on Mintlify components |
| `component/cardgroup-cols` | Warning | `<CardGroup>` should set `cols` |
| `link/broken-internal` | Warning | Internal links must point to existing files |

Title case is judged one-directionally: a lowercase word that should be capitalized is
flagged, but a capitalized word is never flagged for being capitalized. camelCase and
PascalCase identifiers (`getPaymentStatus`) and anything containing a digit or separator are
skipped, since many reference pages are titled after the symbol they document. Brand terms
that are legitimately lowercase belong in [`docs/.title-case-exceptions.txt`](../docs/.title-case-exceptions.txt).

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | No errors (warnings may exist) |
| `1` | Errors found |

### Unit tests

```bash
npm --prefix scripts run test:lint-mdx
```

### CI Integration

```bash
# Lint the pages a pull request changes
git diff --name-only --diff-filter=d "$BASE_SHA...$HEAD_SHA" | grep -E '^docs/.*\.mdx$' > changed-docs.txt
node scripts/lint-mdx.js --files-from=changed-docs.txt --format=github
```

## Documentation structure validator

```bash
node scripts/validate-docs-structure.js
```

Runs in CI through `scripts/verify-doc-samples.sh` on any `docs/**` change.

| Check | Description |
|-------|-------------|
| Nav pages | Every `docs.json` page reference resolves to a file |
| Duplicate nav entries | A page appears at most once in the nav |
| Redundant sidebar labels | No page (or nested group) repeats its parent group's name — flatten single-page groups, or set a distinct `sidebarTitle` |
| Orphans | Every publishable `.mdx` is reachable from the nav |
| Redirects | No duplicate sources, fragments in sources, chains, or missing targets |
| Internal links | Scoped link check across the use-case sections |

Exit code `1` on any violation.

## Docs index generators

Two generators emit AI-facing site indexes. Both share helpers in `lib/docs-utils.js`; their public organization is derived from the sidebar navigation in `docs/docs.json`.

### `agents.js` → `docs/AGENTS.md`

Compact pipe-delimited sidebar index plus a featured-pages section. The entry-point links use each navigation tab's first page. Run via `/agents` or directly:

```bash
node scripts/agents.js
```

The repo's `githooks/post-commit` hook re-runs this automatically after any commit whose message contains the substring `agents.md` (case-insensitive).

### `llms.js` → `docs/llms.txt` + `docs/llms-full.txt`

Spec-conformant [llms.txt](https://llmstxt.org) index plus a full-context variant.

```bash
node scripts/llms.js
```

- `llms.txt` is fully regenerated each run: H1, blockquote summary, one H2 per top-level navigation tab, nested sidebar-group headings, navigation-ordered `- [title](url): description` bullets, and a single `## Optional` H2 for MCP/skills pointers.
- `llms-full.txt` has two regions delimited by HTML comment markers:
  - `LLMS_EXTRAS_*` wraps hand-written cross-cutting concept guides — preserved verbatim across runs.
  - `LLMS_AUTOGEN_*` wraps the navigation page index — regenerated from `docs/docs.json`.
  - First-run migration: if the file has no markers yet, everything after the first blockquote is captured as extras automatically.

The repo's `githooks/post-commit` hook re-runs this automatically after any commit whose message contains the substring `llms.txt` (case-insensitive). If the regenerated files differ from what was committed, the hook creates a follow-up `chore: regenerate docs/llms.txt` commit. See `githooks/README.md` to enable.
