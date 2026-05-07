# Hooks

To enable git hooks for this repo, run the following from the repo root:

```sh
# 1. Register the hooks directory (--local writes to .git/config, never touches ~/.gitconfig)
git config --local core.hooksPath githooks

# 2. Make the hooks executable
chmod +x githooks/post-commit
```

These hooks are scoped to **this repo only**:
- `--local` writes to `.git/config`, not your global `~/.gitconfig`.
- `githooks` is a relative path — it only resolves inside this repo.
- Every hook script `cd`s into the repo root and only modifies files under it.

To verify after install: `git config --local --get core.hooksPath` should print `githooks`, and `git config --global --get core.hooksPath` should print nothing.

## post-commit

Regenerates docs index files when the commit message contains an opt-in trigger token (case-insensitive substring match):

| Token in commit message | Regenerates | Generator |
|-------------------------|-------------|-----------|
| `agents.md`             | `docs/agents.md` | `scripts/agents.js` |
| `llms.txt`              | `docs/llms.txt` + `docs/llms-full.txt` | `scripts/llms.js` |

Both tokens may appear in the same message; both generators run. If anything actually changed, a single follow-up `chore: regenerate ...` commit is created with the regenerated files. Recursion is guarded so the follow-up commit doesn't re-trigger the hook.

Examples that trigger:

```
docs: add new MiniKit guide; regenerate agents.md
fix typo, updates llms.txt
chore: bump nav, agents.md + llms.txt
```

Example that does NOT trigger (no token):

```
docs: add new MiniKit guide
```

Debug a hook run with `DEBUG_DOCS_HOOK=1 git commit ...`.
