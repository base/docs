---
name: writing-spec-pages
description: Structures and writes Specifications-tab pages (overview, reference, supporting, changelog summary). Use when adding or editing a page under docs/specifications/ or any protocol/contract/interface spec.
---

# Writing Specification Pages

Full rules: [Specification Pages](../../docs/content-guidelines.md#specification-pages) in content-guidelines.md.

## 1. Identify the page type

Every spec feature is built from up to four page types — not every feature needs all four:

| Page type | Purpose |
|---|---|
| **Overview / index** | What the feature is, why it exists, how pieces fit together |
| **Reference page** | One page per contract/interface/component; exhaustive (every function, error, event, constant) |
| **Supporting page** | Constants, errors, events, invariants, test cases collected across the subsystem |
| **Changelog summary** | Per-hardfork summary of what changed, linking to Upgrades-tab detail entries |

A single-page feature (e.g., network fees) can be one overview page. A multi-contract system needs the full set.

## 2. Structure by page type

**Overview / index**: status note (if hardfork-specific) → introduction (1-2 paragraphs, no history/preamble) → key concepts (tables for enumerations) → architecture/component map with links → cross-references to Build on Base guides and the changelog summary.

**Reference page**: title (contract/interface name) → one-sentence description → functions (grouped logically, not alphabetically — each with Solidity signature, parameters table, return values, access control, behavioral notes) → events → errors.

**Supporting page**: constants/addresses as a table (name, value, description); errors/events collected in tables tagged with their owning interface; invariants stated in plain language next to the test assertion/reference.

**Changelog summary**: hardfork table (ordinal, name, status) → per-hardfork sections newest-first, heading linking to the Upgrades-tab overview → table of changes linking to Upgrades detail entries → no detail content (link out, don't duplicate).

## 3. Writing rules — check every draft against these

- **Normative, not tutorial**: "The batcher encodes L2 blocks into channels," not "To submit data, you encode blocks into channels."
- **Behavior first, not motivation**. Motivation belongs in the changelog entry, not the spec.
- **Code before prose**: show the Solidity signature, then explain it.
- **Tables for enumerations** (roles, policy types, error codes, constants) — never bullet lists.
- **Diffs for changes**: show before/after code in changelog entries, not a paragraph describing the difference.
- **One concept per section** — split sections that cover two unrelated behaviors.
- **Link, don't duplicate** — reference pages link to the overview; the overview links to reference pages. Neither copies the other.

## 4. Sidebar grouping

A feature gets a nested sidebar group (like B20, Bridging, Proofs) only at 3+ pages. Features with 1-2 pages sit as flat entries or single-page groups in the parent group — see the [docs-ia](docs-ia.md) skill for the redundant-sidebar-label rule that applies here.

## 5. Placement

Confirm the feature belongs in Specifications (not Build on Base) using the [docs-ia](docs-ia.md) skill — Specifications is concept/spec-oriented; how-to guides that *use* the spec belong in Build on Base.
