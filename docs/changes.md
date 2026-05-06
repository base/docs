# Changes: Mini Apps → Apps (docs)

## Summary

- **Mintlify tab**: `"Mini Apps"` → `"Apps"` in [`docs.json`](docs.json).
- **Content path**: `docs/mini-apps/` → `docs/apps/`; published URLs are now `/apps/...`.
- **Slugs renamed**:
  - `quickstart/create-new-miniapp` → `quickstart/create-new-app`
  - `growth/build-viral-mini-apps` → `growth/build-viral-apps`
- **Redirects**:
  - All redirect **destinations** updated to `/apps/...` (and new slugs).
  - All redirect **sources** that pointed at the old docs tree use the **`/mini-apps/...`** prefix again (legacy inbound URLs).
  - **Wildcard** (last in the `redirects` array): `/mini-apps/:slug*` → `/apps/:slug*`.
  - **Explicit** (before wildcard): `/mini-apps/quickstart/create-new-miniapp` → `/apps/quickstart/create-new-app`, `/mini-apps/growth/build-viral-mini-apps` → `/apps/growth/build-viral-apps`.
- **Copy (non-hidden pages only)**: Pages **without** `hidden: true` keep refreshed wording and links. **`hidden: true` MDX** was **restored from `HEAD`** (`docs/mini-apps/...` at last commit) so we do not maintain editorial or link updates there; [`docs.json`](docs.json) redirects still map `/mini-apps/...` → `/apps/...` for visitors.
- **Preserved in non-hidden edits where applicable**: `fc:miniapp`, `miniapps.farcaster.xyz`, `addMiniApp`, `useMiniKit`, API values like `open_miniapp`, and **GitHub** paths under `base/demos` that still use a `mini-apps/` directory segment.

## Follow-up fixes (redirects & public pages)

These are **config and visible docs only** (not hidden MDX):

| Issue | Resolution |
|--------|------------|
| Destinations pointed at **`/apps/overview`** (no page) | Now **`/apps/quickstart/create-new-app`** (matches prior `/mini-apps/overview` behavior). |
| **`/mini-apps/features/links`** → missing `technical-guides/links` | Destination is **`/apps/core-concepts/navigation`**. |
| **`/mini-apps/growth/data-driven-growth`** → missing `technical-guides/data-driven-growth` | Destination is **`https://base.dev`** (same as the `technical-guides/data-driven-growth` redirect). |
| **`/apps/features/manifest`** (base-app minikit redirects) | **`/apps/core-concepts/manifest`**. |
| **`/mini-apps/quickstart/new-apps/features`** → missing `features/overview` | **`/apps/featured-guidelines/overview`**. |

Cross-links updated in **non-hidden** docs only, e.g. [`get-started/learning-resources.mdx`](get-started/learning-resources.mdx), [`base-account/guides/verify-social-accounts.mdx`](base-account/guides/verify-social-accounts.mdx), [`base-chain/builder-codes/app-developers.mdx`](base-chain/builder-codes/app-developers.mdx), [`base-account/improve-ux/spend-permissions.mdx`](base-account/improve-ux/spend-permissions.mdx).

## Files touched

- [`docs/docs.json`](docs.json) — navigation, redirects, wildcard.
- [`docs/.mintignore`](.mintignore) — paths under `/apps/...`.
- [`docs/apps/**`](apps/) — **Visible** pages (e.g. `guides/migrate-to-standard-web-app`, `growth/rewards`, `technical-guides/base-notifications`) plus `llms.txt` / `llms-full.txt`.
- [`docs/llms.txt`](llms.txt), [`docs/llms-full.txt`](llms-full.txt).
- [`claude.md`](../claude.md) — repo structure diagram.
- [`scripts/agents.js`](../scripts/agents.js) — comments.
- [`docs/agents.md`](agents.md) — regenerated.

## Verification

1. **`node scripts/lint-mdx.js`** — Run after edits.
2. **Spot-check**: `/apps/guides/migrate-to-standard-web-app`, `/apps/quickstart/create-new-app`, `/apps/growth/rewards`.
3. **Legacy URLs**: `/mini-apps/...` → `/apps/...` via redirects; hidden pages may still contain `/mini-apps/` in **source** links (unchanged); those URLs redirect when hit.
