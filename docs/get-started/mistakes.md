# mistakes

## 2026-03-04

1. The guide examples used `useWriteContracts` from `wagmi/experimental`, but in current wagmi this path is unavailable. I switched to `useSendCalls` with encoded calldata for EIP-5792 batching.
2. First contract deploy attempt was only a dry run because `forge create` requires `--broadcast` to publish onchain.
3. WalletConnect requires `NEXT_PUBLIC_WC_PROJECT_ID`. If this is missing in Vercel environment variables, WalletConnect flow will fail.
4. Next.js warned about multiple lockfiles in parent folders (`/Users/canton/git/package-lock.json` and local lockfile), which may affect inferred workspace root in local builds.
5. Docs gap: the guide does not explicitly pin `chainId` on `useReadContract`/write calls. With multiple configured chains and a contract deployed only on Base Sepolia, disconnected users can default to Base mainnet and see `Failed to read contract`. Fix is to set `chainId: baseSepolia.id` for reads/writes (or gate reads by selected chain).
6. Docs gap: chain switching should be documented as part of the core flow (not only in "Next steps"). When multiple chains are configured, the guide should include `useSwitchChain` gating before writes and clear UX copy for "Switch to Base Sepolia" to prevent silent transaction failures.
7. Docs gap: write UX should include an explicit wrong-network state and actionable button before calling `writeContract`/`sendCalls`. Implemented fix in this app: disable write buttons on wrong chain and show `Switch to Base Sepolia`.
8. Docs gap: batching example uses `useWriteContracts` from `wagmi/experimental`, which is not available in current wagmi versions used here. Implemented fix in this app: use `useSendCalls` with encoded calldata for EIP-5792 batches.

# Build Mistakes & Lessons Learned

Each entry records: origin, symptom, cause, the exact code fix applied, and a recommendation
for the docs. Entries are in the order they were encountered during the build.

---

## 1. `wagmi/experimental` subpath removed in wagmi v3

**Origin: Docs error — stale API**

The guide instructs:
```ts
import { useWriteContracts } from 'wagmi/experimental'
```
`wagmi/experimental` no longer exists as a subpath export in wagmi v3. The `useWriteContracts`
hook was replaced by `useSendCalls` in the main `'wagmi'` package.

**Symptom:** Hard build error at compile time.
```
Package subpath './experimental' is not defined by "exports"
```

**Fix applied (`src/components/BatchIncrement.tsx`):**
- Replaced `import { useWriteContracts } from 'wagmi/experimental'` with
  `import { useSendCalls, useWaitForCallsStatus } from 'wagmi'`
- Calls are passed as `{ to, data }` objects using viem's `encodeFunctionData` rather than
  `{ address, abi, functionName }` tuples
- Replaced `useWaitForTransactionReceipt` in the batch flow with `useWaitForCallsStatus`

**Docs recommendation:** Update all batch code examples from `useWriteContracts` to
`useSendCalls` to reflect the wagmi v3 API.

---

## 2. `useSendCalls` data is an object, not a plain string

**Origin: Docs error — stale API shape**

The guide implies the call ID returned from the batch hook can be passed directly to the
status hook. In wagmi v3, `useSendCalls` returns `data: { id: string, capabilities?: ... }`.
Passing `data` directly to `useWaitForCallsStatus({ id })` causes a TypeScript error:
```
Type '{ capabilities?: ...; id: string; } | undefined' is not assignable to type 'string | undefined'
```

**Fix applied (`src/components/BatchIncrement.tsx`):**
```ts
// Before
const { data: callsId, ... } = useSendCalls()
useWaitForCallsStatus({ id: callsId })

// After
const { data, ... } = useSendCalls()
useWaitForCallsStatus({ id: data?.id })
```

**Docs recommendation:** Show the correct shape for `useSendCalls` return data and demonstrate
the `.id` extraction.

---

## 3. WalletConnect connector crashes when project ID is not set

**Origin: Docs gap — missing prerequisite and unsafe non-null assertion**

The guide shows:
```ts
walletConnect({
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID!,
})
```
The non-null assertion (`!`) tells TypeScript to ignore the possibility of `undefined`, but
at runtime, if `NEXT_PUBLIC_WC_PROJECT_ID` is not set, wagmi initialises WalletConnect with
an empty project ID and throws. Most developers following the guide will not have a
WalletConnect project ID ready at the start of the tutorial.

