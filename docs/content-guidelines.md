# Content Guidelines

Writing rules, specification page structure, and changelog entry format for Base documentation.

---

## Writing Rules

### Language and Style

- Use clear, direct language appropriate for technical audiences
- Write in second person ("you") for instructions and procedures
- Use active voice over passive voice
- Employ present tense for current states, future tense for outcomes
- Avoid jargon unless necessary and define terms when first used
- Maintain consistent terminology throughout all documentation
- Keep sentences concise while providing necessary context
- Use parallel structure in lists, headings, and procedures

### Content Organization

- Lead with the most important information (inverted pyramid structure)
- Use progressive disclosure: basic concepts before advanced ones
- Break complex procedures into numbered steps
- Only include prerequisites and context before instructions when necessary for instructions to be understood
- Provide expected outcomes for each major step
- Use descriptive, keyword-rich headings for navigation and SEO
- Group related information logically with clear section breaks

### User-Centered Approach

- Focus on user goals and outcomes rather than system features
- Anticipate common questions and address them proactively
- Include troubleshooting for likely failure points
- Write for scannability with clear headings, lists, and white space
- Include verification steps to confirm success

### Required Page Structure

Every documentation page must begin with YAML frontmatter:

```yaml
---
title: "Clear, specific, keyword-rich title"
description: "Concise description explaining page purpose and value"
---
```

### Code Examples

- Every code block must have a filename or a title
    - if filename, add filename after language (e.g. ```typescript page.tsx```)
    - if title, add Title followed by the title (e.g. ```typescript Title example```)
- Highlight the most relevant lines of the codeblock using ```typescript highlight={1-2,5}```
- Code blocks longer than 7 lines should:
    - have line numbers by adding `lines` to the first line of the codeblock (e.g. ```typescript lines```)
    - be marked as `expandable` by adding to the first line of the codeblock
- use `wrap` to prevent horizontal scrolling of codeblocks
- Always include complete, runnable examples that users can copy and execute
- Show proper error handling and edge case management
- Use realistic data instead of placeholder values
- Include expected outputs and results for verification
- Add explanatory comments for complex logic
- Never include real API keys or secrets in code examples

### API Documentation

- Document all parameters including optional ones with clear descriptions
- Show both success and error response examples with realistic data
- Include rate limiting information with specific limits
- Provide authentication examples showing proper format
- Explain all HTTP status codes and error handling
- Cover complete request/response cycles

### Accessibility

- Include descriptive alt text for all images and diagrams
- Use specific, actionable link text instead of "click here"
- Ensure proper heading hierarchy starting with H2
- Provide keyboard navigation considerations
- Use sufficient color contrast in examples and visuals
- Structure content for easy scanning with headers and lists

### Component Selection

- Use **Steps** for procedures and sequential instructions
- Use **Tabs** for platform-specific content or alternative approaches
- Use **CodeGroup** when showing the same concept in multiple programming languages or frameworks
- Use **Accordions** for progressive disclosure of information
- Use **RequestExample/ResponseExample** specifically for API endpoint documentation
- Use **ParamField** for API parameters, **ResponseField** for API responses
- Use **Expandable** for nested object properties or hierarchical information

---

## Specification Pages

Content structure and writing guidelines for Specifications pages.

### Page Types

Every feature or subsystem in the Specifications tab uses a combination of these page types:

| Page type | Purpose | Example |
|-----------|---------|---------|
| **Overview / index** | What this feature is, why it exists, how the pieces fit together. Entry point for the subsystem. | B20 specification, Proofs index, Consensus index |
| **Reference page** | One page per contract, interface, or component. Exhaustive: every function, error, event, constant. | IB20, IB20Asset, IPolicyRegistry |
| **Supporting page** | Constants, errors, events, invariants, or test cases collected across the subsystem. | B20 constants and addresses, B20 errors and events |
| **Changelog summary** | Per-hardfork summary of what changed in this feature, linking out to detail entries in the Upgrades tab. | B20 changelog |

