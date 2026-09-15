/**
 * LLM client for sync-from-base.
 *
 * Uses @anthropic-ai/sdk only as the message-protocol client for Coinbase's
 * internal LLM Gateway (https://llm-gateway.coinbase-corp.com). The base URL
 * is explicitly set to the Gateway and authentication uses the internal
 * LLM_GATEWAY_API_KEY sent as the standard Anthropic `x-api-key` header. This
 * client does not make direct requests to an external model-provider API.
 *
 * Owns three responsibilities:
 *
 *   1. `complete(prompt, page)` — one streamed Gateway call; records a
 *      bench row. `callClaude` is the text-only convenience over it. Retries on 5xx / 429 / network errors are
 *      handled inside the SDK (`maxRetries`), so this file no longer
 *      carries its own retry loop.
 *
 *   2. Benchmark log — every successful call appends a flat record to the
 *      module-level `BENCH_LOG` array. The caller (main loop in index.mjs)
 *      flushes the array to disk at the end of a run. We don't pipe this
 *      through GITHUB_OUTPUT because the records are too large; instead the
 *      receiver workflow uploads the dumped JSONL as an artifact.
 *
 *   3. Model + retry configuration — `DEFAULT_MODEL`, `DEFAULT_MAX_TOKENS`,
 *      and the SDK retry budget live here, all overridable via env vars
 *      so future cost/latency tuning is one config change away.
 *
 * Nothing in this file knows about prompts or routing. The single contract
 * with callers is: pass a string, get a string (or a thrown Error).
 */

import GatewayMessagesClient from "@anthropic-ai/sdk";

const GATEWAY_BASE_URL =
  process.env.LLM_GATEWAY_BASE_URL || "https://llm-gateway.coinbase-corp.com";

/** Default model — Sonnet 4.6. Override with CLAUDE_MODEL env. */
export const DEFAULT_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";

/** Default max output tokens. Override with CLAUDE_MAX_TOKENS env. */
export const DEFAULT_MAX_TOKENS = Number(process.env.CLAUDE_MAX_TOKENS || 4096);

/**
 * Haiku model name. Used by the pre-pass that extracts a structured change
 * manifest from a release-scale diff before per-page Sonnet calls.
 */
export const HAIKU_MODEL = "claude-haiku-4-5";

/**
 * Module-level benchmark log. The main loop flushes this to disk at the
 * end of a run; the workflow then uploads it as an artifact. One row per
 * successful gateway call.
 *
 * Schema (all fields flat, JSONL-friendly):
 *   {
 *     page:             string  — the doc page this call edits
 *     model:            string  — the model identifier passed to the gateway
 *     latency_ms:       number  — wall-clock end-to-end including any SDK retries
 *     prompt_chars:     number  — length of the prompt string (chars, not tokens)
 *     completion_chars: number  — length of the text we got back (chars)
 *     input_tokens:     number|null  — from usage.input_tokens
 *     output_tokens:    number|null  — from usage.output_tokens
 *     stop_reason:      string|null  — "end_turn", "max_tokens", etc.
 *   }
 */
export const BENCH_LOG = [];

let _client = null;
function getClient() {
  if (_client) return _client;
  const gatewayToken = process.env.LLM_GATEWAY_API_KEY;
  if (!gatewayToken) {
    throw new Error(
      "LLM_GATEWAY_API_KEY is not set. Required when a page is routed through 'claude'.",
    );
  }
  _client = new GatewayMessagesClient({
    // The Gateway authenticates on the standard Anthropic `x-api-key` header.
    // Using `apiKey` (not `authToken`) makes the SDK send `x-api-key` rather
    // than `Authorization: Bearer`; requests without `x-api-key` are treated
    // as untrusted by the Gateway's Cloudflare edge and get a 403 bot
    // challenge before reaching the app. This matches base/base's working
    // Claude Code workflow, which passes the same key via `anthropic_api_key`.
    apiKey: gatewayToken,
    baseURL: GATEWAY_BASE_URL,
    // Retries cover 408 / 429 / 5xx / network errors with exponential backoff.
    maxRetries: 4,
  });
  return _client;
}

/**
 * Call Coinbase's internal LLM Gateway through its compatible protocol client.
 *
 * @param {string} prompt — the user-message content (built by ./prompts.mjs)
 * @param {string=} page  — doc page path, recorded in the bench log so we can
 *                          correlate spend with which page was edited
 * @param {{system?: string, model?: string, maxTokens?: number}=} opts
 *        `system` is forwarded verbatim in the Gateway request's system field,
 *        which the model treats with higher precedence than user messages. We
 *        use it for hard security directives (untrusted-input boundary,
 *        no raw HTML, no secrets); the editorial rules stay in the user
 *        prompt where they're easier to tune per dispatch kind.
 * @returns {Promise<string>} the model's text output
 */
/**
 * Send one prompt through the Gateway and return the text plus the facts a
 * caller needs to judge it (stop reason, output tokens). Streams the
 * response: the Gateway edge times out a silent buffered request at ~90 s,
 * which a long page regeneration exceeds; a stream delivers its first token
 * in seconds and keeps the connection alive for the whole generation.
 *
 * @param {string} prompt
 * @param {string=} page   doc page path, recorded in the bench log
 * @param {{system?: string, model?: string, maxTokens?: number}=} opts
 * @returns {Promise<{text: string, stopReason: string|null, outputTokens: number|null}>}
 */
export async function complete(prompt, page = "", opts = {}) {
  const client = getClient();
  const model = opts.model || DEFAULT_MODEL;
  const maxTokens = opts.maxTokens || DEFAULT_MAX_TOKENS;

  const tStart = Date.now();
  const message = await client.messages
    .stream({
      model,
      max_tokens: maxTokens,
      ...(opts.system ? { system: opts.system } : {}),
      messages: [{ role: "user", content: prompt }],
    })
    .finalMessage();

  const text = (message.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  if (!text) {
    // Empty completion is a model-side issue, not transient — surface.
    throw new Error("LLM gateway returned no text content");
  }

  BENCH_LOG.push({
    page,
    model,
    latency_ms: Date.now() - tStart,
    prompt_chars: prompt.length,
    completion_chars: text.length,
    input_tokens: message.usage?.input_tokens ?? null,
    output_tokens: message.usage?.output_tokens ?? null,
    stop_reason: message.stop_reason ?? null,
  });

  return {
    text,
    stopReason: message.stop_reason ?? null,
    outputTokens: message.usage?.output_tokens ?? null,
  };
}

/** Text-only convenience over complete(). */
export async function callClaude(prompt, page = "", opts = {}) {
  return (await complete(prompt, page, opts)).text;
}
