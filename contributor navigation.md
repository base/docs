# Base Documentation (Navigation Guide)

Welcome to the **Base Docs** repository — the source for the official Base developer documentation. This README helps you **navigate the repo structure**, understand the **purpose of key folders/files**, and quickly find what you need to contribute or explore content.

The documentation is published at https://docs.base.org/docs. :contentReference[oaicite:1]{index=1}

---

## 📦 Repo Overview

This repository contains:

/
├── .github/ # GitHub configuration (issues templates, workflows)
├── docs/ # All public documentation content
├── storybook/ # UI component docs & previews
├── README.md # This file
├── content-instructions.md # Writing & contribution guidelines
├── global-tone-voice.mdx # Writing style guidance
├── mintlify-reference.md # Mintlify MDX reference
└── package-lock.json # Package lock for local development


---

## 📌 Top-Level Files

### 📝 `README.md`

This file — *navigation guide* — for visitors and contributors.

### 📚 `content-instructions.md`

Guidelines to help you write and structure docs content consistently.

### 🗣️ `global-tone-voice.mdx`

Defines the Base docs writing style (tone, voice, terminology).

### 📘 `mintlify-reference.md`

Reference for the Markdown components and formatting supported in the docs.

---

## 📁 `docs/` — The Heart of the Docs

All public documentation is inside the `docs/` folder. This content powers the Base docs site. :contentReference[oaicite:2]{index=2}

Typical organization inside this folder mirrors the doc site navigation:



docs/
├── get-started/ # Quickstarts for new builders
├── learn/ # Concepts and foundational topics
├── base-account/ # Smart accounts & wallet flows
├── base-app/ # App building guides
├── base-chain/ # Chain details and network info
├── cookbook/ # Recipes & patterns
├── mini-apps/ # Mini app platform docs
├── onchainkit/ # SDK & integration guides
└── …other sections…


📌 **Don’t add new top-level folders** — place new content in the most relevant existing section. :contentReference[oaicite:3]{index=3}

---

## 🚀 Getting Started Locally

You can preview changes locally:

1. **Install Node.js** (v19+).
2. **Install the Mint CLI**:
   ```bash
   npm i -g mint


Run the docs locally:

cd docs
mint dev


Alternatively, run with:

npx mint dev

🤝 How to Contribute

We welcome contributions! Here’s a quick flow:

Fork the repo and create a descriptive branch.

Edit or add files in the appropriate docs/... folder.

Preview locally using the steps above.

Open a Pull Request with a clear summary of your change.

Tips

Keep PRs focused and small.

Link to related docs when applicable.

Fit new content into existing structure — avoid introducing new top-level sections.

🙋‍♂️ Navigation Tips

Use the folder structure to locate the topic area first (e.g., docs/base-app/ for app guides).

Follow naming and organization conventions from other sections for consistency.

If you’re adding examples or new guides, reference similar files in other sections.

📖 Helpful Links

🌐 Official Base Docs Site: https://docs.base.org/docs

✍️ Content guidelines: content-instructions.md

🧠 Writing style: global-tone-voice.mdx

📌 Formatting reference: mintlify-reference.md

Thanks for contributing to Base docs!


---

If you want, I can also generate **a PR description template** you can use when opening your first contribution to this repo.
::contentReference[oaicite:6]{index=6}
