# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the **Base Documentation** repository, a comprehensive documentation site for Base (Ethereum Layer 2 blockchain) built with **Mintlify**. The repository covers blockchain development from basics to advanced topics including smart contracts, onchain apps, and Base ecosystem tools.

## Key Commands

### Local Development
```bash
# Install Mintlify CLI globally (required for local development)
npm i -g mintlify

# Run local development server
mintlify dev

# Reinstall dependencies if mintlify dev fails
mintlify install
```

### Storybook Development
```bash
cd storybook
npm install
npm run storybook  # Runs on port 6006
npm run build-storybook
```

## Architecture and Structure

### Documentation Organization
- **Tab-based navigation** with 7 main sections in `docs.json`:
  - Get Started (introduction, quickstarts)
  - Base Chain (network info, node operations) 
  - Smart Wallet (account abstraction)
  - OnchainKit (React components)
  - Wallet App (MiniKit development)
  - Cookbook (use-case guides)
  - Learn (educational content)

### File Structure
- **Main content**: All documentation files are in `/docs` directory as `.mdx` files
- **Configuration**: `docs.json` defines navigation structure and site settings
- **Images**: Organized in `/images` with subdirectories by topic
- **Custom components**: React components available in `/snippets`
- **Styling**: `custom.css` for site-wide styles, `iframe-theme.js` for theme handling

### Content Types
- **Educational tutorials** (Learn section with Solidity, Ethereum basics)
- **Practical guides** (Cookbook with real-world implementation examples)
- **API documentation** (OnchainKit components and utilities)
- **Tool documentation** (Smart Wallet, development frameworks)

## Development Workflow
- Use sub-agents to help complete tasks
- Leverage the Github CLI tool to create commits for changes and to read the history of changes
- If you create scratch files for problem solving, remove them when you are done with them. 

### Content Editing
- Edit `.mdx` files directly in `/docs` directory (NOT `/_pages`)
- Use Mintlify syntax for enhanced documentation features
- Changes are automatically deployed via Mintlify GitHub App when pushed to default branch

### Component Development
- Storybook setup in `/storybook` directory for UI component development
- Components integrated into documentation via iframe embedding
- Chromatic integration for visual testing and regression detection

### Important Rules
- **Never edit files in `/_pages` directory** - all documentation files are in `/docs`
- Use Mintlify CLI for local development and testing
- Follow existing navigation structure defined in `docs.json`
- Images should be placed in appropriate `/images` subdirectories

## Special Features

### AI Integration
- Contextual AI options (ChatGPT, Claude) available in documentation interface
- Large `llms-full.txt` file (11,496 lines) provides comprehensive AI context
- AI prompting guides integrated throughout documentation

### Interactive Components
- Storybook components embedded via iframes for interactive examples
- Dark/light mode support with custom theme handling
- Custom React components available for enhanced documentation experiences

### Cross-referencing
- Extensive internal linking between related topics
- Progressive learning paths from beginner to advanced
- Use-case driven organization alongside technical reference material

## Deployment

- **Automatic deployment** via Mintlify GitHub App when changes are pushed to default branch
- **Storybook deployment** to Chromatic for component library hosting
- No manual deployment steps required for documentation updates