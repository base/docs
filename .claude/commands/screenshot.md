# PR Preview Screenshots

Take screenshots of docs pages affected by the current PR's changes using `agent-browser`, and return image markdown ready to embed in the PR body.

## Instructions

1. **Identify affected pages** from the git diff against the base branch:

   ```bash
   git diff $(git merge-base HEAD origin/master)...HEAD --name-only
   ```

   Map changed files to routes. Mintlify serves each MDX file at its path relative to `docs/`, minus the extension:

   | Changed files | Routes to screenshot |
   |---|---|
   | `docs/<path>.mdx` | `/<path>` (e.g. `docs/get-started/quickstart.mdx` → `/get-started/quickstart`) |
   | `docs/snippets/**` | Pages that import the snippet — find them with `grep -rl '<snippet-file>' docs --include='*.mdx'`, then screenshot one or two representative importers |
   | `docs/images/**` | Pages that reference the image — `grep -rl '<image-path>' docs --include='*.mdx'` |
   | `docs/docs.json` | A representative page from each added/renamed/moved group, to show the sidebar; skip for redirect-only changes |
   | `docs/*.css`, `docs/logo/**`, `docs/favicon*` | The homepage plus one content-heavy page |
   | `scripts/**`, `.github/**`, `*.md` outside `docs/` | No screenshots needed (not user-facing) |

   If a PR touches many pages (e.g. a sweep across 20+ files), screenshot a representative sample of 3–5 pages rather than all of them, and say which were sampled.

   If no user-facing files changed, say so and skip screenshots.

2. **Start the dev server** if one isn't already running:

   ```bash
   (cd docs && npx mintlify dev) &
   ```

   It must run from `docs/` (where `docs.json` lives) and serves on `http://localhost:3000` (it picks the next free port if 3000 is taken — watch the startup output). First run can take a minute or two while it downloads the framework; poll the URL until it responds:

   ```bash
   until curl -s -o /dev/null --max-time 2 http://localhost:3000/; do sleep 3; done
   ```

3. **Take screenshots** with `agent-browser`. For each affected route:

   ```bash
   mkdir -p screenshots
   agent-browser set viewport 1280 800
   agent-browser open http://localhost:3000/<route> && agent-browser wait --load networkidle && agent-browser screenshot --full screenshots/<name>.png
   ```

   Use descriptive filenames derived from the route: `get-started-quickstart.png`, `base-chain-node-setup.png`.

4. **Close the browser** when done:

   ```bash
   agent-browser close
   ```

5. **Review screenshots**: Read each screenshot file to visually inspect the pages. Check for broken components, un-rendered MDX (raw `<Card>` tags, missing frontmatter titles), broken images, and sidebar issues. Describe what you see and confirm the changes render correctly.

6. **Upload screenshots** to GitHub as draft release assets so they can be embedded in the PR:

   ```bash
   gh release create screenshots-pr-<N> --draft --title "PR #<N> Screenshots" --notes "Screenshots for PR review" screenshots/*.png
   gh release view screenshots-pr-<N> --json assets --jq '.assets[] | "\(.name): \(.url)"'
   ```

7. **Report results**: Return the image markdown for each screenshot (using the asset URLs from step 6) so it can be added to the **Screenshots** section of the PR body.

## Notes

- Screenshots are saved locally to `screenshots/` (gitignored) — do NOT commit them. They are shared via draft GitHub releases instead.
- If the dev server is already running, reuse it — don't start a second one.
- If a page fails to render (Mintlify build error), report the error output instead of a blank screenshot.
- After a PR is merged, clean up its draft release: `gh release delete screenshots-pr-<N> --yes`
