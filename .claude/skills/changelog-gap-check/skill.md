# changelog-gap-check

Check a changelog entry for progressive-discovery ordering and content quality.

## When to use

Invoke with `/changelog-gap-check <path>` where `<path>` is the absolute or repo-relative path to a changelog markdown file (e.g. `changelog/02_Cobalt_B20_seize.md`).

## What this skill does

This is a **read-only audit**. It produces a report with reorder suggestions and consolidation recommendations — it does not modify the file.

### 1. Progressive-discovery check

For each section (delimited by `##` headings), scan the bullet points and sentences in order. A concept (identifier, acronym, named entity) must be **introduced before it is referenced**. If sentence/bullet N references concept X but concept X is first defined or introduced at sentence/bullet M where M > N, flag it as an ordering violation.

**How to detect:**
- Extract named concepts: function names, role names, policy names, event names, error names, acronyms, and domain terms that are not common English.
- For each concept, record its first-mention position (section + bullet/sentence index).
- If a reference appears before its introduction within the same section, report it.

**Output format for each violation:**
```
REORDER: section "<heading>"
  - "<text of bullet/sentence referencing X>" (line ~N)
    references `X`, first introduced at line ~M ("<text introducing X>")
  → Suggest: move introduction before first reference
```

### 2. Duplicate/redundant content check

Scan across all sections for bullets or sentences that convey the same information. Flag pairs where:
- The same fact is stated in two places (even with different wording).
- A later bullet restates what an earlier bullet already covered.

**Output format:**
```
DUPLICATE:
  - line ~N: "<text A>"
  - line ~M: "<text B>"
  → Suggest: consolidate into a single bullet, keep in whichever section introduces it first
```

### 3. Point-form style recommendations

For any paragraph-style prose that could be tightened into point-form technical English, suggest a rewrite. Technical English means:
- Active voice, present tense
- One fact per bullet
- No filler words ("it should be noted that", "in order to", "basically")
- Named subjects (not "it" or "this" without antecedent)

**Output format:**
```
STYLE: line ~N
  Original: "<original text>"
  Suggested: 
  - <rewritten bullet 1>
  - <rewritten bullet 2>
```

### 4. Motivation gap detection (what without why)

Scan for statements that introduce a NEW capability, behavior change, or design decision without explaining the problem it solves or the reason it exists.

**Symptoms to flag:**
- "allows X to Y" / "enables X" / "adds support for X" without a preceding or following "because" / "so that" / problem statement
- Specs sections that describe HOW a mechanism works (storage layout, gas, ordering, event sequence) without stating WHY it matters to the reader
- Design-decision bullets that state a choice without rationale ("we chose X" with no "because Y")

**What is NOT a gap (do not flag):**
- A feature whose motivation is explained earlier in the same document (Summary or Motivation section) does not need re-explanation in Specs — unless the Specs section exceeds ~30 lines, at which point a reader skimming only that section loses context
- Standard interface conformance ("ERC-8056 conformant") is a valid WHY when the standard is linked or named
- Backwards-compatibility statements ("unchanged for back-compat") are self-motivating
- Q&A pairs in a "Guarantees and edge cases" section — these answer "how does it behave?" which is their purpose

**Output format:**
```
WHY-GAP: line ~N, section "<heading>"
  Statement: "<the text that describes what>"
  Missing: motivation / problem statement — why does this capability exist?
  Hint: <one-sentence prompt to help the author fill the gap>
```

**Example:**
```
WHY-GAP: line ~12, section "Summary"
  Statement: "The new scheduled path allows issuers to define a new multiplier in advance and activate it at a specific future timestamp."
  Missing: motivation — why do issuers need advance scheduling rather than instant updates?
  Hint: State the operational driver (e.g., corporate actions require advance notice to exchanges/custodians before the multiplier flips).
```

## Output structure

```
# Changelog Audit: <filename>

## Progressive Discovery
### Section: <heading>
<violations or "✓ No ordering issues">

## Duplicates
<pairs or "✓ No duplicates found">

## Style Suggestions
<suggestions or "✓ All content is already in point-form technical English">

## Motivation Gaps
<WHY-GAP entries or "✓ All new capabilities are motivated">

## Summary
- Ordering violations: N
- Duplicate pairs: N  
- Style suggestions: N
- Motivation gaps: N
```

## Rules

- Do NOT edit the file. Report only.
- If the user passes `--fix`, then apply the suggested reorderings and consolidations directly to the file. Still output the report showing what changed.
- Treat markdown tables as atomic units — do not reorder rows within a table for progressive discovery (tables have their own sort order conventions).
- Ignore the audience blockquote (`> **Audience:**...`) — it's introductory framing, not subject to reorder.
- Cross-section references are fine: a concept introduced in an earlier section can be referenced in a later section without violation.
- Only flag ordering issues within the same `##` section.
