<p align="center">
  <img src="./Basemark.png" alt="Base logo" width="420" />
</p>

<p align="center">
  <strong>Community-managed documentation for Base.</strong><br/>
  Help bring the world onchain by keeping these docs accurate, helpful, and up to date.
</p>

<!-- Badge row 1 - status -->

<p align="center">
  <a href="https://github.com/base/docs/graphs/contributors">
    <img src="https://img.shields.io/github/contributors/base/docs" alt="GitHub contributors" />
  </a>
  <a href="https://github.com/base/docs/graphs/contributors">
    <img src="https://img.shields.io/github/commit-activity/w/base/docs" alt="GitHub commit activity" />
  </a>
  <a href="https://github.com/base/docs/stargazers">
    <img src="https://img.shields.io/github/stars/base/docs.svg" alt="GitHub stars" />
  </a>
  <img src="https://img.shields.io/github/repo-size/base/docs" alt="GitHub repo size" />
  <a href="https://github.com/base/docs/blob/main/LICENSE.md">
    <img src="https://img.shields.io/github/license/base/docs?color=blue" alt="License" />
  </a>
</p>

<!-- Badge row 2 - links and profiles -->

<p align="center">
  <a href="https://base.org">
    <img src="https://img.shields.io/website-up-down-green-red/https/base.org.svg" alt="Base website" />
  </a>
  <a href="https://base.mirror.xyz/">
    <img src="https://img.shields.io/badge/blog-up-green" alt="Base blog" />
  </a>
  <a href="https://docs.base.org/">
    <img src="https://img.shields.io/badge/docs-up-green" alt="Base docs" />
  </a>
  <a href="https://base.org/discord">
    <img src="https://img.shields.io/discord/1067165013397213286?label=discord" alt="Base Discord" />
  </a>
  <a href="https://twitter.com/Base">
    <img src="https://img.shields.io/twitter/follow/Base?style=social" alt="Base Twitter" />
  </a>
</p>

<!-- Badge row 3 - detailed status -->

<p align="center">
  <a href="https://github.com/base/docs/pulls">
    <img src="https://img.shields.io/github/issues-pr-raw/base/docs" alt="Open pull requests" />
  </a>
  <a href="https://github.com/base/docs/issues">
    <img src="https://img.shields.io/github/issues-raw/base/docs.svg" alt="Open issues" />
  </a>
</p>

---

Base Docs are community-managed. We welcome and encourage contributions from everyone to keep these docs accurate, helpful, and up to date.

> **Note**  
> This repository powers the public Base documentation site.  
> All content lives under the `docs/` directory.

---

## Local development

**Prerequisite:** Node.js v19+

### Preview documentation locally

1. Clone the repository
2. Install the Mint CLI to preview documentation changes:

```bash
npm i -g mint
````

3. Run the local preview from the `docs/` directory (where `docs.json` lives):

```bash
cd docs
mint dev
```

Alternatively, without a global install:

```bash
npx mint dev
```

### Troubleshooting

* Ensure Node.js v19+ is installed
* Run `mint dev` from the directory containing `docs.json` (usually `docs/`)
* Local preview may differ from production — run `mint update` to update the CLI

---

## How to contribute

1. **Fork and branch**
   Fork `base/docs` and create a descriptive branch for your change.

2. **Edit content in `docs/`**
   Follow the structure and style guidelines below. Preview locally with the Mint CLI.

3. **Open a pull request**
   Provide a clear summary and links to related pages. The docs team and community will review.

> **Tip**
> Prefer small, focused PRs. Link related guides and references directly in your content.

---

## Documentation structure

### Core principle: maintain existing structure

> **Warning**
> Do not create new top-level sections. Place all new content within existing folders under `docs/`.

The Base documentation is organized into established sections, including:

* `get-started/`
* `learn/`
* `base-account/`
* `base-app/`
* `base-chain/`
* `cookbook/`
* `mini-apps/`
* `onchainkit/`

Fit new content into the most relevant existing section.

---

### Navigation policy

> **Note**
> We generally do not change the global navigation (top-level tabs) or sidebar sections unless there is a clear, broadly beneficial need.

Contributions should focus on improving existing pages or adding new pages within current sections.

---

### Section purpose and placement

* **Quickstart** – End-to-end setup to first success
* **Concepts** – Architecture, components, and design philosophy
* **Guides** – Step-by-step, action-oriented tutorials
* **Examples** – Complete, runnable real-world examples
* **Technical Reference** – API, methods, and parameters
* **Contribute** – Contributor process and updates

#### Cookbook scope

* Use case-focused guides and reusable patterns
* Cross-tool solutions rather than product-specific docs

> **Warning**
> Avoid subsection proliferation:
>
> * Keep guides at the same hierarchy level
> * Organize reference by component or feature
> * Prefer cross-links over new structural layers

---

## Style and formatting

### Writing style

1. Be concise and consistent
2. Use active voice and second person
3. Focus on the happy path
4. Use explicit, descriptive headings and filenames
5. Introduce abbreviations on first use

---

### AI-friendly content

* Use clear, explicit language
* Prefer bulleted lists when steps are not sequential
* Name libraries and tools explicitly
* Link related pages directly

> **Checklist**
>
> * Would a Large Language Model understand and follow this content?
> * Can an engineer copy, paste, and run the examples as-is?

---

### Mintlify formatting

* Start main sections with H2 (`##`) and subsections with H3 (`###`)
* Use fenced code blocks with language and optional filename
* Wrap images in `<Frame>` with descriptive `alt` text
* Use callouts: `<Note>`, `<Tip>`, `<Warning>`, `<Info>`, `<Check>`
* Prefer `<Steps>` / `<Step>` for procedures
* Use `<Tabs>` / `<Tab>` for alternatives
* For APIs, use `<ParamField>` and `<ResponseField>`

---

### Code examples

* Provide complete, runnable examples
* Include realistic data
* Handle errors and edge cases
* Specify language and filename when helpful
* Show expected output or verification steps

---

## Third-party guides policy

> **Warning**
> We generally do not accept guides that primarily document a third-party product.

Exceptions require a clear Base-focused use case and tight integration with Base products.
Simply deploying on Base or connecting to Base Account/Base App is not sufficient.

If your goal is to increase discoverability of your product, request inclusion on the **Base Ecosystem** page instead.

See:
[https://github.com/base/web?tab=readme-ov-file#updating-the-base-ecosystem-page](https://github.com/base/web?tab=readme-ov-file#updating-the-base-ecosystem-page)

---

## Review checklist (before submitting a PR)

* [ ] Fits within existing structure (no new top-level sections)
* [ ] Minimal, necessary subsections only
* [ ] Consistent terminology
* [ ] Code examples are complete and validated
* [ ] Cross-links to related guides and references included
* [ ] Correct Mintlify components and heading hierarchy
* [ ] Accessible images with descriptive `alt` text
* [ ] AI-friendly: explicit, link-rich, easy to follow

---

## Submission process

1. Create a PR to `https://github.com/base/docs`
2. Include a clear description of the change and impacted pages
3. Request review from the docs team
4. Address feedback and iterate
5. Once approved, changes will be merged and published

---

## Publishing changes

The core team reviews opened PRs on a first-come, first-served basis.
Typical SLA is **up to 2 weeks**, excluding urgent changes.

---

## Storybook for UI components

See `storybook/README.md` for details on local Storybook setup and component documentation.