**Symptom:** App crashes on load with a WalletConnect initialisation error when the
environment variable is absent.

**Fix applied (`src/config/wagmi.ts`):**
```ts
// Before
walletConnect({ projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID! })

// After — only include the connector when the project ID is actually set
...(process.env.NEXT_PUBLIC_WC_PROJECT_ID
  ? [walletConnect({ projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID })]
  : [])
```

**Docs recommendation:** Add a note that a WalletConnect Cloud project ID is required before
the wagmi config step, with a link to https://cloud.walletconnect.com. Replace the `!`
assertion with a conditional connector so the app works without WalletConnect during
development.

---

## 4. Foundry not pre-installed

**Origin: Environment — missing prerequisite**

`forge` was not present. The guide proceeds directly to `forge init` with no prerequisite
check.

**Fix applied:**
```bash
curl -L https://foundry.paradigm.xyz | bash
source ~/.zshenv
foundryup
```

**Docs recommendation:** Add a prerequisites section with `forge --version` as a check before
the contract deployment step.

---

## 5. Next.js workspace root warning

**Origin: Environment — non-fatal**

Next.js 16 + Turbopack detected multiple `package-lock.json` files and warned about the
inferred workspace root. Does not affect the build.

**Fix applied:** No code change required.

**Docs recommendation:** Note that projects inside a monorepo may see this warning and that
`turbopack.root` in `next.config.ts` silences it.

---

## 6. `cast wallet import --interactive` requires a TTY

**Origin: Docs gap — environment assumption**

`cast wallet import deployer --interactive` requires an interactive terminal and cannot run
in scripted or piped environments.

**Fix applied (deployment only):** Used `cast wallet new` to generate a throwaway key and
passed it via `--private-key`. **Never use this with real funds.**

**Docs recommendation:** Note the TTY requirement and show a `--private-key $DEPLOYER_KEY`
alternative for non-interactive environments.

---

## 7. Official Base Sepolia RPC URL unreachable

**Origin: Docs error — broken default RPC**

The guide uses `https://sepolia.base.org`. This returned "Connection reset by peer"
consistently during the build and deployment steps.

**Fix applied (`src/config/wagmi.ts`):**
```ts
// Before
[baseSepolia.id]: http()

// After
[baseSepolia.id]: http('https://base-sepolia-rpc.publicnode.com')
```

**Docs recommendation:** Replace `https://sepolia.base.org` with a verified working public
endpoint, or list at least one fallback option.

---

## 8. Wrong default chain — all reads and writes target Base mainnet

**Origin: Docs gap caught late by agent (shared blame)**

The guide shows `chains: [base, baseSepolia]` with `base` first, deploys the contract to
`baseSepolia`, but never instructs you to specify `chainId` in hook calls. wagmi defaults
every unqualified call to the first chain in the array (`base` = mainnet), where the contract
does not exist.

**Symptom:** "Failed to read contract" on every page load. Write calls silently fail.

**Fix applied:**
- `src/components/CounterDisplay.tsx` — added `chainId: baseSepolia.id` to `useReadContract`
- `src/components/IncrementButton.tsx` — added `chainId: baseSepolia.id` to `writeContract`
- `src/components/BatchIncrement.tsx` — added `chainId: baseSepolia.id` to `writeContract`
  and `sendCalls`

**Docs recommendation:** Either list `baseSepolia` first in the chains array, or include
`chainId` explicitly in every hook example. Add a callout explaining that the first chain in
the array is the default for all calls that do not specify one.

---

## 9. Wrong chain used for EIP-5792 capability check

**Origin: Docs error — misleading hook usage**

The guide shows:
```ts
const chainId = useChainId()
const supportsBatching = useMemo(() => {
  const atomic = capabilities?.[chainId]?.atomic  // chainId = wallet's CURRENT chain
  ...
}, [capabilities, chainId])
```

`useChainId()` returns the wallet's current chain. MetaMask reports partial EIP-5792 support
for Ethereum mainnet, so a MetaMask user on mainnet gets `supportsBatching = true` and sees
the EIP-5792 batch UI instead of the correct EOA single-transaction flow.

