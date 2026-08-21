---
name: reviewing-documentation
description: Reviews documentation for quality, consistency, and style guide adherence. Use when reviewing changed docs or before publishing new content.
updated: 2026-01-28
version: 2.0
---

# Documentation Review Skill

This skill provides a systematic approach to reviewing documentation for quality, consistency, and adherence to style guidelines.

## When to Use This Skill

Use this skill when you need to:

- Review documentation changes before merging
- Audit existing documentation for quality issues
- Ensure new content follows established guidelines
- Prepare documentation for publication
- Conduct quality assurance on technical writing

## Workflow

### Step 1: Identify Files to Review

Determine which documentation files need review using one of these methods:

```bash
# Review files changed in current commit
git diff --name-only HEAD -- '*.mdx' '*.md'

# Review files changed between branches
git diff --name-only master...HEAD -- '*.mdx' '*.md'

# Review files in a specific directory
find docs/ -name '*.mdx' -o -name '*.md'
```

If specific file paths are provided as arguments, review those files directly.

### Step 2: Run Automated Linting

Before manual review, run any available linters to catch common issues:

```bash
# Run MDX linter if available
node scripts/lint-mdx.js $ARGUMENTS

# Run markdown linter
markdownlint '**/*.md' '**/*.mdx'

# Check for broken links
node scripts/check-links.js
```

Document any linter errors or warnings for inclusion in the review feedback.

### Step 3: Manual Review Against Style Guide

Review each file against the project's style guide. Reference the content instructions document for specific guidelines:

- [content-instructions.md](../../content-instructions.md)

### Step 4: Provide Structured Feedback

For each file reviewed, provide feedback in this format:

#### Strengths

Highlight what's working well in the documentation.

#### Issues Found

List specific issues with:
- Line references or section names
- Description of the problem
- Severity level (critical, important, minor)

#### Recommendations

Provide actionable suggestions for improvement.

#### Linter Results

Include any automated linting issues discovered.

### Step 5: Offer Remediation

After providing feedback, ask if you should:
- Fix the issues directly
- Provide code snippets for fixes
- Create a pull request with corrections

## Review Checklist

Use this checklist to ensure comprehensive review coverage:

```markdown
### Content Quality
- [ ] Terminology used consistently throughout
- [ ] Technical accuracy verified
- [ ] Information current and up-to-date
- [ ] No outdated references or deprecated content

### Code Examples
- [ ] All code examples are complete
- [ ] Code examples are runnable/testable
- [ ] No placeholder values (foo, bar, example.com)
- [ ] Code examples follow project conventions
- [ ] Error handling demonstrated where appropriate

### Structure and Formatting
- [ ] Headings are descriptive and keyword-rich
- [ ] Heading hierarchy is logical (h2, h3, h4)
- [ ] Content is scannable (headings, lists, white space)
- [ ] Tables and lists formatted correctly
- [ ] Images have alt text
- [ ] Links are descriptive (not "click here")

### Writing Style
- [ ] Active voice used throughout
- [ ] Second person ("you") for instructions
- [ ] Present tense for current functionality
- [ ] Concise sentences (under 25 words when possible)
- [ ] No jargon without explanation
- [ ] Consistent tone and voice

### User Experience
- [ ] Prerequisites clearly stated
- [ ] Step-by-step instructions are numbered
- [ ] Expected outcomes described
- [ ] Troubleshooting included where appropriate
- [ ] Common errors addressed
- [ ] Related content linked

### Technical Requirements
- [ ] API endpoints and parameters accurate
- [ ] Version information included where relevant
- [ ] Compatibility notes provided
- [ ] Security considerations mentioned
- [ ] Performance implications noted

### Accessibility
- [ ] Content readable at 8th grade level or below
- [ ] Complex concepts explained simply
- [ ] Acronyms spelled out on first use
- [ ] Color not the only means of conveying information
- [ ] Transcripts provided for video content
```

## Common Issues to Watch For

### Terminology Inconsistencies

- Using multiple terms for the same concept
- Capitalizing product names inconsistently
- Mixing American and British spelling

### Code Quality Issues

- Incomplete code snippets that won't compile/run
- Using production credentials in examples
- Not showing import statements
- Missing error handling

### Structural Problems

- Skipping heading levels (h2 to h4)
- Walls of text without breaks
- Missing context or prerequisites
- No clear call-to-action

### Style Violations

- Passive voice ("it can be done" vs "you can do")
- Future tense ("this will show" vs "this shows")
- Overly casual or overly formal tone
- Excessive use of exclamation points

## Review Output Format

Present your review using this template:

```markdown
# Documentation Review: [Filename]

## Summary
Brief overview of the documentation and review scope.

## Review Progress
- [x] Terminology consistent
- [x] Code examples complete and runnable
- [ ] No placeholder values (needs fixing)
...

## Strengths
- Clear introduction sets context well
- Step-by-step instructions are easy to follow
- Good use of visual aids

## Issues

### Critical Issues
1. **Line 45**: Code example missing import statement
   - Severity: Critical
   - Impact: Users cannot run the example
   - Fix: Add `import { client } from '@anthropic-ai/sdk'`

### Important Issues
1. **Section "Getting Started"**: Missing prerequisites
   - Severity: Important
   - Impact: Users may not have required setup
   - Fix: Add prerequisites section before instructions

### Minor Issues
1. **Line 12**: Inconsistent capitalization of "API"
   - Severity: Minor
   - Fix: Change "Api" to "API"

## Linter Results
```
lint-mdx.js: 2 errors, 3 warnings
- Line 23: Heading levels skip from h2 to h4
- Line 67: Code fence not closed
```

## Recommendations

1. Add a troubleshooting section for common errors
2. Include more concrete examples with real-world use cases
3. Link to related API reference documentation
4. Consider adding a video walkthrough

## Next Steps

Would you like me to:
- [ ] Fix the critical and important issues
- [ ] Create updated code examples
- [ ] Improve the troubleshooting section
- [ ] Generate a pull request with all fixes
```

## Best Practices

### For Reviewers

- Focus on user experience, not just correctness
- Provide specific, actionable feedback
- Balance thoroughness with practicality
- Acknowledge good work, not just problems
- Consider the target audience's expertise level

### For Documentation Authors

- Run linters before requesting review
- Provide context about changes made
- Test all code examples before submitting
- Read your own work aloud to catch awkward phrasing
- Use the checklist proactively during writing

## Integration with CI/CD

This skill can be integrated into automated workflows:

```yaml
# Example GitHub Actions workflow
name: Documentation Review
on: [pull_request]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run linter
        run: npm run lint:mdx
      - name: Check links
        run: npm run check:links
      - name: AI review
        run: claude review-docs --changed-files
```

## Related Resources

- [Content Style Guide](../../content-instructions.md)
- [Markdown Best Practices](../guides/markdown-best-practices.md)
- [API Documentation Standards](../guides/api-docs.md)
- [Accessibility Guidelines](../guides/accessibility.md)

## Changelog

### Version 2.0 (2026-01-28)
- Enhanced checklist with accessibility and UX criteria
- Added structured output template
- Included CI/CD integration examples
- Expanded common issues section
- Added best practices for reviewers and authors

### Version 1.0
- Initial release
- Basic workflow and checklist
