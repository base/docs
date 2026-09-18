# Events

*Exhaustive list of events emitted by the B20 system, grouped by declaring file.*

## [`IB20`](../../src/interfaces/IB20.sol)

| Event | Emitted by | When |
|---|---|---|
| `Transfer(address indexed from, address indexed to, uint256 amount)` | `transfer`, `transferFrom`, `transferWithMemo`, `transferFromWithMemo`, `mint`, `mintWithMemo`, `burn`, `burnWithMemo`, `burnBlocked`, `seizeWithMemo` | Every successful transfer, mint (`from = address(0)`), or burn (`to = address(0)`), including memo'd, blocked-burn, and seize variants. |
| `Approval(address indexed owner, address indexed spender, uint256 amount)` | `approve`, `permit` | An allowance is set. |
| `Memo(address indexed caller, bytes32 indexed memo)` | `transferWithMemo`, `transferFromWithMemo`, `mintWithMemo`, `burnWithMemo` | Immediately after the underlying `Transfer` event. `caller` is the `msg.sender` of the memo'd call. |
| `BurnedBlocked(address indexed caller, address indexed from, uint256 amount)` | `burnBlocked` (deprecated) | In addition to `Transfer(from, address(0), amount)`. |
| `Seized(address indexed caller, address indexed from, address indexed to, uint256 amount)` | `seizeWithMemo` | In addition to `Transfer(from, to, amount)` and `Memo(caller, memo)`. Records a transfer-based seizure. |
| `RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)` | `grantRole` | `account` is granted `role`. `sender` is the originating caller. |
| `RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)` | `revokeRole`, `renounceRole`, `renounceLastAdmin` | `role` is revoked from `account`. `sender` is the admin bearer (`revokeRole`) or `account` itself (`renounceRole`/`renounceLastAdmin`). |
| `RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)` | `setRoleAdmin` | The admin role for `role` changes. |
| `LastAdminRenounced(address indexed previousAdmin)` | `renounceLastAdmin` | In addition to the standard `RoleRevoked(DEFAULT_ADMIN_ROLE, previousAdmin, previousAdmin)` event. |
| `Paused(address indexed updater, PausableFeature[] features)` | `pause` | `features` is the call argument (not the resulting paused state). |
| `Unpaused(address indexed updater, PausableFeature[] features)` | `unpause` | `features` is the call argument (not the resulting paused state). |
| `PolicyUpdated(bytes32 indexed policyScope, uint64 oldPolicyId, uint64 newPolicyId)` | `updatePolicy`; also token creation | A token's policy slot changes. Initial slot assignment at creation also emits this with `oldPolicyId == 0`. |
| `SupplyCapUpdated(address indexed updater, uint256 oldSupplyCap, uint256 newSupplyCap)` | `updateSupplyCap` | The supply cap changes. |
| `ContractURIUpdated()` | `updateContractURI` | Parameterless per ERC-7572; integrators re-fetch `contractURI()`. |
| `NameUpdated(address indexed updater, string newName)` | `updateName` | The token name changes. Carries the new name string. |
| `SymbolUpdated(address indexed updater, string newSymbol)` | `updateSymbol` | The token symbol changes. Carries the new symbol string. |
| `EIP712DomainChanged()` | `updateName` | ERC-5267 domain-change signal, emitted exactly once per successful call, immediately after `NameUpdated`. `updateSymbol` does NOT emit this. |

## [`IB20Asset`](../../src/interfaces/IB20Asset.sol)

