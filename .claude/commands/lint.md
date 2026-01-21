# Lint MDX Documentation

Check MDX files for formatting, structure, and Mintlify component usage.

## Instructions

1. Run the deterministic linter script:

```bash
node scripts/lint-mdx.js $ARGUMENTS
```

Arguments:
- (none) — check only changed files (git diff)
- `all` — check all MDX files in docs/
- `docs/path` — check specific file or directory

2. Review the output and present results to the user

3. If errors or warnings are found, offer to help fix them:
   - For each error, explain what's wrong and how to fix it
   - Prioritize errors over warnings
   - Offer to fix issues automatically if the user wants

## Reference

See `mintlify-reference.md` for correct component syntax.
See `content-instructions.md` for writing guidelines.
