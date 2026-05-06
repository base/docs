# Hooks

To enable git hooks for this repo, run the following from the repo root:

```sh
# 1. Register the hooks directory
git config core.hooksPath githooks

# 2. Make the post-commit hook executable
chmod +x githooks/post-commit
```

Once installed, any commit message containing `agents.md` will automatically regenerate `docs/agents.md`.
