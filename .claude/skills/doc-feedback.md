---
name: reviewing-documentation
description: Reviews documentation for quality, consistency, and style guide adherence. Use when reviewing changed docs or before publishing new content.
---

# Documentation Feedback

## Workflow

1. **Get files to review**
   ```bash
   git diff --name-only HEAD -- '*.mdx'
   git diff --name-only master...HEAD -- '*.mdx'
   ```
   If `$ARGUMENTS` provided, review that path instead.

2. **Run linter first**
   ```bash
   node scripts/lint-mdx.js $ARGUMENTS
   ```

3. **Review against style guide** — See [content-guidelines.md](../../docs/content-guidelines.md)

4. **Review against IA guidelines** — Read [ia-guidelines.md](../../docs/ia-guidelines.md) and
   check that each page sits in the right tab/section, follows the naming conventions, and does
   not create a redundant sidebar label (a child that repeats its parent group). The
   [docs-ia](docs-ia.md) skill has a quick decision tree for placement. Only needed when the PR
   adds, moves, or renames pages, or edits `docs.json`.

5. **Check against CI** — Anticipate the checks that run on `docs/**` changes so the PR does not
   fail after opening. Scope the commands to what the PR actually touches:
   - `docs.json` or page frontmatter changed → `node scripts/validate-docs-structure.js`
     (nav, orphans, redirects, redundant sidebar labels)
   - terminology-sensitive content → `node scripts/check-terminology.js`
   - code samples changed → note that `scripts/verify-doc-samples.sh` compiles the
     TS/Go/Python/Solidity samples in CI (heavy; mention rather than auto-run unless asked)
   - PR touches a **protected surface** → flag that it needs approvals before it can merge:
     - `docs/get-started/` pages or the Get Started tab in `docs.json` → 3 Writer approvals
     - a top-level group in the Build on Base tab (add/rename/remove) → 1 Governance Owner
     - `docs/ia-guidelines.md` or `docs/content-guidelines.md` → 1 Governance Owner
     - gate workflows, `.github/ia-governance.json`, `.github/CODEOWNERS`, `.github/scripts/`
       → 3 Writer approvals

6. **Provide feedback** per file:
   - What's working well
   - Specific suggestions with line references
   - Linter issues (if any)
   - IA / placement notes (if any)
   - CI checks likely to fail and required approvals (if any)

7. **Offer to fix** issues if requested

## Review checklist

```
Review Progress:
- [ ] Terminology consistent
- [ ] Code examples complete and runnable
- [ ] No placeholder values (foo, bar, example.com)
- [ ] Headings descriptive and keyword-rich
- [ ] Content scannable (headings, lists, white space)
- [ ] Active voice, second person
- [ ] Troubleshooting included where appropriate
- [ ] Correct tab/section placement, naming conventions followed
- [ ] No redundant sidebar labels
- [ ] docs-structure validation passes (if docs.json / frontmatter changed)
- [ ] Required approvals flagged (if PR touches a protected surface)
```
