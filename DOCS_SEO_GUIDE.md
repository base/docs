# Base Documentation - SEO & Discoverability Guide

This guide provides best practices and implementation details for maintaining optimal SEO and discoverability in the Base documentation.

## Table of Contents

- [Overview](#overview)
- [Global SEO Configuration](#global-seo-configuration)
- [Page-Level SEO](#page-level-seo)
- [Content Best Practices](#content-best-practices)
- [Mobile Optimization](#mobile-optimization)
- [Interactive Components](#interactive-components)
- [Search Configuration](#search-configuration)
- [Monitoring & Maintenance](#monitoring--maintenance)

## Overview

The Base documentation uses Mintlify's built-in SEO capabilities, enhanced with custom configurations to maximize organic visibility and developer discoverability. All SEO settings are configured in `docs/docs.json` and can be overridden at the page level using frontmatter.

### Key Improvements Implemented

- **Comprehensive metadata** with Open Graph and Twitter Cards
- **Enhanced search experience** with contextual prompts
- **Mobile-first responsive design** for all devices
- **Interactive code playgrounds** for hands-on learning
- **Structured data indexing** for better search engine visibility

## Global SEO Configuration

### Location: `docs/docs.json`

The global SEO configuration affects all documentation pages unless overridden:

```json
{
  "seo": {
    "indexing": "all",
    "search": {
      "prompt": "Search Base docs - try 'smart contracts', 'OnchainKit', or 'Base Account'"
    },
    "metatags": {
      "description": "Comprehensive developer documentation for Base...",
      "keywords": "base blockchain, ethereum l2, layer 2...",
      "author": "Base",
      "robots": "index, follow",
      "googlebot": "index, follow, max-snippet:-1, max-image-preview:large",

      // Open Graph
      "og:type": "website",
      "og:site_name": "Base Documentation",
      "og:title": "Base Documentation - Build on Ethereum L2",
      "og:description": "Comprehensive developer documentation...",
      "og:url": "https://docs.base.org",
      "og:image": "https://docs.base.org/images/base-open-graph.png",
      "og:image:width": "1200",
      "og:image:height": "630",
      "og:image:alt": "Base Documentation - Build on Ethereum L2",
      "og:locale": "en_US",

      // Twitter Cards
      "twitter:card": "summary_large_image",
      "twitter:site": "@base",
      "twitter:creator": "@base",
      "twitter:title": "Base Documentation - Build on Ethereum L2",
      "twitter:description": "Comprehensive developer documentation...",
      "twitter:image": "https://docs.base.org/images/base-open-graph.png",

      // Technical
      "canonical": "https://docs.base.org",
      "apple-mobile-web-app-title": "Base Docs",
      "theme-color": "#0000ff"
    }
  }
}
```

### Indexing Strategy

- **`indexing: "all"`** - Includes all pages in sitemap, even those not in navigation
- This ensures comprehensive search engine coverage
- Hidden/draft pages should use `noindex: true` in frontmatter

### Search Configuration

- **Custom prompt** guides users on what to search for
- Improves search engagement and helps users discover key topics
- Update regularly to reflect new major features

## Page-Level SEO

### Using Frontmatter

Override global settings on individual pages with MDX frontmatter:

```yaml
---
title: "Getting Started with Base Account"
description: "Learn how to integrate Base Account, a passkey-powered smart wallet, into your application."
keywords: "base account, smart wallet, passkey, account abstraction"
sidebarTitle: "Base Account"
"og:image": "https://docs.base.org/images/base-account-og.png"
"twitter:image": "https://docs.base.org/images/base-account-og.png"
---
```

### Title Best Practices

- **Length**: 50-60 characters
- **Format**: `Topic - Category | Base Docs` (Mintlify adds suffix automatically)
- **Keywords**: Include primary keyword near the beginning
- **Unique**: Every page should have a distinct title

**Examples:**
- ✅ "Deploy Smart Contracts on Base"
- ✅ "Base Account Integration Guide"
- ✅ "OnchainKit Components Reference"
- ❌ "Getting Started" (too generic)
- ❌ "Documentation Page" (not descriptive)

### Description Best Practices

- **Length**: 150-160 characters
- **Content**: Summarize page value proposition
- **Keywords**: Include 2-3 relevant keywords naturally
- **CTA**: End with action-oriented language when appropriate

**Examples:**
- ✅ "Learn how to deploy and verify Solidity smart contracts on Base using Hardhat, Foundry, or Remix. Includes gas optimization tips and security best practices."
- ✅ "Integrate OnchainKit's Transaction component for seamless onchain payments. Complete guide with React examples and TypeScript support."
- ❌ "This page explains smart contracts." (too short, not informative)

### Keywords Best Practices

- **Count**: 5-10 keywords per page
- **Mix**: Combine primary (high volume), secondary, and long-tail keywords
- **Relevance**: Only use keywords actually covered on the page
- **Format**: Comma-separated string

**Example:**
```yaml
keywords: "base smart contracts, solidity deployment, hardhat base, foundry base, contract verification, ethereum l2"
```

### Custom Open Graph Images

Create custom OG images for major sections:

1. **Dimensions**: 1200x630px (required for optimal display)
2. **Format**: PNG or JPG
3. **Content**: Section logo, title, and Base branding
4. **Location**: `/docs/images/og/` directory
5. **Reference**: Use full URL in frontmatter

```yaml
"og:image": "https://docs.base.org/images/og/onchainkit.png"
"twitter:image": "https://docs.base.org/images/og/onchainkit.png"
```

## Content Best Practices

### Headings Structure

Use semantic heading hierarchy for both readability and SEO:

```markdown
# Main Page Title (H1) - Only one per page
## Primary Sections (H2)
### Subsections (H3)
#### Details (H4)
```

- **H1**: Automatically generated from `title` frontmatter
- **H2**: Major sections (Installation, Usage, Configuration)
- **H3**: Subsections (Prerequisites, Setup, Examples)
- **H4**: Detailed points (rarely needed)

### Internal Linking

Strong internal linking improves both SEO and user experience:

- **Link density**: 2-5 internal links per page
- **Anchor text**: Descriptive, keyword-rich
- **Context**: Link related concepts, prerequisites, and next steps

**Examples:**
```markdown
- ✅ [Deploy your first smart contract on Base](/base-chain/quickstart/deploy-on-base)
- ✅ Learn more about [OnchainKit transaction components](/onchainkit/latest/components/transaction)
- ❌ Click [here](/some-page) to learn more
- ❌ Read [this](/another-page)
```

### External Links

- Use sparingly and only to authoritative sources
- Add `rel="nofollow"` to external links when appropriate
- Ensure all external links are HTTPS

### Code Examples

- **Completeness**: Provide full, runnable examples
- **Comments**: Explain complex logic
- **Language tags**: Always specify language for syntax highlighting
- **Inline code**: Use backticks for code terms (e.g., `useState`, `0x1234`)

### Images & Media

- **Alt text**: Descriptive, includes relevant keywords
- **File size**: Optimize images (use WebP when possible)
- **Dimensions**: Specify width/height to prevent layout shift
- **Format**: Use Mintlify `<Frame>` component

```markdown
<Frame>
  <img
    src="/images/base-account-flow.png"
    alt="Base Account authentication flow showing passkey creation and transaction signing"
    width="800"
    height="450"
  />
</Frame>
```

## Mobile Optimization

### Responsive Design

Mobile-first CSS enhancements are in `docs/style.css`:

```css
/* Mobile grid adjustments */
@media (max-width: 768px) {
  .use-cases {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}

/* Touch-friendly targets */
@media (hover: none) and (pointer: coarse) {
  .use-cases-links a {
    min-height: 44px;  /* WCAG touch target size */
    padding: 8px 0;
  }
}

/* Readable code on mobile */
@media (max-width: 640px) {
  pre {
    font-size: 13px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}
```

### Mobile Performance

- **Lazy loading**: Images load as needed
- **Smooth scrolling**: Enhanced UX on touch devices
- **Optimized tables**: Horizontal scroll on narrow viewports

### Testing

Test documentation on multiple devices:
- **Mobile**: iPhone (Safari), Android (Chrome)
- **Tablet**: iPad, Android tablets
- **Desktop**: Chrome, Firefox, Safari, Edge

Use Chrome DevTools device emulation and test touch interactions.

## Interactive Components

### Code Playground

Interactive code examples are available via Storybook embeds:

```markdown
<iframe
  src="https://base-docs-storybook.chromatic.com/iframe.html?id=documentation-codeplayground--javascript-example&viewMode=story"
  width="100%"
  height="600px"
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
></iframe>
```

**Available variants:**
- `javascript-example` - Basic JavaScript
- `typescript-example` - TypeScript with types
- `solidity-example` - Smart contracts
- `base-account-example` - Base Account SDK
- `onchainkit-example` - OnchainKit components
- `read-only` - Non-editable display
- `compact-view` - Smaller inline examples

### When to Use Interactive Examples

- **Onboarding tutorials**: Let users experiment immediately
- **Complex APIs**: Show real-time output
- **Configuration**: Allow parameter tweaking
- **Troubleshooting**: Help users test solutions

### Best Practices

- Use sparingly (1-2 per page maximum)
- Provide context before and after the playground
- Set appropriate default code
- Consider read-only mode for reference implementations

## Search Configuration

### Built-in Mintlify Search

Mintlify provides AI-powered search with:
- Semantic understanding of queries
- OpenAPI endpoint indexing
- Component attribute search
- Hidden page filtering

### Search Optimization

**Improve search discoverability:**

1. **Clear headings**: Search indexes heading text heavily
2. **First paragraph**: Should summarize page content
3. **Keywords**: Use naturally throughout content
4. **Code comments**: Include searchable terms
5. **Examples**: Show common use cases

### Search Prompt

Update the search prompt in `docs.json` to guide users:

```json
{
  "seo": {
    "search": {
      "prompt": "Search Base docs - try 'smart contracts', 'OnchainKit', or 'Base Account'"
    }
  }
}
```

**Guidelines:**
- Mention 2-3 popular topics
- Update seasonally with new features
- Keep under 80 characters
- Use clear, searchable terms

### Contextual AI Options

Configured in `docs.json`:

```json
{
  "contextual": {
    "options": ["copy", "chatgpt", "claude"]
  }
}
```

This allows users to:
- Copy code snippets
- Ask ChatGPT/Claude about content
- Get AI explanations of concepts

## Monitoring & Maintenance

### Automatic Features

Mintlify automatically generates:
- **Sitemap**: `https://docs.base.org/sitemap.xml`
- **Robots.txt**: Crawler access rules
- **Semantic HTML**: Proper heading hierarchy

### SEO Checklist for New Pages

- [ ] Unique, descriptive title (50-60 chars)
- [ ] Compelling description (150-160 chars)
- [ ] 5-10 relevant keywords
- [ ] Clear H2/H3 heading structure
- [ ] 2-5 internal links with descriptive anchor text
- [ ] Alt text for all images
- [ ] Complete, runnable code examples
- [ ] Mobile-responsive layout (test on phone)
- [ ] Proofread for clarity and accuracy

### Content Updates

When updating existing pages:
- Review and update metadata if topic changed
- Add internal links to new related content
- Update code examples to latest SDK versions
- Check for broken links
- Verify mobile rendering

### Performance Monitoring

Track these metrics:
- **Organic traffic**: Google Analytics / Search Console
- **Top queries**: What users search for
- **Click-through rate**: Title/description effectiveness
- **Bounce rate**: Content relevance and quality
- **Time on page**: Engagement level

### Regular Maintenance

**Monthly:**
- Review top-performing pages
- Update search prompt with trending topics
- Fix reported broken links
- Update outdated code examples

**Quarterly:**
- Audit entire site structure
- Refresh metadata for underperforming pages
- Create new OG images for major features
- Review and update this guide

## Additional Resources

- [Mintlify SEO Documentation](https://www.mintlify.com/docs/optimize/seo)
- [Mintlify Global Settings](https://www.mintlify.com/docs/organize/settings)
- [Google Search Console](https://search.google.com/search-console)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)

## Questions or Issues?

- Documentation team: Slack #docs-team
- SEO-related bugs: GitHub Issues
- Content suggestions: Open a PR

---

**Last updated**: January 2026
**Maintained by**: Base Documentation Team
