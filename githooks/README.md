# Hooks

Repo-local git hooks. Installation is scoped to **this clone only** — `git config --local` is used, so your global git config and other repos are untouched.

## Install

From the repo root:

```sh
./githooks/install.sh
```

Idempotent — safe to re-run. The script sets `core.hooksPath=githooks` (local to this `.git/config` only) and marks the hooks executable.

These hooks are scoped to this repo only:
- `--local` writes to `.git/config`, not your global `~/.gitconfig`.
- `githooks` is a relative path — it only resolves inside this repo.
- Every hook script `cd`s into the repo root and only modifies files under it.

Verify after install:

```sh
git config --local  --get core.hooksPath   # should print: githooks
git config --global --get core.hooksPath   # should print nothing
```

## Configuration

Triggers, scripts, and outputs live in [`githooks/config.json`](./config.json). The hook logic itself never changes — to wire a new keyword to your own script, just add an entry:

```json
{
  "skipToken": "[skip-docs]",
  "generators": [
    { "name": "agents", "trigger": "agents.md", "script": "scripts/agents.js", "outputs": ["docs/agents.md"] },
    { "name": "llms",   "trigger": "llms.txt",  "script": "scripts/llms.js",   "outputs": ["docs/llms.txt", "docs/llms-full.txt"] },
    { "name": "myindex", "trigger": "myindex.md", "script": "scripts/myindex.js", "outputs": ["docs/myindex.md"] }
  ]
}
```

Fields per generator:
- `name` — short label used in logs and the auto-commit subject
- `trigger` — case-insensitive substring matched against the commit message
- `script` — path (from repo root) to a node script that writes the outputs
- `outputs` — files the script writes; used to (a) detect a real diff vs `HEAD` and (b) exclude these files from structural-change detection so editing a generated file never auto-fires the hook

If `jq` isn't installed or `config.json` is missing/malformed, the hook falls back to built-in defaults equivalent to the two entries above. The hook never errors out just because the config layer is unavailable.

## post-commit

Regenerates docs index files when either:

1. **Auto** — the commit added, deleted, or renamed any `.md`/`.mdx` file under `docs/` (excluding the generated indexes themselves). Both generators run.
2. **Opt-in** — the commit message contains a trigger token (case-insensitive substring):

    | Token in commit message | Regenerates | Generator |
    |-------------------------|-------------|-----------|
    | `agents.md`             | `docs/agents.md` | `scripts/agents.js` |
    | `llms.txt`              | `docs/llms.txt` + `docs/llms-full.txt` | `scripts/llms.js` |

Both tokens may appear in the same message; both generators run. The auto path covers the "I added a new doc page and forgot the keyword" failure mode; the opt-in path covers content-only edits that affect `llms.txt` extraction without changing file structure.

If a regeneration produces a real diff vs `HEAD`, a single follow-up commit is created:

```
chore: regenerate docs/agents.md (post-commit of <short-sha>)
```

The `(post-commit of <sha>)` suffix links the auto-commit back to the commit that triggered it. Recursion is guarded so the follow-up commit doesn't re-trigger the hook.

## post-merge

Runs after `git pull` / `git merge`. **Does not modify the working tree** — it only prints a warning when the merge brought in structural docs changes (A/D/R), pointing you at `/agents` and `/llms` so you can regenerate when ready. The next docs commit will also auto-regenerate via `post-commit`.

This is intentional: regenerating files mid-pull would surprise you with uncommitted changes.

## Bypass

| When | How |
|------|-----|
| One commit (env) | `SKIP_DOCS_HOOK=1 git commit ...` |
| One commit (in message) | include literal `[skip-docs]` token |
| One pull/merge | `SKIP_DOCS_HOOK=1 git pull ...` |

Useful when you legitimately need to mention `agents.md` or `llms.txt` in a commit message without triggering regeneration ("fix link to agents.md").

## Debug

Set `DEBUG_DOCS_HOOK=1` for verbose logging on either hook:

```sh
DEBUG_DOCS_HOOK=1 git commit ...
DEBUG_DOCS_HOOK=1 git pull ...
```

## Uninstall

```sh
git config --local --unset core.hooksPath
```
