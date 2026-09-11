# Errors

*Exhaustive list of custom errors, selectors, and the conditions that trigger them. Selectors are the 4-byte `keccak256` hash of the error signature — computed with `cast sig "ErrorName(types...)"`. Enum parameters encode as their underlying `uint8`.*

*Note: several error names are reused across files with different parameters (or none), which changes the selector. `PolicyNotFound()` ([`IPolicyRegistry`](../../src/interfaces/IPolicyRegistry.sol)) and `PolicyNotFound(uint64)` ([`IB20`](../../src/interfaces/IB20.sol)) are unrelated errors with different selectors, as are `Unauthorized()` (`IB20` / `IPolicyRegistry`) and `Unauthorized(address)` ([`IActivationRegistry`](../../src/interfaces/IActivationRegistry.sol)). Conversely, `LengthMismatch(uint256,uint256)` shares one selector across [`IB20Asset`](../../src/interfaces/IB20Asset.sol) and [`B20FactoryLib`](../../src/lib/B20FactoryLib.sol) — they're independently declared but identical in signature.*

## [`IB20`](../../src/interfaces/IB20.sol)

| Error | Selector | Thrown when |
|---|---|---|
| `NonPayable()` | `0x6fb1b0e9` | ETH was attached to a call targeting a nonpayable token selector. |
| `AccessControlUnauthorizedAccount(address account, bytes32 neededRole)` | `0xe2517d3f` | `account` does not hold `neededRole`. |
| `Unauthorized()` | `0x82b42900` | Caller failed a positional authorization check that isn't expressible as "missing role X". |
| `ContractPaused(uint8 feature)` | `0xfd8c4245` | The `PausableFeature` covering the operation is currently paused. |
| `InsufficientAllowance(address spender, uint256 allowance, uint256 needed)` | `0x192b9e4e` | `spender`'s allowance is less than `needed` for the requested `transferFrom`. |
| `InsufficientBalance(address sender, uint256 balance, uint256 needed)` | `0xdb42144d` | `sender`'s balance is less than `needed` for the requested transfer or burn. |
| `InvalidSender(address sender)` | `0x4c14f64c` | The transfer's source address is invalid (typically `address(0)`). |
| `InvalidReceiver(address receiver)` | `0x9cfea583` | The transfer's destination address is invalid (typically `address(0)`). |
| `InvalidApprover(address approver)` | `0x8bc146c4` | The approval's `owner` address is invalid (typically `address(0)`). |
| `InvalidSpender(address spender)` | `0x4e15efda` | The approval's `spender` address is invalid (typically `address(0)`). |
| `InvalidAmount()` | `0x2c5211c6` | An amount argument was zero where a non-zero value is required. Not used for ERC-20 amount arguments. |
| `EmptyFeatureSet()` | `0x4861ff45` | An empty array was passed to a function that requires at least one element. |
| `InvalidSupplyCap(uint256 currentSupply, uint256 proposedCap)` | `0x0a3780ce` | The proposed supply cap is below the current `totalSupply`, or above `type(uint128).max`. |
| `SupplyCapExceeded(uint256 cap, uint256 attempted)` | `0x4b344b11` | The mint would push `totalSupply` past the configured cap. |
| `PolicyForbids(bytes32 policyScope, uint64 policyId)` | `0xa43fec12` | A policy slot denied the operation. |
| `PolicyNotFound(uint64 policyId)` | `0xcccad523` | The provided policy ID does not exist in the policy registry. |
| `UnsupportedPolicyType(bytes32 policyScope)` | `0xcdd98a4a` | `policyScope` is not a slot this token (or its variant) supports. |
| `AccountNotSeizable(address account)` | `0x91dbbc8d` | `seizeWithMemo` was called against a `from` that is not seizable under `SEIZE_HOLDER_POLICY`. |
| `AccountNotBlocked(address account)` | `0x64a5cb46` | The deprecated `burnBlocked` was called against a `from` that is currently authorized under `TRANSFER_SENDER_POLICY` (i.e. not blocked). |
| `ExpiredSignature(uint256 deadline)` | `0xbd2a913c` | An EIP-2612 `permit` was submitted with a `deadline` strictly less than `block.timestamp`. |
| `InvalidSigner(address signer, address owner)` | `0x7ba5ffb5` | ECDSA recovery on an EIP-2612 `permit` returned `signer`, which does not match the claimed `owner`. |
| `LastAdminCannotRenounce()` | `0x361513e7` | `renounceRole(DEFAULT_ADMIN_ROLE, ...)` was called by the sole remaining admin. |
| `NotSoleAdmin()` | `0x2a98e73b` | `renounceLastAdmin()` was called when other accounts also hold `DEFAULT_ADMIN_ROLE`. |
| `AccessControlBadConfirmation()` | `0x6697b232` | The `callerConfirmation` argument to `renounceRole` was not `msg.sender`. |

## [`IB20Asset`](../../src/interfaces/IB20Asset.sol)

