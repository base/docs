---
name: linting-mdx
description: Runs deterministic MDX linter and helps fix formatting, structure, and Mintlify component issues. Use when checking documentation quality or before committing changes.
---

# Lint MDX

Run the linter:

```bash
node scripts/lint-mdx.js $ARGUMENTS
```

Arguments: (none) = changed files, `all` = everything, or specify a path.

## Workflow

1. Run linter, present results
2. If errors found, offer to fix them
3. Prioritize errors over warnings

## References

- [mintlify-reference.md](../../mintlify-reference.md) — component syntax
- [content-instructions.md](../../content-instructions.md) — writing guidelines
