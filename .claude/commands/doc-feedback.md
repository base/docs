# Documentation Feedback

Review changed documentation for quality, consistency, and adherence to the style guide.

## Instructions

### 1. Identify files to review

Get the changed MDX files:

```bash
git diff --name-only HEAD -- '*.mdx'
git diff --name-only master...HEAD -- '*.mdx'
```

If `$ARGUMENTS` is provided, review that specific file or path instead.

### 2. Run the deterministic linter first

```bash
node scripts/lint-mdx.js $ARGUMENTS
```

If there are errors, note them but continue with the content review.

### 3. Review against the style guide

Read `content-instructions.md` for the full style guide. Check each file for:

**Language and style:**
- Clear, direct language for technical audiences
- Second person ("you") for instructions
- Active voice over passive voice
- Present tense for current states
- Consistent terminology throughout
- Concise sentences with necessary context
- Parallel structure in lists and headings

**Content organization:**
- Most important information first (inverted pyramid)
- Progressive disclosure: basic before advanced
- Complex procedures broken into numbered steps
- Expected outcomes provided for major steps
- Descriptive, keyword-rich headings
- Logical grouping with clear section breaks

**User-centered approach:**
- Focus on user goals, not system features
- Common questions anticipated and addressed
- Troubleshooting for likely failure points
- Scannable with headings, lists, white space
- Verification steps to confirm success

**Code examples:**
- Complete, runnable examples users can copy
- Proper error handling shown
- Realistic data instead of placeholders
- Expected outputs included
- Complex logic has explanatory comments
- No real API keys or secrets

**Accessibility:**
- Descriptive alt text for images
- Specific link text (not "click here")
- Proper heading hierarchy (start with H2)
- Content structured for scanning

### 4. Provide feedback

For each file reviewed, provide:

```
## [filename]

### ✅ What's working well
- [specific positive observations]

### 🔧 Suggestions
- **[Section/Line]**: [specific issue] → [suggested fix]

### ⚠️ Linter issues (if any)
- [issues from the linter output]
```

### 5. Offer to help

After providing feedback, ask if the user wants help:
- Fixing specific issues
- Rewriting sections
- Adding missing content

## Review checklist

Use this checklist to ensure thorough review:

- [ ] Terminology is consistent throughout
- [ ] Examples follow standard format (filename/title, language, highlights)
- [ ] All required sections are present (frontmatter, clear structure)
- [ ] Language is clear and direct
- [ ] Instructions use second person and active voice
- [ ] Code examples are complete and runnable
- [ ] No placeholder values like "foo", "bar", "example.com"
- [ ] Headings are descriptive and keyword-rich
- [ ] Content is scannable (headings, lists, white space)
- [ ] Troubleshooting included where appropriate
