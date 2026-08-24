# Specifications content guidelines

Content structure and writing guidelines for Base Protocol specification pages — Core Primitives and Network Systems.

---

## Page types

Every feature or subsystem in Core Primitives and Network Systems uses a combination of these page types:

| Page type | Purpose | Example |
|-----------|---------|---------|
| **Overview / index** | What this feature is, why it exists, how the pieces fit together. Entry point for the subsystem. | B20 specification, Proofs index, Consensus index |
| **Reference page** | One page per contract, interface, or component. Exhaustive: every function, error, event, constant. | IB20, IB20Asset, IPolicyRegistry |
| **Supporting page** | Constants, errors, events, invariants, or test cases collected across the subsystem. | B20 constants and addresses, B20 errors and events |
| **Changelog summary** | Per-hardfork summary of what changed in this feature, linking out to detail entries in the Changelog tab. | B20 changelog |

Not every feature needs all four types. A single-page feature (e.g., network fees) can be one overview page. A multi-contract system (e.g., B20, proofs) needs the full set.

---

## Page structure

### Overview / index pages

1. **Status note** — if the spec is tied to a specific hardfork, state which one (e.g., "This is the normative Beryl specification for B20.")
2. **Introduction** — 1–2 paragraphs: what the feature is and what problem it solves. No preamble or history.
3. **Key concepts** — the core abstractions a reader needs before diving into reference pages. Use tables for enumerations (roles, policy types, variants). Use short prose for behavioral concepts.
4. **Architecture / component map** — for multi-component systems, list the components and what each one does. Link to the individual reference pages.
5. **Cross-references** — link to related Build on Base guides ("To deploy a B20 token, see Issue Stablecoins") and the changelog summary page.

### Reference pages

1. **Title** — the contract or interface name (e.g., "IB20Asset")
2. **Description** — one sentence on what this interface does
3. **Functions** — every function, grouped logically (not alphabetically). For each:
   - Solidity signature in a code block
   - Parameters table: name, type, description
   - Return values
   - Access control (which role gates it)
   - Behavioral notes (reverts, edge cases)
4. **Events** — signature and field descriptions
5. **Errors** — signature and when each is thrown

### Supporting pages

- **Constants and addresses** — table format: name, value, description. Group by contract or purpose.
- **Errors and events** — collected across the subsystem when they span multiple interfaces. Use tables with the interface they belong to.
- **Invariants and tests** — state the invariant in plain language, then the test assertion or reference to the test file.

### Changelog summary pages

1. **Hardfork table** — list all hardforks that touched this feature, with ordinal, name, and status.
2. **Per-hardfork section** — newest first. Each section:
   - Heading links to the hardfork overview in the Changelog tab (e.g., `## [Cobalt](/base-chain/specs/upgrades/cobalt/overview)`)
   - Table of changes with links to the detail entries in the Changelog tab
   - For the initial release hardfork: summary of what shipped (Added / Deprecated lists)
3. **No detail content** — the summary page links out, it doesn't duplicate. The Changelog tab owns the migration details.

---

## Writing rules for spec pages

- **Be normative, not tutorial**. Spec pages define how something works, not how to use it. "The batcher encodes L2 blocks into channels" not "To submit data, you encode blocks into channels."
- **Lead with behavior, not motivation**. Save motivation for the changelog. The spec describes the current state.
- **Code over prose**. Show the Solidity signature, then explain. Don't describe a function without showing it.
- **Tables for enumerations**. Roles, policy types, error codes, constants — always tables, never bullet lists.
- **Diffs for changes**. When documenting what changed between hardforks (in changelog entries), show before/after code, not a paragraph describing the difference.
- **One concept per section**. If a section covers two unrelated behaviors, split it.
- **Link, don't duplicate**. Reference pages link to the overview for context. The overview links to reference pages for detail. Neither copies the other.

---

## Grouping rules

### When a feature gets its own nav group

A feature gets a nested group in the sidebar (like B20, Bridging, Proofs) when it has 3+ pages. Features with 1–2 pages sit as flat entries in the parent group.

### Core Primitives vs. Network Systems

| Core Primitives | Network Systems |
|-----------------|-----------------|
| Things developers interact with directly | Protocol internals that power the chain |
| User-facing behavior: tokens, transactions, fees, bridges | Infrastructure: batcher, derivation, execution, proofs |
| "What can I do on Base?" | "How does Base work under the hood?" |
| Audience: app developers, integrators | Audience: protocol engineers, node operators, researchers |
