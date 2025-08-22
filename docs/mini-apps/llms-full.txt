# https://docs.base.org/mini-apps/llms-full.txt

## Mini Apps — Deep Guide for LLMs

> Mini Apps are social‑native, instant‑launch web apps that run inside Base App. This guide orients an LLM to MiniKit fundamentals, product capabilities, UX best practices, growth mechanics, and troubleshooting.

### What you can do here
- Scaffold new Mini Apps with MiniKit and integrate existing Next.js apps
- Configure manifests for discovery and client capabilities
- Build social‑native UX using OnchainKit components
- Plan growth loops (sharing, search, notifications) and optimize onboarding
- Diagnose issues specific to Base App vs. other Farcaster clients

## Minimal Critical Code (MiniKit + OnchainKit wiring)
```tsx
// MiniKit and OnchainKit often co‑exist in Mini Apps. Keep providers minimal.
import { OnchainKitProvider } from '@coinbase/onchainkit'
import { base } from 'wagmi/chains'

export function Providers(props: { children: React.ReactNode }) {
  return (
    <OnchainKitProvider apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY} chain={base}>
      {props.children}
    </OnchainKitProvider>
  )
}
```

## Navigation (with brief descriptions)

### Introduction
- [Overview](https://docs.base.org/mini-apps/overview.md) — Why Mini Apps

### Quickstart
- [New Apps: Install](https://docs.base.org/mini-apps/quickstart/new-apps/install.md) — Scaffold
- [Existing Apps: Integrate](https://docs.base.org/mini-apps/quickstart/existing-apps/install.md) — Integrate
- [Launch Checklist](https://docs.base.org/mini-apps/quickstart/launch-checklist.md) — Readiness

### Design Guidelines
- [Best Practices](https://docs.base.org/mini-apps/design-ux/best-practices.md) — UX patterns
- [OnchainKit](https://docs.base.org/mini-apps/design-ux/onchainkit.md) — Components

### Growth Playbook
- [Optimize Onboarding](https://docs.base.org/mini-apps/growth/optimize-onboarding.md) — Onboarding
- [Build Viral Mini Apps](https://docs.base.org/mini-apps/growth/build-viral-mini-apps.md) — Viral growth

### Features
- [Overview](https://docs.base.org/mini-apps/features/overview.md) — Feature index
- [Manifest](https://docs.base.org/mini-apps/features/manifest.md) — Manifest
- [Authentication](https://docs.base.org/mini-apps/features/Authentication.md) — Auth
- [Embeds & Previews](https://docs.base.org/mini-apps/features/embeds-and-previews.md) — Embeds
- [Search & Discovery](https://docs.base.org/mini-apps/features/search-and-discovery.md) — Discovery
- [Sharing & Social Graph](https://docs.base.org/mini-apps/features/sharing-and-social-graph.md) — Sharing
- [Notifications](https://docs.base.org/mini-apps/features/notifications.md) — Notifications
- [Links](https://docs.base.org/mini-apps/features/links.md) — Links

### Troubleshooting
- [Common Issues](https://docs.base.org/mini-apps/troubleshooting/common-issues.md) — Issues
- [Base App Compatibility](https://docs.base.org/mini-apps/troubleshooting/base-app-compatibility.md) — Client behavior

### Technical Reference
- [MiniKit Overview](https://docs.base.org/mini-apps/technical-reference/minikit/overview.md) — Overview
- [Provider & Initialization](https://docs.base.org/mini-apps/technical-reference/minikit/provider-and-initialization.md) — Provider
- [Hooks](https://docs.base.org/mini-apps/technical-reference/minikit/hooks/useMiniKit.md) — Hooks


## Quickstart (excerpts)

Source: `https://docs.base.org/mini-apps/quickstart/new-apps/install.md`

Create a new Mini App with MiniKit:

```bash
npm create minikit@latest my-mini-app
cd my-mini-app && npm i && npm run dev
```

Source: `https://docs.base.org/mini-apps/quickstart/existing-apps/install.md`

Add MiniKit to an existing Next.js app:

```bash
npm install @coinbase/minikit @coinbase/onchainkit
```


## Key Concepts (excerpts)

Source: `https://docs.base.org/mini-apps/overview.md`

- Social‑native UX: Apps run inside Base App with identity, smart wallet, and sharing built‑in.
- Manifest: Declare capabilities, intents, and metadata to enable discovery and client features.
  - Source: `https://docs.base.org/mini-apps/features/manifest.md`
- Onboarding: Reduce steps; defer heavy auth until value is shown; prefill from client context.
  - Source: `https://docs.base.org/mini-apps/growth/optimize-onboarding.md`
- Discovery: Optimize for search and featuring by following guidelines.
  - Source: `https://docs.base.org/mini-apps/features/search-and-discovery.md`


## Authentication Best Practices (excerpts)

Sources:
- `https://docs.base.org/mini-apps/features/Authentication.md`
- `https://docs.base.org/mini-apps/growth/optimize-onboarding.md`

- Defer authentication: Let users explore and reach first value before prompting to connect or sign. Gate only when action requires identity, balance, or write access.
- Progressive disclosure: Ask for the minimum capability first (e.g., identity only). Request additional permissions just‑in‑time when a feature needs them.
- Use client context: Prefill known fields (handle, pfp, address) from the client to reduce typing and confusion. Avoid duplicate prompts the client already satisfied.
- Least privilege: Prefer scoped, revocable permissions (e.g., per‑action transaction trays) instead of broad, persistent approvals.
- Clear intent: When prompting to authenticate, state why it’s needed, what will happen, and the benefit. Keep copy short and action‑oriented.
- Resilience & UX: Provide guest mode where possible; handle declined auth gracefully with alternate paths or read‑only modes.
- Server verification: Verify any signed payloads or tokens server‑side. Enforce replay protection, expiration, and domain binding.
- Secure webhooks: If using webhooks (e.g., for frame updates), require signature verification and rate limiting; log and alert on failures.

Modes summary (from Authentication):

- SIWF / Quick Auth — Social identity with low friction, session via JWT when needed.
  - Create Account users: See a Login Request tray; sign SIWF in‑app with passkey.
  - Connect Account users: One‑time deeplink to Farcaster to register an auth address, then seamless in‑app sign‑in thereafter.
  - Source: `https://docs.base.org/mini-apps/features/Authentication.md`
- Wallet Auth — Uses the in‑app smart wallet. Prefer for persisted sessions only when necessary; do not gate initial exploration behind connect.
  - Pair with transaction trays for clear intent and safe approvals.
  - Source: `https://docs.base.org/mini-apps/features/Authentication.md`
- Context Data — Provided by hosts and useful for personalization/analytics, but not cryptographic proof of identity.
  - Treat as hints only; never primary auth. It can be spoofed by non‑official hosts.
  - Source: `https://docs.base.org/mini-apps/features/Authentication.md`

Hook reference:

- useAuthenticate — Returns verified user from SIWF or wallet auth. Use alongside `useMiniKit` context.
  - Source: `https://docs.base.org/mini-apps/technical-reference/minikit/hooks/useAuthenticate.md`

Example (hook usage):

```tsx
import { useMiniKit } from '@coinbase/minikit'
import { useAuthenticate } from '@coinbase/onchainkit/minikit'

export function AuthGate(props: { children: React.ReactNode }) {
  const { context } = useMiniKit()
  const { user } = useAuthenticate()

  // Use context for UI hints only
  const displayName = context?.user?.displayName ?? 'Friend'

  // Use verified user for secure ops
  if (!user) return <button>Sign in</button>
  return <div aria-live="polite">Welcome, {displayName}!{props.children}</div>
}
```

Conceptual server‑side verification (pseudocode):

```ts
// Verify a signed payload from the client (conceptual)
function verifyAuth({ address, message, signature }): boolean {
  const recovered = recoverAddress({ message, signature })
  if (!timingSafeEqual(recovered, address)) return false
  if (isExpired(message)) return false
  if (!isExpectedDomain(message.domain)) return false
  return true
}
```

Prompt timing guidelines:
- On first open: no auth prompt; show value and CTA.
- On action requiring identity or write: show a single, focused auth step.
- After success: persist session, avoid re‑prompting; provide visible account state.


## API and Schemas (pruned)

- MiniKit Provider and initialization props
  - Source: `https://docs.base.org/mini-apps/technical-reference/minikit/provider-and-initialization.md`
- `useMiniKit` hook: access frame context, user, and client capabilities
  - Source: `https://docs.base.org/mini-apps/technical-reference/minikit/hooks/useMiniKit.md`

Example manifest fields (conceptual):

```json
{
  "accountAssociation": {
    "header": "eyJmaWQiOjkxNTIsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgwMmVmNzkwRGQ3OTkzQTM1ZkQ4NDdDMDUzRURkQUU5NDBEMDU1NTk2In0",
    "payload": "eyJkb21haW4iOiJhcHAuZXhhbXBsZS5jb20ifQ",
    "signature": "MHgxMGQwZGU4ZGYwZDUwZTdmMGIxN2YxMTU2NDI1MjRmZTY0MTUyZGU4ZGU1MWU0MThiYjU4ZjVmZmQxYjRjNDBiNGVlZTRhNDcwNmVmNjhlMzQ0ZGQ5MDBkYmQyMmNlMmVlZGY5ZGQ0N2JlNWRmNzMwYzUxNjE4OWVjZDJjY2Y0MDFj"
  },
  "baseBuilder": {
    "allowedAddresses": ["0x..."]
  },
  "frame": {
    "version": "1",
    "name": "Example Mini App",
    "homeUrl": "https://ex.co",
    "iconUrl": "https://ex.co/i.png",
    "splashImageUrl": "https://ex.co/l.png",
    "splashBackgroundColor": "#000000",
    "webhookUrl": "https://ex.co/api/webhook",
    "subtitle": "Fast, fun, social",
    "description": "A fast, fun way to challenge friends in real time.",
    "screenshotUrls": [
      "https://ex.co/s1.png",
      "https://ex.co/s2.png",
      "https://ex.co/s3.png"
    ],
    "primaryCategory": "social",
    "tags": ["example", "miniapp", "baseapp"],
    "heroImageUrl": "https://ex.co/og.png",
    "tagline": "Play instantly",
    "ogTitle": "Example Mini App",
    "ogDescription": "Challenge friends in real time.",
    "ogImageUrl": "https://ex.co/og.png",
    "noindex": true
  }
}
```


## Examples (common flows)

Example: Wire providers for OnchainKit + MiniKit

Sources:
- `https://docs.base.org/mini-apps/design-ux/onchainkit.md`
- `https://docs.base.org/mini-apps/technical-reference/minikit/provider-and-initialization.md`

```tsx
import { OnchainKitProvider } from '@coinbase/onchainkit'
import { base } from 'wagmi/chains'

export function Providers(props: { children: React.ReactNode }) {
  return (
    <OnchainKitProvider apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY} chain={base}>
      {props.children}
    </OnchainKitProvider>
  )
}
```

Example: Use `useMiniKit` to access client context

Source: `https://docs.base.org/mini-apps/technical-reference/minikit/hooks/useMiniKit.md`

```tsx
import { useMiniKit } from '@coinbase/minikit'

export function Screen() {
  const { user, client } = useMiniKit()
  return <pre>{JSON.stringify({ user, client }, null, 2)}</pre>
}
```

