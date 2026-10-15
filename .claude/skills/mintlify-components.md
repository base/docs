---
name: mintlify-components
description: Picks the correct Mintlify component and syntax while authoring or editing MDX pages. Use when writing new documentation content, not just when linting existing content.
---

# Mintlify Component Selection

Reference: [mintlify-reference.md](../../docs/mintlify-reference.md) for full syntax and examples.

## Decision guide

Ask what the content *is*, then pick the matching component:

| Content is... | Use |
|---|---|
| A sequential procedure | `<Steps>` / `<Step title="...">` |
| Platform- or framework-specific variants of the same task | `<Tabs>` / `<Tab title="...">` |
| The same concept shown in multiple languages | `<CodeGroup>` with one labeled code block per language |
| Optional or advanced detail that would clutter the main flow | `<Accordion>` / `<AccordionGroup>` |
| An API endpoint's request | `<RequestExample>` |
| An API endpoint's response | `<ResponseExample>` |
| An API parameter | `<ParamField path\|body\|query\|header="..." type="..." required?>` |
| An API response field | `<ResponseField name="..." type="...">` |
| A nested object property | `<Expandable title="...">` inside a `<ResponseField>`/`<ParamField>` |
| A short pointer to related content | `<Card title="..." icon="..." href="...">`, grouped in `<CardGroup cols={N}>` when there are several |
| Information that could be missed scanning the page | A callout — see below. Use sparingly. |
| An image | `<Frame>` wrapping an `<img>` with a descriptive `alt` |

## Callout selection

Only when skimmable content could otherwise be missed:

| Callout | For |
|---|---|
| `<Note>` | Supplementary information that doesn't interrupt the main flow |
| `<Tip>` | Best practices, shortcuts, expert advice |
| `<Warning>` | Breaking changes, destructive actions, critical cautions |
| `<Info>` | Neutral background/context |
| `<Check>` | Success confirmations |

Don't stack multiple callouts back-to-back as a substitute for prose — that's a sign the content needs restructuring instead.

## Required attributes (the linter enforces these, but get them right the first time)

- `<CodeGroup>` blocks: every fenced block needs a language **and** a label (`` ```javascript Node.js ``)
- `<Card>`: `title` and `href`
- `<CardGroup>`: `cols`
- `<ParamField>`: one of `path`/`body`/`query`/`header`, plus `type`, plus `required` or `default`
- `<ResponseField>`: `name` and `type`
- `<img>`: `alt`, always wrapped in `<Frame>`

## Common mistakes

- HTML comments (`<!-- -->`) instead of MDX comments (`{/* */}`)
- Typo'd callout names (`<Warnings>` instead of `<Warning>`)
- Unclosed components
- `docs.json` navigation referencing a component syntax that doesn't match [docs.json schema](https://mintlify.com/docs.json)

After authoring, run the [linting-mdx](lint.md) skill to catch anything missed.
