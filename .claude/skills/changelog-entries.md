---
name: writing-changelog-entries
description: Structures and names changelog entries under the Upgrades tab. Use when documenting a hardfork change, protocol parameter change, or infrastructure/node upgrade.
---

# Writing Changelog Entries

Full rules: [Changelog Entries](../../docs/content-guidelines.md#changelog-entries) in content-guidelines.md.

Changelog entries follow a TIP/EIP-inspired structure. Not every section applies to every change — use what fits, skip the rest.

## 1. Core sections (every entry)

| Section | Purpose |
|---|---|
| **Abstract** | One paragraph: what changed, what it affects, which hardfork introduces it |
| **Motivation** | Why this change exists — problem, limitation, or opportunity |
| **What changed** | The substance — structure depends on change type (see below) |
| **Migration** | What developers/operators must do — breaking changes, deprecations, new defaults, upgrade steps |

## 2. Optional sections (when relevant)

| Section | When |
|---|---|
| **Alternatives considered** | Non-trivial design decisions where other approaches were evaluated |
| **Test cases** | Key scenarios validating the change; reference invariant tests where applicable |

## 3. Structure "What changed" by type

**Contract / interface changes** (B20 updates, new precompiles): new/modified function signatures (Solidity blocks) → new errors/events → typed data changes (domain separators, typehashes) if applicable → behavioral changes, one subsection per area → **before/after diffs, not prose descriptions**.

**Protocol / network changes** (throughput limits, fee parameters, derivation): parameter changes as old value → new value → behavioral impact on nodes/sequencers/verifiers → required configuration changes.

**Node / infrastructure changes** (client upgrades, new RPC methods): version requirements → new/changed CLI flags, env vars, config keys → new API endpoints/methods.

**Cross-references**: link to the canonical spec page in Base Protocol/Specifications for full current state. The changelog entry records *what changed*, not the complete spec — see the [writing-spec-pages](spec-pages.md) skill for the canonical-spec side of this split.

## 4. File naming

```
{ordinal}-{hardfork}-{component}-{feature}.mdx
```

| Segment | Format | Example |
|---|---|---|
| Ordinal | Two-digit hardfork number | `02` (Cobalt) |
| Hardfork | Lowercase hardfork name | `cobalt` |
| Component | Lowercase component name | `b20asset`, `policyregistry`, `node` |
| Feature | Lowercase kebab-case slug | `multiplier`, `composite-policy` |

Example: `02-cobalt-b20asset-multiplier.mdx`

## 5. Placement

All per-feature changelog entries go under the hardfork group that introduced them (Cobalt, Beryl, ...) in the Upgrades tab — never a standalone per-feature group. See [docs-ia](docs-ia.md) for the full Upgrades-tab rules, including how Optimism-inherited hardforks (Jovian, Isthmus, Holocene, ...) differ from Base-named hardfork groups.
