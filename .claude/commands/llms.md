# Regenerate llms.txt + llms-full.txt

Regenerate `docs/llms.txt` (strict [llms.txt spec](https://llmstxt.org)) and `docs/llms-full.txt` (spec-aligned + preserved hand-written extras) from the current `docs/` tree.

## How it normally runs

The repo's `githooks/post-commit` hook runs `scripts/llms.js` automatically when a commit message contains the substring `llms.txt` (case-insensitive). If the regenerated files differ from what was committed, the hook creates a follow-up `chore: regenerate docs/llms.txt` commit.

So the day-to-day flow is just:

```bash
git commit -m "docs: add foo guide; updates llms.txt"
```

…and the hook handles the rest.

Use `/llms` only when you want to:
- Preview the output before committing
- Regenerate without committing (e.g., to sanity-check a refactor)
- Install the hook on a fresh clone

## Steps

1. **If `$ARGUMENTS` includes `install`:** Install the post-commit hook so future commits with the right trigger token regenerate automatically. Always use `--local` so the config lands in `.git/config`, not the global `~/.gitconfig`:
   ```bash
   git config --local core.hooksPath githooks
   chmod +x githooks/post-commit
   ```
   Verify it stayed local: `git config --global --get core.hooksPath` should print nothing.

2. **Otherwise, run the generator:**
   ```bash
   node scripts/llms.js
   ```

3. **If `$ARGUMENTS` includes `status`:** Show current file sizes and last-modified times instead of regenerating:
   ```bash
   ls -lh docs/llms.txt docs/llms-full.txt
   ```

4. **Report the result:**
   - File sizes for `docs/llms.txt` and `docs/llms-full.txt` (visible in script output)
   - Section + page counts (visible in script output)
   - Reminder: hand-written extras between `LLMS_EXTRAS_*` markers in `llms-full.txt` are preserved across regenerations
   - Reminder: to commit the regenerated files via the post-commit hook, include `llms.txt` in the commit message

## Arguments

- No arguments: Regenerate both files
- `install`: Install the post-commit hook (one-time setup per clone)
- `status`: Show current file sizes and last-modified times without regenerating

## Output format

```
## llms.txt Generation

### Generated
- docs/llms.txt: 54.13 KB
- docs/llms-full.txt: 58.56 KB
- Sections: 5, pages: 300

### Notes
- Hand-written extras inside LLMS_EXTRAS markers in llms-full.txt preserved
- Include "llms.txt" in your commit message to trigger the hook on the next commit
```