**Symptom:** MetaMask users see "Smart wallet detected — using EIP-5792 batch" and the
purple batch button instead of the green increment button.

**Fix applied (`src/hooks/useWalletCapabilities.ts`):**
```ts
// Before
import { useCapabilities, useChainId } from 'wagmi'
const chainId = useChainId()
const atomic = capabilities?.[chainId]?.atomic

// After — always check against the app's target chain
import { useCapabilities } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
const atomic = capabilities?.[baseSepolia.id]?.atomic
```
`useChainId` import also removed since it is no longer used.

**Docs recommendation:** Replace `useChainId()` with the app's hardcoded target chain ID,
and add a note that `useChainId()` reflects the wallet's current chain, not your deployment
chain.

---

## 10. Write buttons freeze silently when wallet is on the wrong chain

**Origin: Docs gap — critical UX step deferred to "Next steps"**

The guide builds write buttons with no chain-switching mechanism and lists `useSwitchChain`
only in the "Next steps" section as optional polish. Without it, calling
`writeContract({ chainId: baseSepolia.id })` while connected to mainnet causes wagmi to
attempt a background chain switch. If MetaMask's popup is missed or dismissed, the button
stays at `isPending: true` with no error, no timeout, and no recovery path.

**Symptom:** Increment button shows "Confirm in Wallet..." and never changes. Nothing happens
on click.

**Fix applied:**
- `src/components/IncrementButton.tsx` — added `useChainId()` check; renders a
  "Switch to Base Sepolia" button via `useSwitchChain` when `chainId !== baseSepolia.id`
- `src/components/BatchIncrement.tsx` — same check added to both `BatchFlow` and
  `SequentialFlow` via a shared `ChainSwitchButton` component

```ts
const chainId = useChainId()
const { switchChain, isPending: isSwitching } = useSwitchChain()

if (chainId !== baseSepolia.id) {
  return (
    <button onClick={() => switchChain({ chainId: baseSepolia.id })}>
      {isSwitching ? 'Switching...' : 'Switch to Base Sepolia'}
    </button>
  )
}
```

**Docs recommendation:** Move chain switching from "Next steps" into the core `IncrementButton`
step. Add a warning that omitting `useSwitchChain` causes silent freezes for any user not
already on the target network.

---

## 11. `useReadContract` fails after wallet connect — injected provider overrides HTTP transport

**Origin: Docs gap — wagmi account-awareness and provider preference not explained**

**Console signal:** `Unchecked runtime.lastError: Could not establish connection. Receiving end does not exist.`

This Chrome error means MetaMask's MV3 background service worker has been killed by the
browser. When dead, every call through `window.ethereum` fails silently.

wagmi's `useReadContract` includes the connected account in its TanStack Query key. When
MetaMask connects, the key changes and a fresh fetch is triggered. wagmi v3 prefers the
injected provider for chains it detects as available, so this new fetch goes through
`window.ethereum` (dead) instead of the configured HTTP transport. The fetch fails,
`data` is `undefined` (new key, no cache), and "Failed to read contract" is shown.

The same dead service worker also causes `useSwitchChain` and `writeContract` to fail with
no visible error — buttons appear completely frozen.

**Symptom:** Counter shows correctly before wallet connect, then immediately shows
"Failed to read contract" after connecting. Clicking any transaction or chain-switch button
does nothing.

**Fix applied:**

*For reads (`src/components/CounterDisplay.tsx`):*
Replaced `useReadContract` entirely with `usePublicClient` + `useQuery`:
```ts
// Before — account-aware, uses injected provider after wallet connects
const { data: count, isError } = useReadContract({
  address: COUNTER_ADDRESS,
  abi: counterAbi,
  functionName: 'number',
  chainId: baseSepolia.id,
})

// After — HTTP transport only, stable query key never affected by wallet state
const publicClient = usePublicClient({ chainId: baseSepolia.id })
const { data: count, isError, error } = useQuery({
  queryKey: ['counter', COUNTER_ADDRESS, baseSepolia.id],
  queryFn: () => publicClient!.readContract({
    address: COUNTER_ADDRESS,
    abi: counterAbi,
    functionName: 'number',
  }),
  enabled: !!publicClient,
  refetchInterval: 5_000,
})
```

