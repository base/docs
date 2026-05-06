# Install

Run once after cloning:

```sh
git config core.hooksPath githooks
chmod +x githooks/post-commit
```

Verify:

```sh
git config --get core.hooksPath   # → githooks
ls -l githooks/post-commit        # → -rwxr-xr-x
```

Done. Include `agents.md` in any commit message to trigger regeneration.
