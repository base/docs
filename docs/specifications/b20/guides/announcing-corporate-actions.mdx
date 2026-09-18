# Announce a Corporate Action

## Goal

Issuers of a B20 Asset need a paved way to announce a corporate action. Indexers need a dedicated way to know which actions took place on an asset and to display them to their users.

Combine a state change on the asset with a holder-facing disclosure in one flow. That flow is an announcement. `announce` is the path. Announcements define that standard for both.

Announcements cover operator-driven changes that affect holders: stock splits, reverse splits, reinvested dividends, additional issuance, treasury burns, and notices with no on-chain effect.

This surface exists only on **B20 Asset**. Stablecoin has no announcements. The rest of this guide uses "the asset" for an Asset token.


## What an announcement is

An announcement structurally wraps underlying calls on the asset in one flow. `announce` takes `internalCalls`, a single-use `id`, a `description`, and an optional `uri`.

- `internalCalls` is the set of inner calls that run with the announcement. Each entry is calldata against this asset, not `(target, calldata)`. Inner methods may still call out. Empty `internalCalls` is a notice with no on-chain effect.
- The caller chooses `id`. A successful `announce` consumes that `id` for the asset's lifetime. Reuse reverts `AnnouncementIdAlreadyUsed`. After success, `isAnnouncementIdUsed(id)` is true.
- `description` is the on-chain summary. `uri` points to the off-chain record. The asset does not verify either. Treat them as operator-supplied claims.

The call runs in this order:

1. Emit `Announcement(caller, id, description, uri)`.
2. Run the inner calls atomically.
3. Emit `EndAnnouncement(id)`.

If any inner call fails, the whole transaction reverts and `id` is not consumed. An inner call that re-invokes `announce` reverts `AnnouncementInProgress`. Empty `internalCalls` still emits both events, with nothing between them. 

## Who may announce, and how to read it

The caller of `announce` must hold `OPERATOR_ROLE`. Any other caller reverts `AccessControlUnauthorizedAccount`. Inner calls keep their own gates. Self-`delegatecall` preserves `msg.sender`, so the operator needs every role the inner calls require.

Indexers:

- `Announcement(caller, id, description, uri)` starts exactly one bracket. `EndAnnouncement(id)` closes it.
- Pair open and close by `id`, not only by adjacency.
- Every effect between those logs belongs to the announced action.
- If a state-changing call is not between `Announcement` and `EndAnnouncement`, the operator invoked it directly, not through `announce`. 

## Example

### Before you start

You need all of the following:

- A B20 Asset you administer. 
- `DEFAULT_ADMIN_ROLE` on that asset, so you can grant `OPERATOR_ROLE` and any inner-call roles.
- An account that will call `announce` that has the operator.

## Steps

Grant roles, choose the disclosure, encode the inner calls, then announce. The scenarios after these steps apply the same path to each corporate-action type.

1. Grant `OPERATOR_ROLE`.
2. Choose a never-used `id`, a `description`, and optional `uri`.
3. Encode the inner calldata.
4. Call `announce(internalCalls, id, description, uri)`.
5. Confirm `Announcement` then `EndAnnouncement` with the same `id`.

### 1. Grant `OPERATOR_ROLE`

```solidity
asset.grantRole(asset.OPERATOR_ROLE(), operator);
```

Until this grant lands, every `announce` reverts `AccessControlUnauthorizedAccount`.

Grant inner-call roles on the same operator when the wrapped call needs them. Mint needs `MINT_ROLE`. Burn needs `BURN_ROLE`. Multiplier setters already use `OPERATOR_ROLE`.

```solidity
asset.grantRole(asset.MINT_ROLE(), operator);
asset.grantRole(asset.BURN_ROLE(), operator);
```

### 2. Choose `id`, `description`, and `uri`

Pick an `id` that has never succeeded on this asset. Reuse reverts `AnnouncementIdAlreadyUsed`.

Write a `description` holders will see. Pass a `uri` if the full record lives off-chain. Either string may be empty. The asset does not verify them.

### 3. Encode inner calldata

Each entry is ABI-encoded calldata against this asset. Use `abi.encodeCall` or a `B20FactoryLib` helper such as `encodeUpdateUIMultiplier` or `encodeBatchMint`. A blob shorter than 4 bytes reverts `InternalCallMalformed`. Do not put `announce` in the array.

```solidity
bytes[] memory calls = new bytes[](1);
calls[0] = abi.encodeCall(IB20Asset.updateUIMultiplier, (newMultiplier, effectiveAt));
```

For a notice with no on-chain effect, pass an empty array:

```solidity
bytes[] memory calls = new bytes[](0);
```

### 4. Call `announce`

The operator calls:

```solidity
asset.announce(calls, id, description, uri);
```

### 5. Confirm the events

On success the asset emits `Announcement(caller, id, description, uri)` then `EndAnnouncement(id)`. Both carry the same `id`. Inner events sit between them. After success, `isAnnouncementIdUsed(id)` is true.

A revert means nothing was disclosed and `id` is still free.

### Scenario 1 — scheduled split, reverse split, or reinvested dividend

Wrap `updateUIMultiplier(newMultiplier, effectiveAt)`. A 2-for-1 split uses `2e18`. A reverse split uses a value below `1e18`. The operator already holds `OPERATOR_ROLE` from step 1.

```solidity
bytes[] memory calls = new bytes[](1);
calls[0] = abi.encodeCall(IB20Asset.updateUIMultiplier, (2e18, effectiveAt));
asset.announce(calls, id, description, uri);
```

