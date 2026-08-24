# Changelog entry structure

Changelog entries follow a consistent structure inspired by improvement proposals (TIPs, EIPs). Not every section applies to every change — a node upgrade looks different from a new contract interface. Use the sections that fit; skip the rest.

---

## Core sections

Every changelog entry should include these:

| Section | Purpose |
|---------|---------|
| **Abstract** | One-paragraph summary: what changed, what it affects, which hardfork introduces it. |
| **Motivation** | Why this change exists — the problem, limitation, or opportunity it addresses. |
| **What changed** | The substance of the change. Structure depends on the type of change (see below). |
| **Migration** | What developers or operators need to do. Breaking changes, deprecations, new defaults, upgrade steps. |

## Optional sections

Include when relevant:

| Section | When to include |
|---------|-----------------|
| **Alternatives considered** | Non-trivial design decisions where other approaches were evaluated. |
| **Test cases** | Key scenarios that validate the change. Reference invariant tests where applicable. |

## Structuring "What changed"

The body of a changelog entry varies by change type. Use the structure that fits:

**Contract / interface changes** (e.g., B20 updates, new precompiles):
- New or modified function signatures (Solidity code blocks)
- New errors and events
- Typed data changes (domain separators, typehashes) if applicable
- Behavioral changes — one subsection per area affected
- Show before/after diffs rather than describing changes in prose

**Protocol / network changes** (e.g., throughput limits, fee parameters, derivation changes):
- Parameter changes (old value → new value)
- Behavioral impact on nodes, sequencers, or verifiers
- Configuration changes required

**Node / infrastructure changes** (e.g., client upgrades, new RPC methods):
- Version requirements
- New or changed CLI flags, environment variables, config keys
- New API endpoints or methods

**Cross-references**: Link to the canonical spec page in Base Protocol for the full current state. The changelog entry records *what changed*, not the complete specification.

## Naming convention

```
{ordinal}-{hardfork}-{component}-{feature}.mdx
```

| Segment | Format | Example |
|---------|--------|---------|
| Ordinal | Two-digit hardfork number | `02` (Cobalt) |
| Hardfork | Lowercase hardfork name | `cobalt` |
| Component | Lowercase component name | `b20asset`, `policyregistry`, `node` |
| Feature | Lowercase kebab-case feature slug | `multiplier`, `composite-policy` |

Examples:
- `02-cobalt-b20asset-multiplier.mdx`
- `02-cobalt-b20-seize.mdx`
- `02-cobalt-policyregistry-composite-policy.mdx`