| Event | Emitted by | When |
|---|---|---|
| `MultiplierUpdated(uint256 multiplier)` | `updateMultiplier` (deprecated instant setter) | Deprecated legacy-topic mirror, emitted alongside `UIMultiplierUpdated` so indexers on the old topic keep working.[^1] |
| `UIMultiplierUpdateCancelled(uint256 cancelledMultiplier, uint256 cancelledEffectiveAt)` | `cancelUIMultiplierUpdate`; `updateUIMultiplier` | A scheduled multiplier update is cancelled — explicitly, or implicitly when `updateUIMultiplier` clears a live pending update. |
| `ExtraMetadataUpdated(string key, string value)` | `updateExtraMetadata` | An extra-metadata entry is set, updated, or removed (empty `value` indicates removal). |
| `Announcement(address indexed caller, string id, string description, string uri)` | `announce` | Opens an announcement bracket. |
| `EndAnnouncement(string id)` | `announce` | Closes the bracket opened by the paired `Announcement` with the same `id`. |

[^1]: The function-level docs show only `updateMultiplier` emitting `MultiplierUpdated`; the scheduled `updateUIMultiplier` emits `UIMultiplierUpdated` only. The event's own doc-comment in source additionally names `updateUIMultiplier` as an emitter of `MultiplierUpdated`, which conflicts with `updateUIMultiplier`'s own `@notice` — flagging here rather than silently picking one.

## [`IB20Factory`](../../src/interfaces/IB20Factory.sol)

| Event | Emitted by | When |
|---|---|---|
| `B20Created(address indexed token, B20Variant indexed variant, string name, string symbol, uint8 decimals, bytes variantEventParams)` | `createB20` | Once per invocation, after the token's identity is sealed and before any `initCalls` are dispatched. `variantEventParams` carries variant-specific identity data (empty for ASSET; ABI-encoded `B20StablecoinEventParams` for STABLECOIN). |

## [`IPolicyRegistry`](../../src/interfaces/IPolicyRegistry.sol)

| Event | Emitted by | When |
|---|---|---|
| `PolicyCreated(uint64 indexed policyId, address indexed creator, PolicyType policyType)` | `createPolicy`, `createPolicyWithAccounts`, `createCompositePolicy` | A new policy is created. |
| `PolicyAdminStaged(uint64 indexed policyId, address indexed currentAdmin, address indexed pendingAdmin)` | `stageUpdateAdmin` | A new admin is staged. `pendingAdmin == address(0)` clears a prior nomination. |
| `PolicyAdminUpdated(uint64 indexed policyId, address indexed previousAdmin, address indexed newAdmin)` | `finalizeUpdateAdmin`, `renounceAdmin`; also policy creation | The active admin changes. `newAdmin == address(0)` indicates renunciation; `previousAdmin == address(0)` indicates initial assignment at creation. |
| `AllowlistUpdated(uint64 indexed policyId, address indexed updater, bool allowed, address[] accounts)` | `updateAllowlist` | One or more accounts have their ALLOWLIST membership set to `allowed` in a single batch. |
| `BlocklistUpdated(uint64 indexed policyId, address indexed updater, bool blocked, address[] accounts)` | `updateBlocklist` | One or more accounts have their BLOCKLIST membership set to `blocked` in a single batch. |
| `CompositePolicyUpdated(uint64 indexed policyId, address indexed updater, uint64[] childPolicyIds)` | `createCompositePolicy`, `updateComposite` | A composite policy's child set is set or replaced in full. Emitted on creation and on every subsequent update; carries the complete post-update set. |

## [`IActivationRegistry`](../../src/interfaces/IActivationRegistry.sol)

| Event | Emitted by | When |
|---|---|---|
| `FeatureActivated(bytes32 indexed feature, address indexed caller)` | `activate` | `feature` is activated. |
| `FeatureDeactivated(bytes32 indexed feature, address indexed caller)` | `deactivate` | `feature` is deactivated. |

## [`IERC8056`](../../src/interfaces/IERC8056.sol) (`IScaledUIAmount`)

| Event | Emitted by | When |
|---|---|---|
| `UIMultiplierUpdated(uint256 oldMultiplier, uint256 newMultiplier, uint256 effectiveAtTimestamp)` | `updateUIMultiplier` (scheduled); `updateMultiplier` (deprecated instant setter) | The UI multiplier is updated — scheduled setters emit this alone; the deprecated instant setter emits this alongside `MultiplierUpdated`. |