| Error | Selector | Thrown when |
|---|---|---|
| `AnnouncementIdAlreadyUsed(string id)` | `0xd10b3c9e` | `announce` was called with an `id` that has already been consumed. |
| `InvalidMetadataKey()` | `0x86ea3abb` | `updateExtraMetadata` was called with an empty `key`. |
| `InvalidMultiplier()` | `0x6f12f3dc` | A multiplier setter (`updateUIMultiplier` or the deprecated `updateMultiplier`) was called with a multiplier of zero or above the `type(uint128).max` overflow guard. |
| `EffectiveAtInPast(uint256 effectiveAt)` | `0x14119cf6` | `updateUIMultiplier` was called with an `effectiveAt` that is not in the future. |
| `EffectiveAtTooFar(uint256 effectiveAt)` | `0x1ce214fa` | `updateUIMultiplier` was called with an `effectiveAt` above `type(uint64).max`. |
| `UIMultiplierUpdateExists(uint256 effectiveAt)` | `0x4481a68e` | `updateUIMultiplier` was called while a live pending update already exists. |
| `UIMultiplierUpdateDoesNotExist()` | `0xa7d6a5ca` | `cancelUIMultiplierUpdate` was called when there is no live pending update. |
| `LengthMismatch(uint256 leftLen, uint256 rightLen)` | `0xab8b67c6` | A batched function was called with parallel arrays of differing lengths. |
| `EmptyBatch()` | `0xc2e5347d` | A batched function was called with empty arrays. |
| `AnnouncementInProgress()` | `0x5c5f0829` | An inner call dispatched by `announce` tried to re-invoke `announce`. |
| `InternalCallMalformed(bytes call)` | `0x4e2f143e` | An inner call dispatched by `announce` was shorter than four bytes. |
| `InternalCallFailed(bytes call)` | `0xb288a127` | An inner call dispatched by `announce` reverted with an ordinary revert (reason not bubbled). |

## [`IB20Factory`](../../src/interfaces/IB20Factory.sol)

| Error | Selector | Thrown when |
|---|---|---|
| `NonPayable()` | `0x6fb1b0e9` | ETH was attached to a call targeting a nonpayable factory selector. |
| `TokenAlreadyExists(address token)` | `0x15ef3a57` | A token already exists at the deterministic address derived from `(variant, msg.sender, salt)`. |
| `InvalidVariant()` | `0xf10e8e43` | `variant` is not a recognized `B20Variant`. |
| `UnsupportedVersion(uint8 version, uint8 variant)` | `0xc0d8b4e0` | The leading `version` byte in `params` does not match any known encoding for the requested variant. |
| `MissingRequiredField(string field)` | `0x4a43ae87` | A required string argument was the empty string. |
| `InvalidCurrency(string code)` | `0x997c1de8` | The stablecoin `currency` was non-empty but contained a non-`A`-`Z` byte. |
| `InvalidDecimals(uint8 decimals)` | `0xca950391` | The asset `decimals` was outside `[B20Constants.MIN_ASSET_DECIMALS, B20Constants.MAX_ASSET_DECIMALS]`. |
| `InitCallFailed(uint256 index)` | `0x4eae0860` | One of the `initCalls` reverted with no bubbled reason. |

## [`IPolicyRegistry`](../../src/interfaces/IPolicyRegistry.sol)

| Error | Selector | Thrown when |
|---|---|---|
| `NonPayable()` | `0x6fb1b0e9` | ETH was attached to a call targeting a nonpayable policy registry selector. |
| `Unauthorized()` | `0x82b42900` | Caller is not the admin required by the attempted operation. |
| `PolicyNotFound()` | `0x720caa4f` | The referenced policy ID does not exist. |
| `IncompatiblePolicyType()` | `0xf1011ef5` | The operation is incompatible with the policy's type. |
| `ZeroAddress()` | `0xd92e233d` | A required address argument was the zero address. |
| `BatchSizeTooLarge(uint256 maxBatchSize)` | `0x083e2f67` | A membership batch exceeded the registry limit. |
| `NoPendingAdmin()` | `0xb4539afa` | `finalizeUpdateAdmin` was called with no pending admin staged. |
| `ChildPoliciesOutsideOfRange()` | `0x697ec868` | A composite policy was created or updated with a child-policy count outside `[MIN_COMPOSITE_CHILD_POLICIES, MAX_COMPOSITE_CHILD_POLICIES]`. |
| `InvalidChildPolicy(uint64 childPolicyId)` | `0x46508ef6` | A child policy is not an existing simple (ALLOWLIST/BLOCKLIST) policy. |

## [`IActivationRegistry`](../../src/interfaces/IActivationRegistry.sol)

| Error | Selector | Thrown when |
|---|---|---|
| `Unauthorized(address caller)` | `0x8e4a23d6` | Caller is not the activation admin. |
| `AlreadyActivated(bytes32 feature)` | `0x866b0041` | `activate` was called on a feature that is already activated. |
| `FeatureNotActivated(bytes32 feature)` | `0xb9b2a425` | `checkActivated` was called on an inactive feature, or `deactivate` was called on a feature that is already inactive. |
| `DelegateCallNotAllowed()` | `0x0d89438e` | The precompile was invoked via `DELEGATECALL` or `CALLCODE`. |
| `StaticCallNotAllowed()` | `0xbeaba5b7` | A state-mutating entry point was invoked from a `STATICCALL` frame. |

## [`B20FactoryLib`](../../src/lib/B20FactoryLib.sol)

| Error | Selector | Thrown when |
|---|---|---|
| `LengthMismatch(uint256 leftLen, uint256 rightLen)` | `0xab8b67c6` | Two parallel arrays passed to a `build*` helper had different lengths. |
