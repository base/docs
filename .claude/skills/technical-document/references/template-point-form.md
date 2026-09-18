# Point-form template mapping

The canonical source template is:

```text
changelog/TEMPLATE_POINT_FORM.md
```

The skill converts the template into prose without changing its structure.

## Section mapping

| Source content | Written specification section |
| --- | --- |
| Feature name, start date, authors, title | Document metadata |
| Summary bullets | `## Summary` |
| Problem and rationale | `## Motivation` |
| Prior art, standards, prerequisites, terminology | `## Background` |
| Functions, events, errors, signatures, selectors | `### Interface Changes` |
| Execution, storage, gas, compatibility | `### Behavioural Changes` |
| Before/after snippets and call sequences | `### Examples` |
| Chosen approach and rejected options | `## Design Decisions & Alternatives Considered` |
| Integrator adoption and compatibility actions | `## Migration Steps` |

## Required headings

```text
## Summary
## Motivation
## Background
## Specs
### Interface Changes
### Behavioural Changes
### Examples
## Design Decisions & Alternatives Considered
## Migration Steps
```

Do not add headings such as `Goals`, `Risks`, `Open Questions`, `Decision`, or
`Rollout`. Place that content in the closest required section.
