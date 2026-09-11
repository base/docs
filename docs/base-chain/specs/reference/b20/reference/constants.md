# Constants

*Role identifiers, policy-type identifiers, precompile addresses, and other fixed constants. See [`B20Constants`](../../src/lib/B20Constants.sol) and [`StdPrecompiles`](../../src/StdPrecompiles.sol).*

## Precompile addresses

*Fixed addresses of Base's singleton precompiles. See [`StdPrecompiles`](../../src/StdPrecompiles.sol).*

| Name | Value | Purpose |
|---|---|---|
| `B20_FACTORY_ADDRESS` | `0xB20f000000000000000000000000000000000000` | Deploys and looks up B-20 tokens; every asset and stablecoin instance is created through the [`IB20Factory`](../../src/interfaces/IB20Factory.sol) at this address. |
| `POLICY_REGISTRY_ADDRESS` | `0x8453000000000000000000000000000000000002` | Stores allowlist/blocklist/composite policies and answers `isAuthorized` checks consulted by every policy scope (see [Policies](../concepts/policies.md)). |
| `ACTIVATION_REGISTRY_ADDRESS` | `0x8453000000000000000000000000000000000001` | Gates whether a B-20 variant or feature is live on a given chain; checked by the factory before it will create that variant. |

## Roles

*Role identifiers checked via `hasRole`. See [`B20Constants`](../../src/lib/B20Constants.sol) and [`IB20`](../../src/interfaces/IB20.sol). Hex values are `keccak256` of the role name, verified with `cast keccak "<NAME>"` and cross-checked in `chisel`.*

| Name | Value | Purpose |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | `bytes32(0)` | Required to call `grantRole`, `revokeRole`, `setRoleAdmin`, `updatePolicy`, and `updateSupplyCap`. |
| `MINT_ROLE` | `keccak256("MINT_ROLE")`<br>`0x154c00819833dac601ee5ddded6fda79d9d8b506b911b3dbd54cdb95fe6c3686` | Required to call `mint` and `mintWithMemo`. |
| `BURN_ROLE` | `keccak256("BURN_ROLE")`<br>`0xe97b137254058bd94f28d2f3eb79e2d34074ffb488d042e3bc958e0a57d2fa22` | Required to call `burn` and `burnWithMemo`. |
| `BURN_BLOCKED_ROLE` | `keccak256("BURN_BLOCKED_ROLE")`<br>`0x7408fdc0d31c7bcb349eab611f5d1168acd4303574993f8cdc98b1cd18c41cae` | Required to call the deprecated `burnBlocked`. |
| `SEIZE_ROLE` | `keccak256("SEIZE_ROLE")`<br>`0x3469b8b0d89e9604f8510ed143f74a8336d22955d4f83e23bf53d9414e27f432` | Required to call `seizeWithMemo`. |
| `PAUSE_ROLE` | `keccak256("PAUSE_ROLE")`<br>`0x139c2898040ef16910dc9f44dc697df79363da767d8bc92f2e310312b816e46d` | Required to call `pause`. |
| `UNPAUSE_ROLE` | `keccak256("UNPAUSE_ROLE")`<br>`0x265b220c5a8891efdd9e1b1b7fa72f257bd5169f8d87e319cf3dad6ff52b94ae` | Required to call `unpause`. |
| `METADATA_ROLE` | `keccak256("METADATA_ROLE")`<br>`0x6bd6b5318a46e5fff572d5e4258a20774aab40cc35ac7680654b9081fcc82f80` | Required to call `updateName`, `updateSymbol`, `updateContractURI`, and `updateExtraMetadata`. |
| `OPERATOR_ROLE` | `keccak256("OPERATOR_ROLE")`<br>`0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929` | B20Asset-only. Required to call `announce`, `updateUIMultiplier`, `cancelUIMultiplierUpdate`, and the deprecated `updateMultiplier`. |

## Policy types

