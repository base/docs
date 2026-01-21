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

3. **Review against style guide** — See [content-instructions.md](../../content-instructions.md)

4. **Provide feedback** per file:
   - What's working well
   - Specific suggestions with line references
   - Linter issues (if any)

5. **Offer to fix** issues if requested

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
```
