<p align="center">
<img src="./Basemark.png" alt="Base logo" width="480" />
</p>

<!-- Badge row 1 - status -->

[![GitHub contributors](https://img.shields.io/github/contributors/base/docs)](https://github.com/base/docs/graphs/contributors)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/w/base/docs)](https://github.com/base/docs/graphs/contributors)
[![GitHub Stars](https://img.shields.io/github/stars/base/docs.svg)](https://github.com/base/docs/stargazers)
![GitHub repo size](https://img.shields.io/github/repo-size/base/docs)
[![GitHub](https://img.shields.io/github/license/base/docs?color=blue)](https://github.com/base/docs/blob/main/LICENSE.md)

<!-- Badge row 2 - links and profiles -->

[![Website base.org](https://img.shields.io/website-up-down-green-red/https/base.org.svg)](https://base.org)
[![Blog](https://img.shields.io/badge/blog-up-green)](https://base.mirror.xyz/)
[![Docs](https://img.shields.io/badge/docs-up-green)](https://docs.base.org/)
[![Discord](https://img.shields.io/discord/1067165013397213286?label=discord)](https://base.org/discord)
[![Twitter Base](https://img.shields.io/twitter/follow/Base?style=social)](https://twitter.com/Base)

<!-- Badge row 3 - detailed status -->

[![GitHub pull requests by-label](https://img.shields.io/github/issues-pr-raw/base/docs)](https://github.com/base/docs/pulls)
[![GitHub Issues](https://img.shields.io/github/issues-raw/base/docs.svg)](https://github.com/base/docs/issues)

Base Docs are community-managed. We welcome and encourage contributions from everyone to keep these docs accurate, helpful, and up to date.

> Note: This repository powers the public Base documentation site. Content lives under `docs/`.

## Local development

Prerequisite: Node.js v19+.

1. Clone the repository.
2. Install the Mint CLI to preview documentation changes locally:

```bash
npm i -g mint
```

3. Preview locally (run from the `docs/` directory where `docs.json` lives):

```bash
cd docs
mint dev
```

Alternatively, without a global install:

```bash
npx mint dev
```

### Troubleshooting

- Ensure Node.js v19+ is installed and that you run `mint dev` from the directory containing `docs.json` (usually `docs/`).
- Local preview differs from production: run `mint update` to update the CLI.

## How to contribute

1. **Fork and branch**: Fork `base/docs` and create a descriptive branch for your change.
2. **Edit content in `docs/`**: Follow the structure and style guidelines below. Preview locally with the Mint CLI.
3. **Open a pull request**: Provide a clear summary and links to related pages. The docs team and community will review.

> Tip: Prefer small, focused PRs. Link related guides and references directly in your content.

## Documentation structure

### Core principle: maintain existing structure

> Warning: Do not create new top-level sections. Place all new content within existing folders under `docs/`.

The Base documentation is organized into established sections (for example: `get-started/`, `learn/`, `base-account/`, `base-app/`, `base-chain/`, `cookbook/`, `mini-apps/`, `onchainkit/`). Fit new content into the most relevant existing section.

### Navigation policy

> Note: We generally do not change the global navigation (top-level tabs) or sidebar sections unless there is a clear, broadly beneficial need. Contributions should focus on improving existing pages and adding new pages within current sections.

### Section purpose and placement

- **Quickstart**: End-to-end setup to first success. Keep concise and current.
- **Concepts**: Explanations of components, architecture, and design philosophy.
- **Guides**: Step-by-step, action-oriented tutorials for specific tasks.
- **Examples**: Complete, runnable examples demonstrating real-world usage.
- **Technical Reference**: API/method/component specs with parameters and return types.
- **Contribute**: Information for contributors and process updates.

#### Cookbook scope

- The `cookbook/` section hosts use case-focused guides and patterns, not product-specific documentation.
- Prefer cross-cutting solutions that illustrate how to build on Base across tools and scenarios.

> Warning: Avoid subsection proliferation:
> - Put all guides at the same level within the Guides section.
> - Organize Reference by component/feature, not per use case.
> - Use cross-links instead of adding new structural layers.

## Style and formatting

### Writing style

1. Be concise and consistent; use active voice and second person.
2. Focus on the happy path; mention alternatives briefly where relevant.
3. Use explicit, descriptive headings and filenames.
4. Maintain consistent terminology; introduce abbreviations on first use.

### AI-friendly content

- Use clear, explicit language and link related pages directly.
- Prefer bulleted lists for options/steps when not sequential.
- Name and reference libraries and tools explicitly.
- Use semantic, readable URLs and avoid ambiguous abbreviations.

> Checklist:
> - Would a Large Language Model understand and follow this content?
> - Can an engineer copy, paste, and run the examples as-is?

### Mintlify formatting

- Start main sections with H2 (`##`) and subsections with H3 (`###`).
- Use fenced code blocks with language and optional filename.
- Wrap images in `<Frame>` and include `alt` text.
- Use callouts for emphasis: `<Note>`, `<Tip>`, `<Warning>`, `<Info>`, `<Check>`.
- For procedures, prefer `<Steps>` / `<Step>`.
- For alternatives, use `<Tabs>` / `<Tab>`.
- For API docs, use `<ParamField>`, `<ResponseField>`, and request/response examples.

### Code examples

- Provide complete, runnable examples with realistic data.
- Include proper error handling and edge cases.
- Specify language and filename when helpful.
- Show expected output or verification steps.

## Third-party guides policy

> Warning: We generally do not accept guides that primarily document a third-party product. Exceptions require a clear Base-focused use case and a tight integration with Base products. Simply deploying on Base or connecting to Base Account/Base App is not sufficient.

If your goal is to increase discoverability of your product, please request inclusion on the Base Ecosystem page instead. See the instructions for [updating the Base Ecosystem page](https://github.com/base/web?tab=readme-ov-file#updating-the-base-ecosystem-page).

## Review checklist (before submitting a PR)

- [ ] Fits within existing structure (no new top-level sections)
- [ ] Minimal, necessary subsections only
- [ ] Consistent terminology; abbreviations introduced on first use
- [ ] Code examples are complete, runnable, and validated
- [ ] Cross-links to related guides/examples/references are included
- [ ] Uses Mintlify components and heading hierarchy correctly
- [ ] Accessible images with descriptive `alt` text and frames
- [ ] AI-friendly: explicit, link-rich, and easy to follow

## Submission process

1. Create a PR to `https://github.com/base/docs` with your changes.
2. Include a clear description of the change and impacted pages.
3. Request review from the docs team.
4. Address feedback and iterate.
5. Once approved, changes will be merged and published.

## Publishing changes

The core team will review opened PRs. The SLA is 2 weeks, generally on a first-come, first-served basis outside of urgent changes. 

## Storybook for UI components

See `storybook/README.md` for details on local Storybook and component docs.

docs: update documentation for better builder onboarding
