# Interfaces

*Solidity interfaces for the B20 system and its supporting precompiles.*

| Interface | Description |
|---|---|
| [`IB20`](../../src/interfaces/IB20.sol) | Core token standard |
| [`IB20Asset`](../../src/interfaces/IB20Asset.sol) | Asset variant of B20 |
| [`IB20Stablecoin`](../../src/interfaces/IB20Stablecoin.sol) | Stablecoin variant of B20 |
| [`IB20Factory`](../../src/interfaces/IB20Factory.sol) | B20 factory precompile |
| [`IPolicyRegistry`](../../src/interfaces/IPolicyRegistry.sol) | Policy registry precompile |
| [`IActivationRegistry`](../../src/interfaces/IActivationRegistry.sol) | Activation registry precompile |
| [`IERC8056`](../../src/interfaces/IERC8056.sol) | Scaled UI Amount standard (Asset variant multiplier) |
| [`IERC165`](../../src/interfaces/IERC165.sol) | Interface detection |

See [`StdPrecompiles.sol`](../../src/StdPrecompiles.sol) for canonical precompile addresses.
