# Base Mini PoA (TR/EN)

Minimal **Proof-of-Authority** style demo for builders exploring Base.
This is an educational quickstart that spins up a local PoA-like dev net and shows
how to deploy a simple contract + call it from a tiny script.

> 🇹🇷 Kısa not: Türk geliştiriciler için özet adımlar ve açıklamalar README’nin sonunda.

## What you get
- Local PoA-like single-validator dev net (for education)
- One simple contract deployment script
- One client call script
- Step-by-step commands you can copy/paste

## Prereqs
- Node 18+, pnpm or npm
- Docker Desktop (for local devnet)

## Quickstart
```bash
./quickstart.sh
# spins a local devnet, then:
# 1) installs deps
# 2) compiles & deploys contract
# 3) prints deployed address
