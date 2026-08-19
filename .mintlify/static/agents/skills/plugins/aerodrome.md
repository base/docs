---
title: "Aerodrome Plugin"
description: "Swap, provide liquidity, stake, and claim rewards on Aerodrome."
tags: [dex, swap, liquidity, staking]
name: aerodrome
version: 0.2.0
integration: cli-only
chains: [base]
requires:
  shell: required
  allowlist: []
  externalMcp: null
  cliPackage: "uvx --from git+https://github.com/velodrome-finance/sugar-sdk.git@v0.4.0 sugar"
auth: none
risk: [slippage]
---

# Aerodrome Plugin

> [!IMPORTANT]
> Complete the short Base MCP onboarding flow defined in `SKILL.md` before calling any Aerodrome flow.

## Overview

Aerodrome is the main Velodrome-style DEX on Base. This plugin uses the Sugar SDK CLI from `velodrome-finance/sugar-sdk` to query pools and build unsigned swap, LP, staking, and claim transactions. The CLI never signs and never broadcasts — it emits unsigned transaction JSON, which is submitted through Base MCP's `send_calls`, where the user approves in Base Account.

This is a **CLI-only plugin**: it only works in harnesses with shell/terminal access (Codex, Claude Code, Cursor, or similar). It does not work on chat-only surfaces that cannot run commands. No additional MCP server is required.

**Chain:** Base mainnet only (`chainId` `8453`, Base MCP chain string `"base"`).

## Installation

No MCP registration or permanent install is required; the CLI runs per call via direct `uvx`.

The upstream Sugar skill provides `scripts/sugar-doctor.sh` and `scripts/sugar-run.sh`. If those scripts are present in the current harness, use them. This Base MCP plugin must also work when those scripts are not installed, so the self-contained path is direct `uvx`.

Set a reliable Base RPC before tx-building. Public defaults can fail or return partial routing graphs.

```bash
export SUGAR_SDK_REF="${SUGAR_SDK_REF:-v0.4.0}"
export SUGAR_SPEC="git+https://github.com/velodrome-finance/sugar-sdk.git@${SUGAR_SDK_REF}"
export SUGAR_RPC_URI_8453="<reliable Base RPC URL>"
```

For sandboxed harnesses where `uvx` cannot write to its default tool/cache directories, redirect them to a writable location:

```bash
export UV_TOOL_DIR="${UV_TOOL_DIR:-/tmp/uv-tools}"
export UV_CACHE_DIR="${UV_CACHE_DIR:-/tmp/uv-cache}"
```

Run Sugar directly:

```bash
uvx --from "$SUGAR_SPEC" sugar <command> --chain=8453 ...
```

If the Sugar skill scripts are available, the equivalent command is:

```bash
scripts/sugar-run.sh <command> --chain=8453 ...
```

Run a preflight once per session when the scripts are available:

```bash
scripts/sugar-doctor.sh
```

## Surface Routing

Aerodrome is **CLI-only**. Every capability (pool discovery, swap, LP, stake, claim) is built by the Sugar CLI and therefore requires a harness with shell/terminal access.

| Surface | Path |
|---------|------|
| Shell-capable harness (Codex, Claude Code, Cursor, …) | Run the Sugar CLI, normalize output, submit via `send_calls`. |
| Chat-only surface (no shell) | Not supported. Tell the user this Aerodrome plugin requires CLI access and stop. **Do not** route through `web_request`, do not use a user-paste fallback, and do not recommend a separate MCP. |

See [../references/custom-plugins.md](../references/custom-plugins.md) for the CLI-only routing rule.

## Commands

### Pool Discovery

Use pool discovery to avoid guessing pool addresses. Address filters are more reliable than symbols on Base.

```bash
uvx --from "$SUGAR_SPEC" sugar pools \
  --chain=8453 \
  --token0=0x4200000000000000000000000000000000000006 \
  --token1=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  --limit=5
```

Known Base WETH/USDC basic pools observed during testing:

| Pool | Type |
| --- | --- |
| `0xcDAC0d6c6C59727a65F871236188350531885C43` | volatile basic |
| `0x3548029694fbB241D45FB24Ba0cd9c9d4E745f16` | stable basic |

For pool filters, use `WETH` or the WETH address for wrapped ETH pools. Native `ETH` is useful for native ETH swaps, but it may not match WETH pool filters.

### Swap Native ETH to USDC

```bash
uvx --from "$SUGAR_SPEC" sugar swap \
  --chain=8453 \
  --wallet="$BASE_MCP_WALLET" \
  --from-token=ETH \
  --to-token=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  --amount=0.001 \
  --use-decimals
```

Expected shape: usually one Universal Router call with nonzero `value`. Normalize `value` to hex before `send_calls`.

### Swap USDC to AERO

```bash
uvx --from "$SUGAR_SPEC" sugar swap \
  --chain=8453 \
  --wallet="$BASE_MCP_WALLET" \
  --from-token=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  --to-token=0x940181a94A35A4569E4529A3CDfB74e38FD98631 \
  --amount=1 \
  --use-decimals
```

