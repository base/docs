# Animation Plans

| # | Title | Severity | Status | Depends on |
|---|-------|----------|--------|------------|
| 001 | [Add color transition to tab hover](001-tab-hover-transition.md) | MEDIUM | DONE | — |
| 002 | [Add transition to active tab indicator](002-tab-indicator-transition.md) | MEDIUM | DONE | 001 (optional) |

## Execution order

1. **001** first — it creates the `@media (hover: hover)` block in `global.css`.
2. **002** second — it adds its rule to the same media query block.

Both are small, single-file edits. They can be executed independently, but running 001 first avoids a duplicate media query block.
