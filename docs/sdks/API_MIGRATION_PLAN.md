# SDK and API reference migration plan

## Decision

Use a hybrid reference architecture based on each interface's real source format:

- Generate Base Account SDK symbol reference from a TypeDoc JSON artifact.
- Keep JSON-RPC method pages as MDX generated from an OpenRPC-style canonical schema.
- Generate WebSocket channel reference from AsyncAPI 3.0 schemas.
- Keep quickstarts, guides, protocol explanations, and operational warnings as curated MDX.

Do not model every `eth_*` or `debug_*` method as a separate OpenAPI operation. Base exposes JSON-RPC methods through the same `POST /` transport, while OpenAPI permits only one `post` operation per path. Inventing paths such as `/eth_call` would make the playground send invalid requests.

## Current state

- The Base Chain API has 37 curated MDX pages: one overview, 27 Ethereum JSON-RPC methods, three debug methods, two Flashblocks HTTP methods, three Flashblocks subscriptions, and one Flashblocks overview.
- Base Account SDK guides and exported-symbol reference are both curated MDX.
- `docs/openapi/onchainkit.yaml` was unreferenced, had no API server, and described legacy OnchainKit endpoints. It was removed during this planning pass rather than treated as a migration input.
- API Reference remains in the **SDKs & APIs** tab. The tab keeps its `[WIP]` suffix until route parity and generated-reference validation are complete.

## Target architecture

### Base Account SDK

Generate a TypeDoc JSON artifact from the released `@base-org/account` source and use it as the canonical inventory of exported functions, classes, interfaces, and types. Continue authoring these areas manually:

- Product and architecture overviews
- Quickstarts and framework integration guides
- Base Pay workflows and operational guidance
- EIP-1193/provider RPC behavior that needs semantic descriptions beyond TypeScript signatures
- Onchain contract reference

Mintlify's native `sdk` navigation property must be tested against the existing combined SDK/API tab. If native TypeDoc generation cannot coexist with nested AsyncAPI content in the same tab, generate MDX from the TypeDoc artifact in CI and preserve the current navigation structure.

### JSON-RPC and Flashblocks HTTP

Adopt an OpenRPC-style schema as the canonical method inventory. Build a deterministic generator that emits one MDX route per method and preserves:

- Existing URLs and sidebar titles
- Positional parameter order
- Success and JSON-RPC error envelopes
- Base-specific `pending` behavior
- Flashblocks availability and provider limitations
- Tested cURL examples

OpenAPI may document the shared `POST /` transport as a single operation, but it must not replace the per-method navigation or pretend that JSON-RPC method names are HTTP paths.

### WebSockets and Flashblocks streams

Create AsyncAPI 3.0 schemas for:

1. JSON-RPC subscription requests, subscription IDs, `eth_subscription` notifications, and unsubscribe operations.
2. Flashblocks-specific subscription types such as `newFlashblocks`, `newFlashblockTransactions`, and `pendingLogs`.
3. The raw Flashblocks infrastructure stream when its connection and payload envelope differ from JSON-RPC WebSockets.

Keep these schemas separate when they use different servers or message envelopes. Generated channel pages must retain links to the curated Flashblocks explanation and operational warnings.

## Migration phases

1. **Assign sources and owners.** Identify the SDK release job that produces TypeDoc, the repository that owns the canonical RPC schema, and the owner of Flashblocks message schemas.
2. **Prove the generators.** Generate three representative RPC pages (`eth_call`, `eth_getLogs`, and `debug_traceTransaction`), one JSON-RPC subscription, one raw Flashblocks channel, and three SDK symbols. Compare them with the current pages without changing navigation.
3. **Test Mintlify composition.** Verify whether a tab using `sdk` can also contain the required nested AsyncAPI groups. If not, use the TypeDoc-to-MDX fallback.
4. **Establish CI.** Pin generator versions, validate schemas, fail on undocumented additions or removed public symbols, and publish generated changes through reviewable pull requests.
5. **Migrate with route parity.** Replace one reference group at a time. Preserve URLs where possible and add redirects before removing any authored page.
6. **Remove `[WIP]`.** Drop the suffix only after the complete reference passes route, search, playground, and example validation in production preview.

## Acceptance criteria

- Every current API and SDK reference route either remains available or has a tested redirect.
- JSON-RPC playground requests use the real Base endpoint and valid JSON-RPC envelopes.
- AsyncAPI pages use current WebSocket URLs and render request and notification payloads separately.
- Generated SDK pages match the public exports of the pinned package release.
- Curated guides can link to stable generated routes without coupling to generated filenames.
- CI detects schema drift, broken references, duplicate routes, and stale generated output.
- Search and `llms.txt` include generated content without duplicating curated pages.

## Mintlify references

- [API playground overview](https://www.mintlify.com/docs/api-playground/overview)
- [OpenAPI setup](https://www.mintlify.com/docs/api-playground/openapi-setup)
- [AsyncAPI setup](https://www.mintlify.com/docs/api-playground/asyncapi-setup)
- [SDK reference setup](https://www.mintlify.com/docs/api-playground/sdk-reference-setup)