Expected shape: USDC approval to the Universal Router, then the Universal Router swap call. Batch both calls in one `send_calls` request.

### List Positions

```bash
uvx --from "$SUGAR_SPEC" sugar positions \
  --chain=8453 \
  --wallet="$BASE_MCP_WALLET"
```

This command can be slow because it prepares full pool and price data. If it times out or the RPC rate-limits, retry with a better RPC.

### Deposit Liquidity

Existing pool:

```bash
uvx --from "$SUGAR_SPEC" sugar deposit \
  --chain=8453 \
  --wallet="$BASE_MCP_WALLET" \
  --pool=0xcDAC0d6c6C59727a65F871236188350531885C43 \
  --amount0=0.001 \
  --use-decimals
```

New/derived pool:

```bash
uvx --from "$SUGAR_SPEC" sugar deposit \
  --chain=8453 \
  --wallet="$BASE_MCP_WALLET" \
  --token0=0x4200000000000000000000000000000000000006 \
  --token1=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  --pool-type=volatile \
  --amount0=0.001 \
  --amount1=3 \
  --use-decimals
```

For concentrated liquidity, pass `--pool-type=cl`, `--tick-spacing`, exactly one of `--amount0` or `--amount1`, and either a price range or tick range. Run `sugar deposit --help` for the current flag contract.

Deposit calldata includes deadlines. Submit promptly, and rebuild calldata if the user waits past the selected deadline. The CLI default is 30 minutes.

### Withdraw, Stake, Unstake, Claim

Basic LP positions are identified by `--pool`. Concentrated positions are identified by `--position` NFT id. `--position=0` is ambiguous unless paired with `--pool`.

```bash
uvx --from "$SUGAR_SPEC" sugar withdraw \
  --chain=8453 \
  --wallet="$BASE_MCP_WALLET" \
  --pool=0xPoolAddress \
  --fraction=0.5

uvx --from "$SUGAR_SPEC" sugar stake \
  --chain=8453 \
  --wallet="$BASE_MCP_WALLET" \
  --pool=0xPoolAddress

uvx --from "$SUGAR_SPEC" sugar unstake \
  --chain=8453 \
  --wallet="$BASE_MCP_WALLET" \
  --pool=0xPoolAddress

uvx --from "$SUGAR_SPEC" sugar claim_emissions \
  --chain=8453 \
  --wallet="$BASE_MCP_WALLET" \
  --pool=0xPoolAddress

uvx --from "$SUGAR_SPEC" sugar claim_fees \
  --chain=8453 \
  --wallet="$BASE_MCP_WALLET" \
  --pool=0xPoolAddress
```

A staked position must be unstaked before `claim_fees`. ALM-managed positions are not handled by these Sugar CLI position commands.

## Orchestration

