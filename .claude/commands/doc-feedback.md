# Documentation Feedback

Review changed (or specified) docs for quality, style-guide adherence, and IA placement.

This command runs the [reviewing-documentation](../skills/doc-feedback.md) skill workflow:

1. Get files to review (`git diff --name-only` against `HEAD` and `master...HEAD`, or `$ARGUMENTS` if provided)
2. Run `node scripts/lint-mdx.js $ARGUMENTS` first
3. Review against [content-guidelines.md](../../docs/content-guidelines.md)
4. Review against [ia-guidelines.md](../../docs/ia-guidelines.md) using the [docs-ia](../skills/docs-ia.md) skill (only when pages are added/moved/renamed or `docs.json` changes)
5. If the PR touches a Specifications page or a changelog entry, apply the [writing-spec-pages](../skills/spec-pages.md) / [writing-changelog-entries](../skills/changelog-entries.md) skills
6. Check MDX component usage against [mintlify-components](../skills/mintlify-components.md)
7. Anticipate CI checks and required approvals for protected surfaces (see the skill's step 5 for the full list)
8. Report feedback per file using the skill's review checklist
9. Offer to fix issues if requested

See [.claude/skills/doc-feedback.md](../skills/doc-feedback.md) for the full workflow and checklist — this command is a thin entry point into that skill.
