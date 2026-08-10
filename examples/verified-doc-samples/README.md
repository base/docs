# Verified documentation samples

These projects are the executable source of truth for code published in the
Base use-case guides. The MDX files contain invisible `sample:` markers, and
`node scripts/verify-doc-samples.js` compares each marked fence with the
corresponding `docs:start` / `docs:end` region in this directory.

Run all offline checks from the repository root:

```bash
node scripts/verify-doc-samples.js
```

Live Base Sepolia evidence is recorded in `verification-manifest.json`. Never
commit private keys, API credentials, or funded environment files.

The x402 servers require `PAY_TO` and a separate
`RECEIVER_AUTHORIZER_PRIVATE_KEY` for batch-settlement claim/refund signatures.
The authorizer key does not receive payments and should live in a server-side
key manager in production.