`usePublicClient({ chainId: baseSepolia.id })` returns the client built from the configured
`http('https://base-sepolia-rpc.publicnode.com')` transport — no injected provider involved.
The query key contains no account, so connecting a wallet never invalidates or refetches it.

*For write/switch errors (`src/components/IncrementButton.tsx`, `BatchIncrement.tsx`):*
Exposed the `error` field from `useSwitchChain`, `useWriteContract`, and `useSendCalls` and
rendered it with MetaMask-aware messaging:
```ts
const { switchChain, error: switchError } = useSwitchChain()
const { writeContract, error: writeError } = useWriteContract()

{switchError && (
  <p>
    {switchError.message.includes('Receiving end')
      ? 'MetaMask is not responding. Reload the extension or refresh the page.'
      : switchError.message}
  </p>
)}
```

**Docs recommendation:**
- In the "Read contract data" step, warn that `useReadContract` uses the injected provider
  for refetches after wallet connection. Recommend `usePublicClient` + `useQuery` for reads
  that must remain transport-stable across wallet state changes.
- In all write examples, show the `error` field being rendered. Silent mutation failures
  leave users with no actionable information.

---

## 12. `if (isError)` wipes cached counter value on any refetch failure

**Origin: Docs error — incorrect TanStack Query error pattern**

**Note:** This was an intermediate fix that was subsequently superseded by the full
`usePublicClient + useQuery` rewrite in entry 11. Documented here because it represents
a general TanStack Query pitfall that applies beyond this guide.

The guide shows:
```tsx
if (isLoading) return <p>Loading...</p>
if (isError)   return <p>Failed to read contract</p>  // ← unconditional

return <p>{count?.toString()}</p>
```

When a wallet connects, wagmi refetches. If that refetch errors, `isError` is `true` but
`data` still holds the last good value in the query cache. The docs pattern discards that
cached value and replaces the UI with an error message.

**Symptom:** Counter value disappears and is replaced with "Failed to read contract"
immediately after wallet connection, even though the value was readable moments before.

**Intermediate fix applied (later superseded by entry 11):**
```tsx
if (isLoading && count === undefined) return <p>Loading...</p>
if (isError   && count === undefined) return <p>Failed to read contract</p>
return <p>{count.toString()}</p>
```

**Docs recommendation:** Gate all error renders on `data === undefined`. Add a note that
`isError` can be `true` while `data` is still populated with stale cache — stale data should
always be preferred over an error message.

---

## 13. Trailing space in Vercel environment variable causes invalid address error

**Origin: Agent error — unsafe env var injection method**

When setting the contract address on Vercel using `vercel env add` with a shell heredoc
(`<<<`), the shell appended a trailing newline which Vercel stored as a trailing space:
```
NEXT_PUBLIC_COUNTER_ADDRESS=0xe54182C63622A76Ab0C9Ac314601CD8A46AB4c2c  ← trailing space
```

viem validates addresses strictly and rejects any value that is not exactly 40 hex
characters:
```
Address "0xe54182C63622A76Ab0C9Ac314601CD8A46AB4c2c " is invalid.
- Address must be a hex value of 20 bytes (40 hex characters).
```

**Symptom:** "Failed to read contract" on page load and an address validation error on every
write, even though the address itself is correct.

**Fix applied:**
1. Removed and re-added the Vercel env var using `printf` to prevent the trailing newline:
   ```bash
   printf '0xe54182C63622A76Ab0C9Ac314601CD8A46AB4c2c' | vercel env add NEXT_PUBLIC_COUNTER_ADDRESS production
   ```
2. Added `.trim()` to `src/config/counter.ts` as a permanent safety net:
   ```ts
   export const COUNTER_ADDRESS = (
     process.env.NEXT_PUBLIC_COUNTER_ADDRESS || '0xe54182C63622A76Ab0C9Ac314601CD8A46AB4c2c'
   ).trim() as `0x${string}`
   ```

**Docs recommendation:** When showing `vercel env add`, use `printf` rather than `echo` or
heredoc. Note that `echo` and `<<<` both append a newline that gets stored in the value.