---
name: docs-ia
description: Determines which tab and section a new documentation page belongs in. Use when adding new pages, reorganizing content, or reviewing where something should go in the docs navigation.
---

# Documentation IA guidelines

Read the full guidelines:

```bash
cat docs/ia-guidelines.md
```

## Quick decision tree

When adding a new page, ask in order:

1. **Is it a protocol specification?** → Specifications tab
2. **Is it a hardfork change or migration guide?** → Changelog tab
3. **Is it SDK or API documentation?** → SDKs & APIs tab
4. **Does it teach how to build a specific product?** → Build on Base tab
5. **Is it about connecting infrastructure to Base?** → Base Protocol tab
6. **Is it an entry point for new developers?** → Get Started tab

## Workflow

1. Read `docs/ia-guidelines.md` for full tab and section descriptions
2. Identify the correct tab and section using the decision tree
3. Suggest placement with reasoning
4. If moving a page, add a redirect in `docs/docs.json`