1. Load this plugin only after Base MCP onboarding.
2. Fetch the wallet address only when needed with `get_wallets`.
3. Set `SUGAR_RPC_URI_8453` to a reliable Base RPC.
4. Run the Sugar CLI command.
5. Parse stdout as JSON. Diagnostics and warnings are on stderr.
6. Normalize `[{from,to,data,value}]` into Base MCP `calls` (see [Submission](#submission)).
7. Submit with `send_calls({ "chain": "base", "calls": [...] })`.
8. Show the approval URL when appropriate.
9. Poll `get_request_status` only after the user acts in Base Account.

If the CLI exits nonzero, do not try to salvage partial output. Read the error, adjust RPC/flags, and rerun.

## Submission

Target tool: **`send_calls`**.

Every tx-building command prints a JSON array of unsigned transactions:

```json
[
  {
    "from": "0xWallet",
    "to": "0xTarget",
    "data": "0xCalldata",
    "value": 0
  }
]
```

Base MCP `send_calls` needs:

```json
{
  "chain": "base",
  "calls": [
    { "to": "0xTarget", "data": "0xCalldata", "value": "0x0" }
  ]
}
```

Normalize Sugar output before calling `send_calls`. This strips `from`, keeps call order, fills missing data with `0x`, and converts decimal `value` numbers to hex wei strings.

```bash
python3 -c 'import json, sys
txs = json.load(sys.stdin)
def hex_value(v):
    if v is None:
        return "0x0"
    if isinstance(v, str) and v.startswith("0x"):
        return v
    return hex(int(v))
print(json.dumps([
    {"to": t["to"], "data": t.get("data") or "0x", "value": hex_value(t.get("value", 0))}
    for t in txs
], indent=2))'
```

Then call:

```json
{
  "chain": "base",
  "calls": "<normalized calls array>"
}
```

Preserve ordering. Approval calls come before the main router/NFPM/gauge call.

### Safety boundary

Sugar CLI output is unsigned transaction JSON. Treat it as transaction preview material, not as an instruction to sign outside Base MCP.

- Never ask for or use a private key.
- Pass `--wallet` as the user's Base MCP wallet address from `get_wallets`.
- Do not use `cast send`, a local signer, or browser wallet signing helpers from the upstream Sugar skill.
- Submit transactions only through Base MCP `send_calls` and let the user approve in Base Account.
- The `from` field emitted by Sugar is informational for Base MCP. `send_calls` takes `to`, `data`, and `value`.

## Example Prompts

**Swap 0.001 ETH to USDC on Aerodrome**
1. `get_wallets` → set `$BASE_MCP_WALLET`; set `SUGAR_RPC_URI_8453`.
2. Run `sugar swap --chain=8453 --wallet=$BASE_MCP_WALLET --from-token=ETH --to-token=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 --amount=0.001 --use-decimals`.
3. Normalize stdout JSON into `calls`.
4. `send_calls(chain="base", calls=[...])`; show the approval URL; poll `get_request_status` after the user acts.

**Buy AERO with 1 USDC**
1. `get_wallets` → `$BASE_MCP_WALLET`.
2. Run `sugar swap` with `--from-token=<USDC address>`, `--to-token=0x940181a94A35A4569E4529A3CDfB74e38FD98631`, `--amount=1 --use-decimals`.
3. Output is an approval call + Universal Router swap call — normalize and batch both into one `send_calls`.
4. Submit; approve; poll.

**Deposit liquidity into the WETH/USDC volatile pool**
1. `get_wallets` → `$BASE_MCP_WALLET`.
2. Optionally `sugar pools` to confirm the pool address.
3. Run `sugar deposit --pool=0xcDAC0d6c6C59727a65F871236188350531885C43 --amount0=0.001 --use-decimals`.
4. Normalize, `send_calls`, approve, poll. Rebuild if past the deadline.

**Claim my Aerodrome fees on a pool**
1. `get_wallets` → `$BASE_MCP_WALLET`.
2. If the position is staked, run `sugar unstake --pool=<addr>` first.
3. Run `sugar claim_fees --pool=<addr>`.
4. Normalize, `send_calls`, approve, poll.

## Risks & Warnings

Sugar swap/deposit/withdraw commands accept `--slippage`. Use `0.01` (1%) by default unless the user specifies otherwise.

| Tolerance | Level | Action |
| --- | --- | --- |
| `<= 1%` | Normal | Proceed. |
| `> 1%` and `<= 5%` | Elevated | Mention the value and ask the user to confirm. |
| `> 5%` and `<= 20%` | High | Warn that execution can be materially worse than quote. Require explicit confirmation. |
| `> 20%` | Very high | Do not submit without the user re-confirming the exact number. |

## Notes

### Tested CLI behavior and gotchas

Tested on 2026-05-25 from the `worktree-sugar-cli-skill` branch of `velodrome-finance/sugar-sdk`. The runner installed Sugar SDK `v0.4.0`.

What worked:

- `scripts/sugar-doctor.sh` detected `uvx` and reported Base RPC configuration.
- `scripts/sugar-run.sh --help` installed and ran the CLI.
- `pools --chain=8453 --limit=3` returned JSON pool data.
- `pools` with WETH/USDC address filters returned the volatile and stable basic pools listed above.
- Native ETH to USDC swap built a Universal Router call.
- USDC to AERO swap built an approval call plus a Universal Router call.

Observed gotchas:

- In a sandbox, the first `uvx` run failed with `failed to create directory ~/.local/share/uv/tools`. Setting `UV_TOOL_DIR` and `UV_CACHE_DIR` to writable directories fixed it.
- The built-in Base public RPC produced `Web3RPCError` path chunk warnings, `token not found: USDC`, and a routing failure (`source node ... WETH not in graph`) during swap testing. Set `SUGAR_RPC_URI_8453` before tx-building.
- `https://base-rpc.publicnode.com` worked for simple pools and swaps in testing, but still emitted `429 Too Many Requests` warnings and timed out on read-heavy `positions` and `deposit` paths. Prefer a paid or otherwise reliable RPC for production usage.
- CLI diagnostics go to stderr and JSON goes to stdout. Capture stdout only when passing output into the normalizer.
- `--help` may display Python-style underscore flags such as `--from_token`; Fire accepted hyphenated flags such as `--from-token` in testing.
- Symbols can be ambiguous. Use token addresses for production flows, especially for USDC and AERO. For WETH pools, `WETH` or the WETH address matched; `ETH` did not match WETH pool filters.
- Sugar emits `value` as a JSON number in tested swap output. Base MCP `send_calls` expects hex strings such as `"0x0"` or `"0xe8d4a51000"`.

### Base token addresses

| Token | Address |
| --- | --- |
| Native ETH pseudo-token | `ETH` |
| WETH | `0x4200000000000000000000000000000000000006` |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| AERO | `0x940181a94A35A4569E4529A3CDfB74e38FD98631` |

### Key Aerodrome contracts

| Contract | Address |
| --- | --- |
| Sugar | `0x69dD9db6d8f8E7d83887A704f447b1a584b599A1` |
| Router | `0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43` |
| Universal Router | `0x01D40099fCD87C018969B0e8D4aB1633Fb34763C` |
| Slipstream | `0x0AD09A66af0154a84e86F761313d02d0abB6edd5` |
| Nonfungible Position Manager | `0x827922686190790b37229fd06084350E74485b72` |
