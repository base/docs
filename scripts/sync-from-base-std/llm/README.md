# llm/ — the LLM call and its prompts

Everything in this folder is about *what we send to the model and how*. If
you want to read the prompts the sync script uses, **start here**, not in
`../index.mjs`. The router in index.mjs only knows about pages, routes, and
dispatch payloads — it imports from this folder for the model interaction.

## Files

- **`prompts.mjs`** — three prompt builders, one per dispatch kind
  (`code-change`, `release`, `manual-update`), plus a shared rules block.
  Every prompt sent to the model is built here. Open this file first if
  you're changing what the script asks the model to do.
- **`client.mjs`** — Coinbase's internal LLM Gateway client. It uses
  `@anthropic-ai/sdk` only as a compatible message-protocol client, with its
  base URL fixed to `llm-gateway.coinbase-corp.com` and authentication supplied
  by `LLM_GATEWAY_API_KEY` as a Bearer token. It does not call an external
  model-provider API. Retry, backoff, and benchmark logging also live here.
  Nothing here knows about prompts or routes; the contract is "pass a string,
  get a string back."
- **`README.md`** — you are here.

## Shape of the contract with the main loop

The main loop in `../index.mjs` calls:

```js
import { buildClaudePrompt } from "./llm/prompts.mjs";
import { callClaude, BENCH_LOG } from "./llm/client.mjs";

const prompt = buildClaudePrompt(kind, ctx);   // pure: ctx → string
const output = await callClaude(prompt, page); // side-effect: Gateway call + bench
```

`BENCH_LOG` is a module-level array that accumulates one record per
successful call. The main loop flushes it to a JSONL file at the end of a
run; the workflow uploads that JSONL as an artifact named
`sync-bench-<run_id>`.

## When you'd touch what

| Change goal | Edit |
|---|---|
| Reword the rules the model must follow | `prompts.mjs` — `SHARED_RULES` |
| Add a new dispatch kind | `prompts.mjs` — new builder + extend `buildClaudePrompt` |
| Switch model or change max_tokens | `client.mjs` — `DEFAULT_MODEL`, `DEFAULT_MAX_TOKENS`, or set env vars |
| Adjust retry policy | `client.mjs` — `MAX_ATTEMPTS`, `BACKOFFS` |
| Add a new field to the bench log | `client.mjs` — the `BENCH_LOG.push({...})` block |
| Per-page allowlist of components | `prompts.mjs` — `SHARED_RULES`, mirror to `ALLOWED_MDX_COMPONENTS` in `../index.mjs` |

The component allowlist is intentionally duplicated: the prompt tells the
model what to use; the validator in `../index.mjs` enforces it. Keep them in
sync — if you add a component to the prompt, add it to the validator too.

## Things this folder explicitly does NOT do

- **Routing.** Which pages to call the LLM on lives in `../route-table.json`
  and `../index.mjs`. The prompts don't know about pages, only about the
  current page's content.
- **Validation.** Post-processing checks (front-matter present, allowed
  components only) live in `../index.mjs` so we can reject without burning
  another model call.
- **File IO.** The client doesn't read or write files. The main loop owns
  that.
- **Decision-making about when to call.** Noop-detection (page unchanged
  after Claude returns) lives in the main loop, not here.

This separation is so that the prompts file stays readable as a standalone
artifact. If you're optimizing for cost or behavior, you're almost always
editing `prompts.mjs`. Everything else is plumbing.
