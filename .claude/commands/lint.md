# Lint MDX Documentation

Check MDX files for formatting, structure, and Mintlify component usage.

Reference `mintlify-reference.md` for correct component syntax.

## Scope

**By default, only check changed files:**
1. Run `git diff --name-only HEAD` to get uncommitted changes
2. Run `git diff --name-only master...HEAD` to include committed changes on this branch
3. Filter to only `.mdx` files in `docs/`

**If `$ARGUMENTS` is provided:**
- `all` — check all MDX files in `docs/`
- A specific path — check only that file/folder (e.g., `docs/api`)

## Steps

1. Determine which files to check (changed files, all, or specific path)
2. Check each file for the issues below
3. Report issues with file path and line number
4. Suggest fixes for each issue

## Checks to perform

### Frontmatter
- Every MDX file should have frontmatter with at least `title` and `description`
- Frontmatter must be valid YAML between `---` fences

### Heading structure
- No skipped heading levels (e.g., h1 → h3)
- Only one h1 per page (or none if title is in frontmatter)

### Code blocks
- All code blocks must specify a language (```javascript not just ```)
- Code inside `<CodeGroup>` blocks should have both language AND label (```javascript Node.js)

### Mintlify components
Check for correct syntax on these components:

**Callouts** — must be self-closing or have content:
- `<Note>`, `<Tip>`, `<Warning>`, `<Info>`, `<Check>`

**Structural** — check for proper nesting:
- `<Steps>` must contain `<Step title="...">` children
- `<Tabs>` must contain `<Tab title="...">` children
- `<AccordionGroup>` must contain `<Accordion title="...">` children

**Cards** — check required attributes:
- `<Card>` should have `title` and `href`
- `<CardGroup>` should have `cols` attribute

**API docs** — check required attributes:
- `<ParamField>` needs `path|body|query|header`, `type`, and ideally `required` or `default`
- `<ResponseField>` needs `name` and `type`

**Media**:
- Images should be wrapped in `<Frame>`
- `<img>` tags should have `alt` attributes

### Common mistakes to flag
- Unclosed MDX components (e.g., `<Note>` without `</Note>`)
- Using HTML comments `<!-- -->` instead of MDX `{/* */}`
- Broken internal links (files that don't exist in docs/)
- Empty code blocks
- Components with typos (e.g., `<Warnings>` instead of `<Warning>`)

## Output format

```
## Lint Results

### Files checked
- 3 changed files (use `/lint all` to check entire docs/)

### ❌ Errors (must fix)
- `docs/getting-started.mdx:15` — Code block missing language specifier
- `docs/api/users.mdx:42` — Unclosed <Note> component

### ⚠️ Warnings (should fix)
- `docs/guides/auth.mdx:8` — Image not wrapped in <Frame>

### ✅ Summary
- 3 files checked, 2 errors, 1 warning
```
