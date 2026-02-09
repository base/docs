# Generate AGENTS.md

Regenerate the AGENTS.md file with a compressed documentation index.

## When to run

Run this command when:
- Documentation files have been added, removed, or reorganized
- You want to update the docs index for AI agents

## Steps

1. **Check for changes** (only regenerate if docs changed):
   ```bash
   git diff --name-only HEAD -- docs/
   git diff --name-only master...HEAD -- docs/
   ```

2. **If docs changed or `$ARGUMENTS` includes `force`:**
   Run the generator script:
   ```bash
   node scripts/generate-agents-md.js
   ```

3. **Report the result:**
   - Show the docs index size
   - Show total file size
   - List any new directories or significant changes

## Arguments

- No arguments: Only regenerate if docs/ files have changed
- `force`: Regenerate regardless of changes
- `status`: Show current AGENTS.md stats without regenerating:
  - File size and last modified date
  - Number of indexed paths (count lines starting with `|`)
  - Check if AGENTS.md is stale (docs changed since last generation)

## Output format

### For regeneration:
```
## AGENTS.md Generation

### Changes detected
- 3 files modified in docs/

### Generated
- Docs index: 10.5 KB
- Total size: 14.2 KB
- Directories indexed: 120

### Next steps
- Review AGENTS.md if needed
- Commit with your other changes
```

### For status:
```
## AGENTS.md Status

### Current file
- Size: 14.2 KB
- Last modified: 2024-02-09 20:44
- Indexed paths: 122

### Freshness
- [OK] Up to date (no docs changes since generation)
  OR
- [STALE] 5 docs files changed since last generation
  Run `/agents` to regenerate
```