*Policy scopes consulted by the PolicyRegistry. See [`B20Constants`](../../src/lib/B20Constants.sol) and [Policies](../concepts/policies.md). Hex values are `keccak256` of the policy name, verified with `cast keccak "<NAME>"` and cross-checked in `chisel`.*

| Name | Value | Purpose |
|---|---|---|
| `TRANSFER_SENDER_POLICY` | `keccak256("TRANSFER_SENDER_POLICY")`<br>`0xb81736c875ab819dd97f59f2a6542cfb731ad52b4ae15a6f24df2fb02b0327f5` | Consulted for `from` on `transfer` and `transferFrom`. |
| `TRANSFER_RECEIVER_POLICY` | `keccak256("TRANSFER_RECEIVER_POLICY")`<br>`0x8a4b3fa2d8b921852bc0089c6ef0958aa6961897be36fd731330fe2cd23f8363` | Consulted for `to` on `transfer` and `transferFrom`. |
| `TRANSFER_EXECUTOR_POLICY` | `keccak256("TRANSFER_EXECUTOR_POLICY")`<br>`0x10be5173aff2a44e748bd9acd8b19fe34689581398a9db7ba2fb671e786ff7d8` | Consulted for `msg.sender` on `transferFrom` only. |
| `MINT_RECEIVER_POLICY` | `keccak256("MINT_RECEIVER_POLICY")`<br>`0xa0d5ae037e66a09119acf080a1d807abb9b6d03b6b9130eb19f7c1e6bdb8ffc8` | Consulted for `to` on `mint`. |
| `SEIZE_HOLDER_POLICY` | `keccak256("SEIZE_HOLDER_POLICY")`<br>`0x1497ab2b67ebb0a75dd9cdd6aec9f0e64620e6b87e911af7a088ac12e58d9ef2` | Consulted for `from` on `seizeWithMemo`; `from` is seizable when unauthorized under this policy. |
| `SEIZE_RECEIVER_POLICY` | `keccak256("SEIZE_RECEIVER_POLICY")`<br>`0xbf15b19caf5c77422c038bc25f26b8b815c3a14f6d04c6616076b81bcfe07b3d` | Consulted for `to` on `seizeWithMemo`. |

## Feature and validation bounds

*Bitmasks and inclusive bounds used for pause features and B20Asset creation validation. See [`B20Constants`](../../src/lib/B20Constants.sol).*

| Name | Value | Purpose |
|---|---|---|
| `ALL_FEATURES_PAUSED` | `15` (`0b1111`) | Bitmask with all `PausableFeature` bits set (`TRANSFER \| MINT \| BURN \| SEIZE`). |
| `MIN_ASSET_DECIMALS` | `6` | Inclusive lower bound for `B20AssetCreateParams.decimals`; the floor most stablecoin-grade integrations expect. |
| `MAX_ASSET_DECIMALS` | `18` | Inclusive upper bound for `B20AssetCreateParams.decimals`; the ERC-20 community ceiling every common wallet/indexer renders correctly. |
| `MAX_SUPPLY_CAP` | `type(uint128).max` | Inclusive upper bound for the supply cap (and therefore `totalSupply`); doubles as the unbounded ("no cap") sentinel. |

## Asset-variant precision constants

*Fixed-point constants used by the multiplier/rebasing surface. See [`IB20Asset`](../../src/interfaces/IB20Asset.sol).*

| Name | Value | Purpose |
|---|---|---|
| `WAD_PRECISION` | `1e18` | Fixed-point precision used to scale `multiplier`; `multiplier`, `toUIAmount`, and `fromUIAmount` all divide/multiply by this. |
| `MAX_UI_MULTIPLIER` | `type(uint128).max` | Maximum multiplier the setters accept — the overflow guard enforced by `updateMultiplier` and `updateUIMultiplier`. Exposed so callers can read the bound without triggering `InvalidMultiplier`. |
