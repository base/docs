---
title: "Base MCP Plugin Specification"
description: "Authoring spec for native Base MCP plugins — frontmatter schema, required body sections, integration types, and step-by-step instructions for writing or adapting a plugin to the spec."
---

# Base MCP Plugin Specification

This file is the source of truth for authoring native Base MCP plugins. It applies to both internally maintained plugins and partner-authored plugins submitted via PR.

It is written to be **self-contained**: if you are an agent and someone hands you only this file plus a protocol's docs (or an existing, non-conforming plugin file), this spec alone should tell you how to produce — or fix — a conforming plugin. Work top to bottom: decide the frontmatter, then write the body sections in canonical order. To bring an existing file into line, jump to [How to Adapt an Existing Plugin](#how-to-adapt-an-existing-plugin).

A plugin is a single Markdown file at `skills/base-mcp/plugins/<slug>.md`: YAML frontmatter (routing signals for the agent) followed by a fixed, canonically-named body. No build step or validator runs today — conformance is by review — so the file must be correct by construction.

To make that review repeatable, this repo ships the **`plugin-review`** skill (`.claude/skills/plugin-review/`). It validates a plugin file against this spec and produces a conformance report with actionable findings. **Plugin authors should run it to self-check a plugin before opening a PR**, and reviewers use it to evaluate incoming submissions. Invoke it in Claude Code with `/plugin-review` (or just ask to "review my plugin against the spec").

---

## Frontmatter Schema

Every plugin file must open with YAML frontmatter. Fields marked **required** must be present; others default as noted.

### Required fields

