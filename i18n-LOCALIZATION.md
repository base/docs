# Base Docs Internationalization (i18n) & Localization Framework

## Overview
As Base scales globally, web3 developers from non-English speaking regions (especially Turkey, LATAM, APAC, and EMEA) face barriers due to English-only documentation. This framework introduces a standardized layout for localizing Base Docs into multiple global languages, starting with a multi-language community roadmap.

## Global Localization Strategy
Instead of cluttering the root directory with standalone translation files, this framework establishes the path for automated i18n tooling integration (e.g., Crowdin or Docusaurus i18n subdirectories).

### Supported Core Languages (Initial Roadmap):
- **TR:** Turkish (Supported by @omiaydin1)
- **ES:** Spanish / LATAM
- **ZH:** Chinese (Simplified)
- **FR:** French
- **KO:** Korean

---

## Contributing Guide for Translators (Global)

If you want to translate Base Documentation into your native language, please follow these steps:

1. **Do not create random files.** Locate the target folder under `/i18n/[lang-code]/`.
2. Ensure technical web3 terms (e.g., *Gas, Rollup, L2, Sequencer, Smart Contract*) remain intact or standardized according to the global glossary.
3. Submit your PR with the title format: `docs(i18n): add [Language] translation for [Page Name]`

---

## Internationalization Guidelines

### 1. File Structure Matrix
```text
.
├── CONTRIBUTING.md (English Base)
└── i18n/
    ├── tr/
    │   └── CONTRIBUTING.md (Turkish)
    ├── es/
    │   └── CONTRIBUTING.md (Spanish)
    └── zh/
        └── CONTRIBUTING.md (Chinese)
2. Technical Standardization
Translators must retain absolute code-block syntax integrity. Never translate terminal commands, variable names, or JSON responses.

Initiated by the global Base community to make blockchain accessible to the next billion users.