Not every feature needs all four types. A single-page feature (e.g., network fees) can be one overview page. A multi-contract system (e.g., B20, proofs) needs the full set.

### Page Structure

#### Overview / Index Pages

1. **Status note** — if the spec is tied to a specific hardfork, state which one (e.g., "This is the normative Beryl specification for B20.")
2. **Introduction** — 1–2 paragraphs: what the feature is and what problem it solves. No preamble or history.
3. **Key concepts** — the core abstractions a reader needs before diving into reference pages. Use tables for enumerations (roles, policy types, variants). Use short prose for behavioral concepts.
4. **Architecture / component map** — for multi-component systems, list the components and what each one does. Link to the individual reference pages.
5. **Cross-references** — link to related Build on Base guides ("To deploy a B20 token, see Issue Stablecoins") and the changelog summary page.

#### Reference Pages

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

#### Supporting Pages

- **Constants and addresses** — table format: name, value, description. Group by contract or purpose.
- **Errors and events** — collected across the subsystem when they span multiple interfaces. Use tables with the interface they belong to.
- **Invariants and tests** — state the invariant in plain language, then the test assertion or reference to the test file.

#### Changelog Summary Pages

1. **Hardfork table** — list all hardforks that touched this feature, with ordinal, name, and status.
2. **Per-hardfork section** — newest first. Each section:
   - Heading links to the hardfork overview in the Upgrades tab (e.g., `## [Cobalt](/upgrades/cobalt/overview)`)
   - Table of changes with links to the detail entries in the Upgrades tab
   - For the initial release hardfork: summary of what shipped (Added / Deprecated lists)
3. **No detail content** — the summary page links out, it doesn't duplicate. The Upgrades tab owns the migration details.

### Writing Rules for Spec Pages

- **Be normative, not tutorial**. Spec pages define how something works, not how to use it. "The batcher encodes L2 blocks into channels" not "To submit data, you encode blocks into channels."
- **Lead with behavior, not motivation**. Save motivation for the changelog. The spec describes the current state.
- **Code over prose**. Show the Solidity signature, then explain. Don't describe a function without showing it.
- **Tables for enumerations**. Roles, policy types, error codes, constants — always tables, never bullet lists.
- **Diffs for changes**. When documenting what changed between hardforks (in changelog entries), show before/after code, not a paragraph describing the difference.
- **One concept per section**. If a section covers two unrelated behaviors, split it.
- **Link, don't duplicate**. Reference pages link to the overview for context. The overview links to reference pages for detail. Neither copies the other.

### Grouping Rules

A feature gets a nested group in the sidebar (like B20, Bridging, Proofs) when it has 3+ pages. Features with 1–2 pages sit as flat entries in the parent group.

Content is organized by topic (B20, Bridging, Transactions, Consensus, Execution, Proofs, etc.), not by abstraction level. Each topic group flows from user-facing overview to deep protocol spec. A feature gets a nested group in the sidebar when it has 3+ pages; features with 1–2 pages sit as flat entries or single-page groups.

---

## Changelog Entries

Changelog entries follow a consistent structure inspired by improvement proposals (TIPs, EIPs). Not every section applies to every change — a node upgrade looks different from a new contract interface. Use the sections that fit; skip the rest.

### Core Sections

Every changelog entry should include these:

| Section | Purpose |
|---------|---------|
| **Abstract** | One-paragraph summary: what changed, what it affects, which hardfork introduces it. |
| **Motivation** | Why this change exists — the problem, limitation, or opportunity it addresses. |
| **What changed** | The substance of the change. Structure depends on the type of change (see below). |
| **Migration** | What developers or operators need to do. Breaking changes, deprecations, new defaults, upgrade steps. |

### Optional Sections

Include when relevant:

| Section | When to include |
|---------|-----------------|
| **Alternatives considered** | Non-trivial design decisions where other approaches were evaluated. |
| **Test cases** | Key scenarios that validate the change. Reference invariant tests where applicable. |

### Structuring "What Changed"

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

### Naming Convention

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