On success the asset emits, in order, `Announcement`, `UIMultiplierUpdated`, then `EndAnnouncement`. `UIMultiplierUpdated` means the schedule was recorded, not that the multiplier is already active.

To replace a live pending update, put both calls in one `announce`. Cancel first, then schedule again:

```solidity
bytes[] memory calls = new bytes[](2);
calls[0] = abi.encodeCall(IB20Asset.cancelUIMultiplierUpdate, ());
calls[1] = abi.encodeCall(IB20Asset.updateUIMultiplier, (secondMultiplier, secondEffectiveAt));
asset.announce(calls, id, description, uri);
```

Direct `updateUIMultiplier` with no `announce` still works. Indexers should flag it as undisclosed.

For the schedule itself, see [Schedule a stock split](scheduling-stock-splits.md).

### Scenario 2 — dividend issuance or additional mint

Use this when the action creates raw tokens. A reinvested stock dividend that only rescales the UI belongs in scenario 1.

Wrap `batchMint(recipients, amounts)` or `mintWithMemo(to, amount, memo)`. The operator needs `MINT_ROLE` as well as `OPERATOR_ROLE`. Recipients must pass `MINT_RECEIVER_POLICY`. `MINT` must not be paused. `batchMint` is all-or-nothing.

```solidity
bytes[] memory calls = new bytes[](1);
calls[0] = abi.encodeCall(IB20Asset.batchMint, (recipients, amounts));
asset.announce(calls, id, description, uri);
```

On success (`batchMint`) the asset emits `Announcement`, then one `Transfer(address(0), to, amount)` per recipient, then `EndAnnouncement`.

```solidity
bytes[] memory calls = new bytes[](1);
calls[0] = abi.encodeCall(IB20.mintWithMemo, (to, amount, memo));
asset.announce(calls, id, description, uri);
```

On success (`mintWithMemo`) the asset emits, in order, `Announcement`, `Transfer`, `Memo`, then `EndAnnouncement`.

### Scenario 3 — treasury burn

Wrap `burnWithMemo(amount, memo)`. The call burns the operator's own balance. It is not policy-gated. The operator needs `BURN_ROLE` as well as `OPERATOR_ROLE`. `BURN` must not be paused.

```solidity
bytes[] memory calls = new bytes[](1);
calls[0] = abi.encodeCall(IB20.burnWithMemo, (amount, memo));
asset.announce(calls, id, description, uri);
```

On success the asset emits, in order, `Announcement`, `Transfer(operator, address(0), amount)`, `Memo`, then `EndAnnouncement`. `totalSupply` decreases.

Do not use deprecated `burnBlocked`. To take tokens from a holder and then destroy them, [seize](seizeing-assets.md) first, then announce a burn from the treasury.

### Scenario 4 — notice with no inner calls

Pass an empty `internalCalls` array. The operator needs `OPERATOR_ROLE` only.

```solidity
asset.announce(new bytes[](0), id, description, uri);
```

On success the asset emits `Announcement` then `EndAnnouncement`, with nothing between them. The `id` is still consumed.

## Common Errors

These errors follow the order `announce` checks them. Inner-call failures follow.

| Error | Why it happened | What to do |
| --- | --- | --- |
| `AccessControlUnauthorizedAccount(caller, OPERATOR_ROLE)` | The caller does not hold `OPERATOR_ROLE`. | Grant `OPERATOR_ROLE` to the operator. |
| `AnnouncementIdAlreadyUsed(id)` | A prior successful `announce` consumed `id`. | Choose a new single-use `id`. |
| `InternalCallMalformed(call)` | An inner-call blob is shorter than 4 bytes. | Pass ABI-encoded calldata that includes a selector. |
| `AnnouncementInProgress()` | An inner call targeted `announce`. | Do not nest `announce`. |
| `InternalCallFailed(call)` | An inner call reverted with an ordinary revert. The reason is not bubbled. | Replay `call` directly to see the underlying error, then fix that cause. |

Typical inner causes of `InternalCallFailed` include a missing `MINT_ROLE` or `BURN_ROLE`, paused `MINT` or `BURN`, `UIMultiplierUpdateExists`, `PolicyForbids`, `SupplyCapExceeded`, and `InsufficientBalance`. On burn, `InsufficientBalance` is against the operator's balance.

An inner Solidity `Panic` (for example overflow) propagates raw. It is not wrapped as `InternalCallFailed`.

## Related Concepts

- [Schedule a stock split](scheduling-stock-splits.md)
- [Roles and Pause](../concepts/roles-and-pause.md)

## Reference

- `announce(bytes[] internalCalls, string id, string description, string uri)` — selector `0x595135dd`
- `isAnnouncementIdUsed(string id)` — selector `0xc0da474e`
- `Announcement(address indexed caller, string id, string description, string uri)` — topic0 `0xccebf8218a62875909564adef86a6f4df81503cb617221e793357d62f8e813f7`
- `EndAnnouncement(string id)` — topic0 `0x96d64dafe2c790596430196b982ad1da3221cb3b0f4e6e2df77f2e4f71a90037`
- `updateUIMultiplier(uint256 newMultiplier, uint256 effectiveAt)`
- `cancelUIMultiplierUpdate()`
- `batchMint(address[] recipients, uint256[] amounts)`
- `mintWithMemo(address to, uint256 amount, bytes32 memo)`
- `burnWithMemo(uint256 amount, bytes32 memo)`
- `OPERATOR_ROLE` / `MINT_ROLE` / `BURN_ROLE` / `grantRole(...)`