| Field | Type | Description |
|---|---|---|
| `title` | string | `"<Protocol> Plugin"` |
| `description` | string | One line: what the plugin does + how it routes to Base MCP. |
| `tags` | string[] | Lowercase capability/category keywords used for discovery. The agent matches a user's request to a plugin by these (surfaced in the SKILL.md plugins table). See [Choosing each field's value](#choosing-each-fields-value). |
| `name` | string | Lowercase slug (e.g. `morpho`). Used for cross-links and the SKILL.md table. |
| `version` | string | Plugin doc version, semver (e.g. `0.2.0`). Bump on meaningful changes (a spec-conformance restructure counts). |
| `integration` | enum | See [Integration Types](#integration-types). |
| `chains` | string[] | Base MCP chain strings the plugin targets, limited to chains Base MCP supports (e.g. `[base]`, `[base, optimism]`). |

### Capability flags

All optional. Defaults: `shell: none`, `allowlist: []`, `externalMcp: null`, `cliPackage: null`, `auth: none`, `risk: []`.

| Field | Type | Description |
|---|---|---|
| `requires.shell` | `required \| optional \| none` | Whether shell/terminal access is needed. |
| `requires.allowlist` | string[] | Hosts that must be in the Base MCP `web_request` allowlist. |
| `requires.externalMcp` | `{ name, transport?: http\|sse, url } \| { name, transport: stdio, command, args, env? } \| null` | Separate MCP server the plugin depends on. `transport: http \| sse` (remote, hosted) needs `url`; `transport: stdio` (local, launched on the user's machine) needs `command`, `args`, and optional `env`. `transport` is **optional for remote MCPs** and defaults to `http` when `url` is present (so the legacy `{ name, url }` shape stays valid); it is **required for `stdio`**. See [MCP Provisioning](#mcp-provisioning). |
| `requires.cliPackage` | string \| null | npx/uvx invocation for a CLI the agent **shells out to per call** (e.g. `npx @morpho-org/cli@latest`). This is **not** for an MCP server you register once — use `externalMcp` with `transport: stdio` for that. |
| `auth` | `none \| api-key \| siwe-jwt \| oauth-on-install` | Auth model used by the plugin's external services. |
| `risk` | string[] | Risk tags that trigger `## Risks & Warnings`. See the tag list below. |

### Choosing each field's value

Derive every value from the protocol's actual behavior — don't copy another plugin's flags blindly.

- **`integration`** — answer, in order, until one fits (the first match wins; this is the most specific value):
  1. Every operation goes through a shell CLI, no HTTP API and no separate MCP → `cli-only`.
  2. The plugin calls an HTTP API to read data or build calldata, which you then submit through a Base MCP tool → `http-api`.
  3. The plugin depends on a separate MCP server whose tools the agent calls directly → `external-mcp`.
  4. The plugin only composes Base MCP's own higher-level tools (`swap`, `send`) with no external service → `semantic-base-tool`.
  5. It needs two or more of the above depending on the surface (e.g. a CLI when a shell exists, an MCP/HTTP fallback otherwise) → `hybrid`. Document the per-surface paths in `## Surface Routing`.
- **`chains`** — list the Base MCP chain strings (e.g. `base`, `optimism`) the plugin targets — these are the same strings the `chain` param takes in Base MCP tool calls like `send_calls`. **Limit to chains Base MCP supports**: intersect the protocol's supported networks with Base MCP's. The supported chain strings are:

  `arbitrum`, `avalanche`, `base`, `base-sepolia`, `bsc`, `ethereum`, `optimism`, `polygon`

  (`base-sepolia` is the only testnet; `swap` is mainnet-only.) Read the `chain` parameter on the Base MCP tools to confirm the current set — it may change over time. If the plugin never routes an onchain transaction through Base MCP (e.g. an external MCP that only uses a Base MCP signature to log in), use `[]`.
- **`tags`** — 3–5 lowercase, hyphenated keywords describing *what the user can do* — capability and category, not the protocol name (the `name` already covers that). These drive routing: the agent reads the SKILL.md tags column to decide which plugin matches a request. Reuse existing tags where they fit so similar plugins cluster, but add new tags as you see fit. Current vocabulary: `lending`, `borrowing`, `yield`, `vaults`, `dex`, `swap`, `liquidity`, `perps`, `leverage`, `derivatives`, `trading`, `token-launches`, `memecoins`, `discovery`, `ai-agents`, `agent-commerce`, `payment-cards`, `email`, `nft`, `marketplace`, `drops` — when you introduce a new tag, add it to this list so the vocabulary stays shared.
- **`requires.shell`**:
  - `required` — the plugin cannot function without a shell/terminal (its only path is a CLI). On shell-less surfaces the agent must stop.
  - `optional` — a shell unlocks a richer path (a CLI, or a tx-builder), but the plugin still works without one via an HTTP/MCP/UI fallback.
  - `none` — the plugin never needs a shell (pure HTTP API or external MCP).
- **`requires.allowlist`** — every external host the plugin fetches over HTTP. These must be on the Base MCP `web_request` allowlist for chat-only surfaces to reach them. Leave `[]` for `cli-only` and `external-mcp` plugins that make no direct HTTP calls.
- **`requires.externalMcp`** — set when the plugin depends on a separate MCP server; otherwise `null`. Pick the `transport` first, then fill the matching fields (full schema and guardrails in [MCP Provisioning](#mcp-provisioning)):
  - **Remote MCP** (`transport: http` or `sse`) — a hosted server the agent connects to over the network. Provide `url` (e.g. `https://mcp.<protocol>.example/mcp`). This is the lower-trust case: the server runs on the partner's infra, not the user's machine. `transport` is optional here and **defaults to `http` when `url` is present**, so the legacy `{ name, url }` shape remains valid; set `transport: sse` explicitly when needed.
  - **Local MCP** (`transport: stdio`) — a server **launched on the user's machine** (typically via `npx`/`uvx`). Provide `command`, `args` (with a **pinned** version, never `@latest`), and `env` (required env-var **names only**, never values). A local MCP is **arbitrary code execution on the user's machine**, so it also requires the `local-exec` risk tag and a `## Surface Routing` stop on shell-less surfaces.
- **`requires.cliPackage`** — the exact invocation string for a CLI the agent **shells out to per call** (e.g. `npx @morpho-org/cli@latest`, or a full `uvx --from <spec> <cmd>` command); otherwise `null`. If the package is an **MCP server** (registered once and then queried as tools, not invoked per call), leave `cliPackage: null` and use `requires.externalMcp` with `transport: stdio` instead.
- **`auth`**:
  - `none` — public endpoints, no credentials.
  - `api-key` — a static API key / header is required on requests.
  - `siwe-jwt` — Sign-In-With-Ethereum producing a session JWT (the challenge is signed via Base MCP `sign`).
  - `oauth-on-install` — OAuth performed when the MCP/connector is installed.
- **`risk`** — include **every** tag that applies; any non-empty `risk` makes `## Risks & Warnings` required. Tags:
  | Tag | Use when |
  |---|---|
  | `liquidation` | Leveraged or borrow positions can be liquidated. |
  | `slippage` | Swaps/trades can fill materially worse than quoted. |
  | `low-liquidity` | Thin markets — price impact, failed fills, rug risk (e.g. fresh token launches). |
  | `pii` | The plugin handles personal/sensitive data (emails, card numbers, OTPs, 3DS codes). |
  | `irreversible` | Actions can't be undone once submitted (most onchain writes; flag when worth emphasizing). |
  | `local-exec` | The plugin runs partner code on the user's machine — a local (`transport: stdio`) MCP server or a `cliPackage`. Required whenever `externalMcp.transport: stdio` is set. |

### Example frontmatter

```yaml
---
title: "Moonwell Plugin"
description: "Lending on Moonwell via HTTP API → send_calls on Base and Optimism."
tags: [lending, borrowing, yield]
name: moonwell
version: 0.2.0
integration: http-api
chains: [base, optimism]
requires:
  shell: none
  allowlist: [api.moonwell.fi]
  externalMcp: null
  cliPackage: null
auth: none
risk: [liquidation]
---
```

---

## Integration Types

The `integration` field classifies how the plugin reaches Base MCP. Choose the most specific type that applies (use the ordered questions in [Choosing each field's value](#choosing-each-fields-value)); use `hybrid` only when a single type can't describe the routing.

The **Examples** column is illustrative and maintainer-managed — don't add your plugin to it in a contribution PR (see [Contribution Scope](#contribution-scope)).

| Value | What it means | Required body sections it implies | Examples |
|---|---|---|---|
| `cli-only` | All calls go through a shell CLI. No HTTP API, no external MCP. | `## Commands`; `shell: required`; `cliPackage` set | Aerodrome |
| `http-api` | Plugin calls an HTTP API (via `web_request` or harness HTTP tool) to read data or build calldata. | `## Endpoints`; list `allowlist` hosts | Moonwell, Uniswap, Bankr |
| `external-mcp` | Plugin relies on a separate MCP server — **remote** (hosted, `transport: http\|sse`) or **local** (launched on the user's machine, `transport: stdio`). The agent reads that MCP's own tool catalog — this plugin file does **not** enumerate its tools. | `## Detection` + `## Installation`; `externalMcp` set (+ `local-exec` risk for `stdio`); **omit** `## Endpoints`/`## Commands` | remote (`http`/`sse`), local (`stdio`) |
| `semantic-base-tool` | Plugin composes Base MCP's higher-level semantic tools (`swap`, `send`) rather than producing raw calldata. | `## Submission` names the semantic tool | *(future)* |
| `hybrid` | Combines two or more paths with surface-dependent routing. | union of the above; document the routing matrix in `## Surface Routing` | Avantis, Morpho |

---

## MCP Provisioning

`external-mcp` plugins (and `hybrid` plugins with an MCP path) depend on a separate MCP server. That server is reached one of two ways, set by `externalMcp.transport`. Choose the transport first; it determines the rest of the `externalMcp` object, the `## Installation` snippet, and the risk tags.

### Remote MCP (`transport: http | sse`)

A hosted server the agent connects to over the network. The partner runs it on their own infrastructure.

```yaml
requires:
  externalMcp:
    name: <protocol>
    transport: http          # or sse
    url: https://mcp.<protocol>.example/mcp
  shell: none
auth: oauth-on-install       # or api-key / none, as the server requires
```

- `url` is required; `command`/`args`/`env` are omitted.
- No code runs on the user's machine, so no `local-exec` risk is implied (other risks still apply on their own merits).
- Works on chat-only surfaces if the harness supports remote MCP connectors; otherwise `## Surface Routing` states the fallback.

### Local MCP (`transport: stdio`)

A server **launched on the user's machine**, typically via `npx`/`uvx`, communicating over stdio. The harness registers it once in its MCP client config.

```yaml
requires:
  externalMcp:
    name: <protocol>
    transport: stdio
    command: npx
    args: ["-y", "@<org>/mcp@1.2.3"]        # PIN the version — never @latest
    env: [PROTOCOL_API_KEY]                  # required env-var NAMES only — never values
  shell: required
risk: [local-exec]                           # required for any stdio MCP
```

- `command` + `args` are required; `url` is omitted.
- **Pin the version.** A floating `@latest` lets the partner ship new code to every user with no review — pin an exact version and bump it in a tracked PR (same discipline as `version`).
- **`env` lists names only.** Never put secret values in the plugin file; the user provisions them. Document what each is and how to obtain it in `## Auth`.
- **`local-exec` risk is mandatory.** Running a partner package is arbitrary code execution on the user's machine — a categorically larger trust surface than a remote MCP or an `http-api` plugin. `## Risks & Warnings` must spell out that the user is installing and running third-party code.
- **`## Surface Routing` must stop on shell-less / consumer surfaces.** A local MCP only runs where there is a shell and a user-managed MCP config (e.g. Claude Code, Codex, Cursor). On Claude.ai / ChatGPT the agent must stop and tell the user the integration requires a local install — it must not improvise a `web_request` workaround.

### `## Installation` content

Provide a copy-pasteable MCP client config snippet for the common harnesses (Claude Code, Codex, Cursor / JSON-config) — and, for remote MCPs that support it, Claude.ai / ChatGPT connectors. For local (`stdio`) MCPs the snippet is the standard `command`/`args`/`env` client entry; show the pinned version and name each required env var (without values). CLIs invoked per call via `npx`/`uvx` need no install step — say so and show the invocation instead.

### Backwards compatibility

This schema is **additive**. The pre-`transport` shape `externalMcp: { name, url }` is still valid and is read as a remote `http` MCP (`transport` defaults to `http` when `url` is present). Existing `external-mcp` plugins need no change to keep working; add `transport` on the next meaningful edit (and bump `version`), the same way heading-name synonyms are migrated. New plugins should set `transport` explicitly, and `stdio` always requires it. A future validator should treat a missing `transport` as an inferred default (warn), not an error.

---

## Runtime Routing Primitives

`## Surface Routing` and `## Submission` describe *how* the plugin executes. This is the menu of paths and tools they draw from — know it before writing those sections.

**Execution paths** (an agent picks one per call, depending on the surface):

- **Harness HTTP tool** — when the harness has a direct fetch/curl/shell (Claude Code, Codex, Cursor), use it first for HTTP calls: any method, no allowlist needed.
- **Base MCP `web_request`** — a server-side fetch for chat-only surfaces (Claude.ai, ChatGPT). Only reaches hosts on the `web_request` allowlist.
- **Shell / CLI** — runs a `requires.cliPackage` command. Needs `requires.shell` ≠ `none`.
- **External MCP** — the agent calls tools advertised by a separate MCP server (`requires.externalMcp`), reading their descriptions from the MCP itself. The server is either remote (hosted `url`) or local (`stdio`, launched on the user's machine); see [MCP Provisioning](#mcp-provisioning).
- **UI / user-paste fallback** — for chat-only surfaces that can't make the call directly: link the user to the protocol's web UI, or (GET-only) construct a URL and ask the user to paste it back so the agent may fetch it.

The full decision tree (harness HTTP → `web_request` → user-paste), and the GET-only constraint on consumer surfaces, live in [custom-plugins.md](custom-plugins.md). Reference it from `## Surface Routing` rather than restating it.

**Base MCP submission tools** — what `## Submission` names:

| Tool | Use for |
|---|---|
| `send_calls` | A batch of unsigned `{ to, value, data }` calls (EIP-5792). The target for any plugin that builds raw calldata. See [batch-calls.md](batch-calls.md). |
| `swap` | Base MCP's semantic swap — symbol/address in, routing handled for you. |
| `sign` | Message signing (e.g. a SIWE login challenge). |
| `none` | The plugin doesn't submit through Base MCP (e.g. an external MCP executes against its own backend after a Base MCP `sign`). State this explicitly. |

Any write tool that returns an approval URL follows the approval/polling flow in [approval-mode.md](approval-mode.md).

---

## Required Body Sections

Sections appear in this order. **R** = required in every plugin. **C** = conditional on frontmatter flags. **O** = optional.

| # | Heading | Status | Condition |
|---|---|---|---|
| 1 | `> [!IMPORTANT]` onboarding callout | R | Always — pointer to Base MCP onboarding in SKILL.md. |
| 2 | `## Overview` | R | Always — 1 paragraph: protocol summary, chain(s), routing one-liner. |
| 3 | `## Detection` | C | `integration` is `external-mcp`, or `hybrid` with an MCP path. |
| 4 | `## Installation` | C | `requires.externalMcp` or `requires.cliPackage` is set. |
| 5 | `## Auth` | C | `auth != none`. |
| 6 | `## Surface Routing` | R | Always — table or prose mapping capability × surface to execution path. |
| 7 | `## Endpoints` or `## Commands` | C | `http-api` → use `## Endpoints`. `cli-only` or CLI path of `hybrid` → use `## Commands`. `external-mcp` plugins **omit this section entirely** — the agent reads the MCP's own tool catalog. |
| 8 | `## Orchestration` | R | Always — ordered steps from user intent to Base MCP call. Use `###` sub-headings for sub-flows. |
| 9 | `## Submission` | R | Always — names the target Base MCP tool (`send_calls`, `swap`, `sign`, or `none`) and any mapping or normalization needed to reach it. |
| 10 | `## Example Prompts` | R | Always — 2–4 concrete prompt → numbered steps. |
| 11 | `## Risks & Warnings` | C | `risk` is non-empty. |
| 12 | `## Notes` | O | Constants, token addresses, known gotchas. |

### What goes in each section

- **`> [!IMPORTANT]` onboarding callout** — one line telling the agent to run Base MCP onboarding (defined in `SKILL.md`) before any plugin call. Note any session prerequisite here too (e.g. "authenticate once per session — see `## Auth`").
- **`## Overview`** — one paragraph: what the protocol is, which chain(s) it runs on, and a one-line routing statement (what the plugin reads/builds and which Base MCP tool it lands on). Say whether it returns **unsigned calldata** or executes through a semantic tool.
- **`## Detection`** *(external-mcp / hybrid-with-MCP)* — how the agent tells whether the required MCP/tooling is present, e.g. "if no `xyz_*` tools are exposed, the MCP isn't installed → see `## Installation`." Don't reach the protocol's HTTP API directly when the MCP is the supported path.
- **`## Installation`** *(externalMcp or cliPackage set)* — per-harness install steps (Claude Code, Codex, Cursor / JSON-config, Claude.ai, ChatGPT) plus a config snippet for MCPs. For `externalMcp` follow [MCP Provisioning](#mcp-provisioning): a remote (`http`/`sse`) connector entry, or a local (`stdio`) `command`/`args`/`env` entry with a pinned version. CLIs that run via `npx`/`uvx` need no install step — say so and show the invocation.
- **`## Auth`** *(auth ≠ none)* — the exact credential or flow: the header name for `api-key`; the ordered step sequence for `siwe-jwt` (get address → start → sign → complete → reuse token), token lifetime, and how to refresh; the connector setup for `oauth-on-install`.
- **`## Surface Routing`** — a table mapping each capability (typically split read vs write) × surface → execution path, using the [Runtime Routing Primitives](#runtime-routing-primitives). **Always** state what happens on a shell-less / chat-only surface: the fallback, or an explicit "stop." For `cli-only`, state plainly that no-shell surfaces are unsupported and the agent must not improvise a `web_request`/paste workaround.
- **`## Endpoints` / `## Commands`** — `http-api` → `## Endpoints`: each endpoint with method, URL, parameters, and response shape. `cli-only` / the CLI path of `hybrid` → `## Commands`: each command with flags and output shape. `external-mcp` omits both — the agent reads the MCP's catalog at runtime.
- **`## Orchestration`** — the happy-path sequence from user intent to the Base MCP call, as ordered steps (read state → build calldata → submit → confirm). Use `###` sub-flows for distinct operations (e.g. swap vs LP, CLI path vs MCP path). Say where the wallet address comes from (`get_wallets`) and call out any pre-submit validation.
- **`## Submission`** — name the target tool (`send_calls` / `swap` / `sign` / `none`) and show the **exact mapping** from the endpoint/command/MCP output into that tool's input: the `{ to, value, data }` normalization, chain-string mapping, and batching order (approvals before the action). Reference [approval-mode.md](approval-mode.md) for the approval/polling flow.
- **`## Example Prompts`** — 2–4 realistic user prompts, each followed by numbered steps that reference the sections above. Cover the main capabilities (a read, a primary write, and at least one edge such as a management action or chat-only fallback).
- **`## Risks & Warnings`** *(risk non-empty)* — one bullet per `risk` tag: the hazard, the guardrail (what to check, e.g. health factor / slippage threshold), what to confirm with the user, and what never to do silently (e.g. auto-raise slippage, auto-buy).
- **`## Notes`** *(optional)* — constants, token/contract addresses, unit-scaling rules, gotchas, and deep reference tables. This is where conservatively-preserved detail lands when adapting a large existing plugin.

### Canonical heading names

Use these exact names. Synonyms from older plugins must be renamed on the next meaningful edit.

| Correct | Instead of |
|---|---|
| `## Risks & Warnings` | "Safety Rules", "Safety Notes", "Execution Warnings", "Important Notes" |
| `## Orchestration` | "Orchestration Pattern", "Swap Orchestration", "CLI Orchestration" |
| `## Endpoints` | "API Services", "Endpoint reference" |
| `## Commands` | "Morpho CLI Path", "Runner" |
| `## Surface Routing` | "Surface routing", inline routing prose inside `## Overview` |
| `## Auth` | "Auth Headers", "Auth Flow" |
| `## Detection` | "Environment Detection", "MCP Server" |
| `## Submission` | "Base MCP Conversion", inline `send_calls` blocks |
| `## Example Prompts` | "Example Flows" |

---

## How to Author a New Plugin

Follow these steps to write a new plugin file (`skills/base-mcp/plugins/<slug>.md`). The goal is a file an agent can route from at runtime and a partner can reproduce mechanically.

1. **Classify the integration.** Pick the single most specific `integration` value using the ordered questions in [Choosing each field's value](#choosing-each-fields-value). This choice drives which body sections are required (see the [Integration Types](#integration-types) table).
2. **Fill the frontmatter** using the schema and the per-field guidance above. Every required field must be present; capability flags default as noted. Be honest about `risk` — it's what triggers `## Risks & Warnings` and shapes the agent's caution.
3. **Write the body sections in canonical order** (see [Required Body Sections](#required-body-sections) and [What goes in each section](#what-goes-in-each-section)). Include every **R** section, every **C** section your frontmatter flags imply, and use the exact canonical heading names.
4. **Name the submission tool.** `## Submission` must say which Base MCP tool the flow lands on — `send_calls`, `swap`, `sign`, or `none` — and the exact mapping/normalization needed to get there.
5. **Show the happy path.** `## Orchestration` walks user intent → Base MCP call as ordered steps. `## Example Prompts` gives 2–4 concrete prompts, each mapped to numbered steps.
6. **Self-review against the [Authoring Checklist](#authoring-checklist)** and confirm your diff stays within [Contribution Scope](#contribution-scope). Run the **`plugin-review`** skill to validate the file against this spec and resolve its findings, then open a PR that adds `skills/base-mcp/plugins/<slug>.md`.

## Contribution Scope

Keep a plugin PR's diff minimal. A contribution should change only:

- **Your plugin file** — `skills/base-mcp/plugins/<slug>.md` (the file you are adding). This is the only file most plugin PRs touch.
- **The tag vocabulary — only if you introduce a genuinely new `tag`** — by appending it to the list in [Choosing each field's value](#choosing-each-fields-value). Don't otherwise edit that list.

Do **not** edit the following in a plugin PR — they are maintainer-managed and updated when a plugin is reviewed and accepted into the registry:

- The plugins table in `skills/base-mcp/SKILL.md` (the registry of available plugins).
- The **Examples** column of the [Integration Types](#integration-types) table.
- The [Existing Plugin Conformance](#existing-plugin-conformance) table and its plugin count.

Maintainers add the SKILL.md registry row and the conformance entry after review. Including these edits in a contribution is unnecessary and causes merge conflicts between in-flight submissions.

## How to Adapt an Existing Plugin

Given a non-conforming or partially-conforming plugin file (or a protocol's raw docs), bring it into conformance **conservatively — without losing content**:

1. **Read the whole file** and identify what it already documents: how it reaches the protocol (CLI? HTTP? external MCP?), which hosts/commands/tools it uses, what it submits, and any risks.
2. **Derive and add the frontmatter** using [Choosing each field's value](#choosing-each-fields-value). If frontmatter is missing entirely, add the full block; if partial, fill the gaps. Bump `version`.
3. **Map existing headings to canonical names** (see [Canonical heading names](#canonical-heading-names)). Rename synonyms; don't create duplicates.
4. **Reorder** sections into the canonical order from [Required Body Sections](#required-body-sections).
5. **Add every missing R section**, and every C section the frontmatter now implies. Synthesize them from existing content where possible:
   - No `## Overview`? Write one from the intro prose.
   - No `## Surface Routing`? Derive the table from how the file says calls are made.
   - No `## Submission`? Extract the "how we send it" content (often buried in an orchestration step or a raw `send_calls` block) into its own section and name the tool.
   - No `## Example Prompts`? Write 2–4 from the documented capabilities.
6. **Preserve content.** Move deep reference material under `## Notes` or as `###` subsections rather than deleting it. When you change a heading that internal links point to, keep the link text in sync — Markdown anchors are derived from heading text, so a rename can break `#anchor` references elsewhere in the file.
7. **Self-review against the [Authoring Checklist](#authoring-checklist)**, then run the **`plugin-review`** skill to confirm the adapted file conforms to this spec.

## Plugin Skeleton Template

Copy this, fill the placeholders, and delete any **C**/**O** sections that don't apply to your integration:

```markdown
---
title: "<Protocol> Plugin"
description: "<one line: what it does + how it routes to Base MCP>"
tags: [<3-5 capability keywords>]
name: <slug>
version: 0.2.0
integration: cli-only | http-api | external-mcp | semantic-base-tool | hybrid
chains: [base]
requires:
  shell: none
  allowlist: []
  externalMcp: null   # remote: { name, transport: http|sse, url }; local: { name, transport: stdio, command, args, env } — see MCP Provisioning
  cliPackage: null
auth: none
risk: []            # add local-exec when externalMcp.transport: stdio
---

# <Protocol> Plugin

> [!IMPORTANT]
> Run Base MCP onboarding first (see SKILL.md). <one-line pointer; note any per-session prerequisite.>

## Overview
<1 paragraph: protocol summary, chain(s), one-line routing statement; unsigned-calldata vs semantic tool.>

<!-- ## Detection — external-mcp or hybrid-with-MCP only: how to tell the MCP/tooling is present. -->
<!-- ## Installation — only if requires.externalMcp or requires.cliPackage is set. -->
<!-- ## Auth — only if auth != none: header / SIWE steps / OAuth, token lifetime + refresh. -->

## Surface Routing
<table mapping capability × surface → execution path (harness HTTP tool, web_request, CLI, external MCP, UI fallback). Always state the shell-less / chat-only behavior.>

<!-- ## Endpoints — http-api: method, URL, params, response per endpoint. -->
<!-- ## Commands — cli-only / CLI path of hybrid: each command, flags, output. -->
<!-- external-mcp omits Endpoints/Commands entirely. -->

## Orchestration
<ordered steps from user intent to the Base MCP call (read → build → submit → confirm). Use ### sub-flows.>

## Submission
<names the target Base MCP tool: send_calls | swap | sign | none, plus the exact mapping/normalization.>

## Example Prompts
<2–4 concrete prompts, each → numbered steps referencing the sections above.>

<!-- ## Risks & Warnings — only if risk is non-empty: one bullet per risk tag (hazard + guardrail). -->

## Notes
<constants, token addresses, scaling rules, known gotchas, deep reference material.>
```

## Authoring Checklist

Before opening a PR, confirm:

- [ ] Frontmatter present with all **required** fields; enum values are valid (`integration`, `shell`, `auth`, `risk` tags); `tags` set for discovery (reusing existing vocabulary where it fits).
- [ ] `integration` is the most specific value that fits; flags (`shell`, `allowlist`, `externalMcp`, `cliPackage`, `auth`, `risk`) are accurate and derived from real behavior.
- [ ] `> [!IMPORTANT]` onboarding callout is first.
- [ ] `## Overview`, `## Surface Routing`, `## Orchestration`, `## Submission`, `## Example Prompts` all present (the **R** sections).
- [ ] Conditional sections included where flags demand: `## Detection`/`## Installation` for external MCPs, `## Auth` when `auth != none`, `## Risks & Warnings` when `risk` is non-empty, `## Endpoints` (http-api) or `## Commands` (cli-only / CLI path).
- [ ] For `externalMcp`: `transport` set, with the matching fields (`url` for `http`/`sse`; `command`/`args`/`env` for `stdio`). Local (`stdio`) MCPs pin an exact version (no `@latest`), list `env` names only, carry the `local-exec` risk tag, and `## Surface Routing` stops on shell-less surfaces.
- [ ] `## Surface Routing` states the shell-less / chat-only behavior (fallback or stop).
- [ ] Heading names are canonical — no synonyms (see [Canonical heading names](#canonical-heading-names)).
- [ ] `## Submission` names a concrete Base MCP tool and shows the mapping into it.
- [ ] Sections appear in canonical order; no internal `#anchor` links were broken by a rename.
- [ ] Diff stays within [Contribution Scope](#contribution-scope): only `plugins/<slug>.md` is added (plus a net-new tag in the vocabulary list if applicable). The `SKILL.md` registry, the Integration Types **Examples** column, and the Existing Plugin Conformance table are left for maintainers.

---

## Existing Plugin Conformance

> Maintainer-managed. Do not edit this table or its count in a plugin contribution PR — maintainers update it when a plugin is accepted (see [Contribution Scope](#contribution-scope)).

Current integration classification for the 7 native plugins:

| Plugin | `integration` | `chains` | `tags` | `shell` | `auth` | `risk` |
|---|---|---|---|---|---|---|
| Aerodrome | `cli-only` | `[base]` | `[dex, swap, liquidity, staking]` | `required` | `none` | `[slippage]` |
| Avantis | `hybrid` | `[base]` | `[perps, leverage, trading, derivatives]` | `optional` | `none` | `[liquidation, slippage, irreversible]` |
| Bankr | `http-api` | `[base]` | `[token-launches, trading, memecoins, discovery]` | `none` | `none` | `[low-liquidity, irreversible]` |
| Moonwell | `http-api` | `[base, optimism]` | `[lending, borrowing, yield]` | `none` | `none` | `[liquidation]` |
| Morpho | `hybrid` | `[base]` | `[lending, borrowing, vaults, yield]` | `optional` | `none` | `[liquidation]` |
| Uniswap | `http-api` | `[base]` | `[dex, swap, liquidity]` | `none` | `api-key` | `[slippage]` |
| Virtuals | `external-mcp` | `[]` | `[ai-agents, agent-commerce, payment-cards, email]` | `none` | `siwe-jwt` | `[pii]` |

All seven are at `version: 0.2.0` as of the spec-conformance restructure.
