---
title: "Aerodrome Plugin"
description: "Skill plugin reference for swapping and providing liquidity on Aerodrome through Base MCP. CLI-only — uses sugar-sdk Python to build calldata."
---

# Aerodrome Plugin

> [!IMPORTANT]
> Complete the short Base MCP onboarding flow defined in `SKILL.md` before calling any Aerodrome flow.

> [!WARNING]
> ## CLI-only plugin
>
> This plugin uses **sugar-sdk** (a Python library) to build Aerodrome calldata locally, then submits it via Base MCP's `send_calls`. It only works in harnesses that have a Bash/CLI tool — **Claude Code, Codex, Cursor's terminal, etc.** It does **not** work on chat-only surfaces (ChatGPT, Claude.ai) because those have no shell to run Python in. If you detect a chat-only environment, tell the user this plugin requires CLI/terminal access and stop.

Aerodrome is the leading DEX on Base (a Velodrome fork). This plugin uses the [velodrome-finance/sugar-sdk](https://github.com/velodrome-finance/sugar-sdk) Python library to discover pools, build swap routes, and prepare deposit/withdraw/stake/claim calldata. Calldata is then submitted to Base MCP's `send_calls` for user approval.

No additional MCP server is required.

**Prerequisite:** Python 3 (3.11+ recommended) available on the user's machine. The harness must be able to run `pip` and execute Python scripts via Bash.

**Chain:** Base mainnet (chainId `8453` / `0x2105`)

---

## Architecture

```
sugar-sdk (Python, queries + calldata builder)
         ↓
  monkey-patch sign_and_send_tx to capture {to, data, value} instead of signing
         ↓
  pass captured calls to Base MCP send_calls
         ↓
  user approves → get_request_status confirms
```

Key contracts on Base (from sugar-sdk config):

| Contract | Address |
|----------|---------|
| Sugar (read-only data) | `0x69dD9db6d8f8E7d83887A704f447b1a584b599A1` |
| Router (V2 LP ops) | `0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43` |
| Universal Router (swaps) | `0x01D40099fCD87C018969B0e8D4aB1633Fb34763C` |
| Slipstream (CL pools) | `0x0AD09A66af0154a84e86F761313d02d0abB6edd5` |
| NFPM (CL positions) | `0x827922686190790b37229fd06084350E74485b72` |
| AERO token | `0x940181a94A35A4569E4529A3CDfB74e38FD98631` |
| WETH | `0x4200000000000000000000000000000000000006` |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |

---

## Setup

Run these once per project. If a venv already exists at `~/aerodrome-mcp/venv`, skip to step 3.

```bash
mkdir -p ~/aerodrome-mcp && cd ~/aerodrome-mcp
python3 -m venv venv
./venv/bin/pip install --quiet "setuptools<74"          # pkg_resources for sugar-sdk's setup.py
./venv/bin/pip install --quiet --no-build-isolation \
    "git+https://github.com/velodrome-finance/sugar-sdk.git@main"
```

**Why these flags:**
- `setuptools<74` — sugar-sdk's `setup.py` imports `pkg_resources`, which was removed from setuptools 74+.
- `--no-build-isolation` — forces pip to use our patched setuptools during the build instead of the latest.

---

## Public RPC limitations

The public `https://mainnet.base.org` RPC enforces two limits that break sugar-sdk's default batching:

1. **Max 10 calls per JSON-RPC batch** (returns `{"code": -32014, "message": "maximum 10 calls in 1 batch"}`)
2. **Rate-limits concurrent batch requests** (returns `{"code": -32016, "message": "over rate limit"}` when too many batches fire via `asyncio.gather`)

Apply these patches at the start of every sugar-sdk script to make it work on the public RPC. For production usage, prefer a paid RPC (Alchemy, QuickNode) and skip the patches.

```python
# patches.py
import asyncio
from sugar.chains import AsyncChain, CommonChain
from sugar.helpers import chunk
from sugar.price import Price

async def _safe_apaginate(self, f):
    """Sequential single-call paginator — rate-limit-safe for public RPCs."""
    all_results = []
    for offset in range(0, self.settings.pools_count_upper_bound, self.settings.pool_page_size):
        try:
            async with self.web3.batch_requests() as batcher:
                batcher.add(f(self.settings.pool_page_size, offset))
                results = await batcher.async_execute()
            for r in results:
                if isinstance(r, list):
                    all_results.extend(r)
        except Exception:
            pass  # skip rate-limited / failed pages
    return all_results

async def _safe_get_prices(self, tokens):
    """Fetches native ETH + stable token in a guaranteed first batch, then the rest."""
    tokens = list(tokens)
    connectors = self.settings.connector_tokens_addrs
    rates = {}
    ref_idx = [i for i, t in enumerate(tokens)
               if t.symbol == self.settings.native_token_symbol
               or t.token_address == self.settings.stable_token_addr]
    if ref_idx:
        try:
            async with self.web3.batch_requests() as batcher:
                batcher.add(self.prices.functions.getManyRatesToEthWithCustomConnectors(
                    [tokens[i].wrapped_token_address or tokens[i].token_address for i in ref_idx],
                    False, connectors, 10))
                results = await batcher.async_execute()
            if results and isinstance(results[0], list):
                for pos, i in enumerate(ref_idx):
                    rates[i] = results[0][pos]
        except Exception:
            pass
    non_ref = [(i, t) for i, t in enumerate(tokens) if i not in rates]
    for batch in chunk(non_ref, self.settings.price_batch_size):
        idxs, tkns = zip(*batch)
        try:
            async with self.web3.batch_requests() as batcher:
                batcher.add(self.prices.functions.getManyRatesToEthWithCustomConnectors(
                    [t.wrapped_token_address or t.token_address for t in tkns],
                    False, connectors, 10))
                results = await batcher.async_execute()
            if results and isinstance(results[0], list):
                for pos, i in enumerate(idxs):
                    rates[i] = results[0][pos]
        except Exception:
            for i in idxs: rates[i] = 0
    return [rates.get(i, 0) for i in range(len(tokens))]

def _safe_prepare_prices(self, tokens, prices):
    """Handles usd_rate=0 fallback gracefully."""
    eth_decimals = self.settings.native_token_decimals
    rates_in_eth = {}
    for cnt, rate in enumerate(prices):
        t = tokens[cnt]
        nr = rate if t.decimals == eth_decimals else (
            rate // (10 ** (eth_decimals - t.decimals)) if t.decimals < eth_decimals
            else rate * (10 ** (t.decimals - eth_decimals)))
        rates_in_eth[t.token_address] = nr
    eth_rate = rates_in_eth.get(self.settings.native_token_symbol, 0)
    usd_rate = rates_in_eth.get(self.settings.stable_token_addr, 0)
    if usd_rate == 0 or eth_rate == 0:
        return [Price(token=t, price=0.0) for t in tokens]
    eth_usd_price = (eth_rate * 10 ** eth_decimals) // usd_rate
    return [Price(token=t,
                  price=(rates_in_eth.get(t.token_address, 0) * eth_usd_price // 10 ** eth_decimals) / 10 ** eth_decimals)
            for t in tokens]

def _safe_quote_chunked():
    """Chunk paths into batches of ≤10 to respect public RPC batch limits."""
    async def _impl(_self, from_token, to_token, amount_in, pools, paths):
        all_quotes = []
        for path_batch in chunk(paths, 10):
            pool_batch = _self.paths_to_pools(pools, path_batch)
            try:
                async with _self.web3.batch_requests() as batcher:
                    batcher, inputs = _self.prepare_quote_batch(
                        from_token, to_token, batcher, pool_batch, amount_in, path_batch)
                    results = await batcher.async_execute()
                all_quotes.extend(_self.prepare_quotes(inputs, results))
            except Exception:
                pass
        return all_quotes
    return _impl

def apply_patches():
    AsyncChain.apaginate = _safe_apaginate
    AsyncChain._get_prices = _safe_get_prices
    AsyncChain._get_quotes_for_paths = _safe_quote_chunked()
    CommonChain.prepare_prices = _safe_prepare_prices
```

---

## Calldata bridge: intercepting sign_and_send_tx

sugar-sdk's write methods (`swap`, `deposit`, `withdraw`, `stake`, `claim_emissions`) all call `self.sign_and_send_tx(contract_fn, value=...)` internally, which signs with `SUGAR_PK` and broadcasts via `eth_sendRawTransaction`. We override it to capture the unsigned `{to, data, value}` instead, then hand the captured calls to `send_calls` for user approval.

```python
# bridge.py
import os, asyncio
os.environ.setdefault("SUGAR_PK", "0x" + "aa" * 32)  # dummy — we never actually sign

from sugar.chains import AsyncChain

BASE_WALLET = "<user's base-mcp wallet address — fetch via Base MCP get_wallets>"

class _FakeAccount:
    address = BASE_WALLET  # sugar-sdk reads .address in several places

_captured = []

async def _capture(self, tx, value: int = 0, wait: bool = True):
    tx_dict = await tx.build_transaction({
        "from": BASE_WALLET, "value": value, "nonce": 0, "gas": 800_000,
    })
    _captured.append({
        "to": tx_dict["to"],
        "data": tx_dict.get("data", "0x"),
        "value": hex(value),  # use the value param — tx_dict["value"] may be 0 for payable fns
    })
    return {"transactionHash": b"\x00" * 32, "status": 1}  # fake receipt

def install_bridge(base_wallet_addr):
    global BASE_WALLET
    BASE_WALLET = base_wallet_addr
    _FakeAccount.address = base_wallet_addr
    AsyncChain.sign_and_send_tx = _capture
    AsyncChain.account = property(lambda self: _FakeAccount())
    _captured.clear()

def captured_calls():
    return list(_captured)
```

---

## Tokens: native ETH vs ERC-20 WETH

Sugar-SDK exposes both. They behave very differently for swaps:

- **Native ETH token** (`symbol="ETH"`, `token_address="ETH"`, `wrapped_token_address=WETH`). Pass this when the user wants to spend native ETH (msg.value). `swap_from_quote` sets `value = quote.input.amount_in`.
- **WETH ERC-20** (`symbol="WETH"`, `token_address=WETH`, `wrapped_token_address=None`). Pass this only when the user already holds WETH. The router uses ERC-20 approval; msg.value is 0.

Pick the right one based on what the user is actually holding. For "swap 0.001 ETH to USDC" → use the native ETH token.

```python
eth_native = next(t for t in tokens if t.symbol == "ETH" and t.wrapped_token_address)
weth_erc20 = next(t for t in tokens if t.symbol == "WETH")  # only if user holds WETH
```

---

## Orchestration patterns

### Swap (ETH → USDC, native)

```python
import asyncio
from sugar.chains import AsyncBaseChain
import patches, bridge

patches.apply_patches()
bridge.install_bridge("<base-mcp wallet>")

async def build():
    async with AsyncBaseChain(rpc_uri="https://mainnet.base.org") as chain:
        tokens = await chain.get_all_tokens()
        eth = next(t for t in tokens if t.symbol == "ETH" and t.wrapped_token_address)
        usdc = next(t for t in tokens if t.token_address == "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913")
        quote = await chain.get_quote(eth, usdc, amount=int(0.001 * 1e18))
        await chain.swap_from_quote(quote, slippage=0.02)
    return bridge.captured_calls()

calls = asyncio.run(build())
# calls = [{to: WETH, data: approve(...), value: 0x0},
#          {to: UniversalRouter, data: execute(...), value: 0x38d7ea4c68000}]
```

The first captured call is a WETH approval to the Universal Router. For a **native ETH** swap, this approval is technically unnecessary (the router accepts msg.value directly). You can drop it to reduce gas — submit only the Universal Router execute call. For a **WETH ERC-20** swap, the approve is required.

Submit via Base MCP:

```json
{ "chain": "base", "calls": [<captured call 2>] }
```

### Swap (USDC → AERO)

```python
quote = await chain.get_quote(usdc, aero, amount=int(1 * 1e6))
await chain.swap_from_quote(quote, slippage=0.02)
# captures: USDC approve(Universal Router, ...) + Universal Router execute (value=0x0)
```

Batch both calls in one `send_calls` so the approve and swap execute atomically.

### Basic pool deposit (vAMM/sAMM)

Sugar's `get_pools()` requires prices for all tokens, which is slow on the public RPC. For a known pool, scan `Sugar.all()` directly for the LP address:

```python
from sugar.pool import LiquidityPool

ETH_USDC_VAMM = "0xcDAC0d6c6C59727a65F871236188350531885C43"  # known vAMM-WETH/USDC

tokens = await chain.get_all_tokens()
token_map = {t.token_address: t for t in tokens}
ref_prices = await chain.get_prices([eth_native, usdc_token])
price_map = {p.token.token_address: p for p in ref_prices}

full_pool = None
for offset in range(0, 9000, chain.settings.pool_page_size):
    batch = await chain.sugar.functions.all(chain.settings.pool_page_size, offset, 0).call()
    if not batch: break
    for raw in batch:
        if raw[0].lower() == ETH_USDC_VAMM.lower():
            full_pool = LiquidityPool.from_tuple(raw, token_map, price_map,
                                                  chain_id=chain.chain_id, chain_name=chain.name)
            break
    if full_pool: break

# Quote and build deposit calldata
amount_eth = int(0.001 * 1e18)
if full_pool.token0.token_address.lower() == "0x4200000000000000000000000000000000000006":
    q = await chain.quote_basic_deposit(full_pool, amount_token0=amount_eth)
else:
    q = await chain.quote_basic_deposit(full_pool, amount_token1=amount_eth)
await chain.deposit(q, slippage=0.02)
# captures: USDC approve(Router, ...) + Router.addLiquidityETH(...) with value=msg.value
```

The deposit calldata includes a **30-minute deadline** — if the user takes longer to approve, rebuild the calldata.

### Withdraw / stake / claim

```python
positions = await chain.get_positions(BASE_WALLET)

# Withdraw 50% of a basic position
from sugar.withdraw import Withdrawal
w = Withdrawal.from_position(positions[0], fraction=0.5)
await chain.withdraw(w, slippage=0.02)

# Stake an unstaked basic LP in its gauge
unstaked = [p for p in positions if p.gauge and not p.staked]
if unstaked: await chain.stake(unstaked[0])

# Claim emissions from a staked position
staked = [p for p in positions if p.staked]
if staked: await chain.claim_emissions(staked[0])
```

Each captured set of calls maps directly to `send_calls`.

---

## What works vs. what doesn't

Tested behaviors on Base mainnet (public RPC, 2026-05):

| Capability | Status | Notes |
|------------|--------|-------|
| `get_all_tokens` | ✅ Works | Returns ~4-7k tokens depending on RPC stability |
| `get_pools_for_swaps` | ✅ Works | Returns ~5k basic pools — no CL pools |
| `get_quote` (basic pools) | ✅ Works | Multi-hop routing |
| `get_prices` (small samples) | ✅ Works | Include native ETH + USDC in input |
| `get_prices` (all tokens) | ⚠️ Flaky | Public RPC rate limits cause USDC fallback to 0 → all-zero prices |
| `get_pools()` (full) | ⚠️ Slow / flaky | Needs full price set; better to scan `Sugar.all()` for specific LPs |
| Basic pool ops (swap/deposit/withdraw) | ✅ Works | Via Universal Router (swap) / Router (LP) |
| `get_positions` | ✅ Works | Returns 0 for fresh wallets |
| CL pool quotes / deposit | ❌ Not accessible | Sugar's `all()` does not enumerate Slipstream CL pools. Build CL calldata directly against NFPM contract instead. |
| Native ETH swap | ✅ Works | Use the native ETH token (`symbol="ETH"`, `wrapped_token_address=WETH`) — WETH approve is captured but unnecessary; drop it from the batch |

For production usage: install a paid RPC (Alchemy, QuickNode), drop the rate-limit patches, and the full pool/price flows become reliable.

---

## Example prompts

**Swap 0.001 ETH for USDC**
1. `get_wallets` → address.
2. Run sugar-sdk swap script with the native ETH token; capture calldata.
3. `send_calls` with just the Universal Router execute call (drop the WETH approve for native swaps).
4. Open the approval URL; poll `get_request_status` after the user acts.

**Swap 1 USDC for AERO**
1. `get_wallets` → address.
2. Run sugar-sdk swap script with USDC → AERO; capture both calls (approve + execute).
3. `send_calls` with both calls batched.
4. Open approval URL; poll.

**Provide liquidity to vAMM-WETH/USDC with 0.001 ETH**
1. `get_wallets` → address.
2. Scan `Sugar.all()` for `0xcDAC0d6c6C59727a65F871236188350531885C43`.
3. Quote `0.001 ETH` deposit → returns required USDC amount.
4. Capture approve + `addLiquidityETH` calls.
5. `send_calls` immediately (deadline is 30 min from build time).
6. Open approval URL; poll.

**Withdraw a position**
1. `get_wallets` → address.
2. Run sugar-sdk `get_positions` → pick a position.
3. Build `Withdrawal.from_position(pos, fraction=1.0)` and capture.
4. `send_calls` (approve LP token + `removeLiquidity`).
5. Open approval URL; poll.

---

## Slippage warnings

Same thresholds as other DEX plugins. Pass `slippage=0.01` (1%) by default to `swap_from_quote`, `deposit`, `withdraw`:

| Tolerance | Level | Action |
| --- | --- | --- |
| ≤ 1% | Normal | Proceed. |
| > 1% and ≤ 5% | Elevated | Mention the value and ask the user to confirm. |
| > 5% and ≤ 20% | High | Warn that the trade can fill significantly below quote. Require explicit confirmation. |
| > 20% | Very high | Strongly warn; do not submit without the user re-confirming the exact number. |

---

## Notes

- Sugar-SDK versions: pin to a specific commit/tag for reproducibility. The `@main` branch tested against here has `get_positions`, `withdraw`, `stake`, `unstake`, `claim_emissions`, `claim_fees`. The `@v0.3.1` tag does **not** include these — install from `main` for full functionality.
- The captured `from` address must match the address that ultimately signs the `send_calls` request — fetch it via Base MCP's `get_wallets` and pass it to `install_bridge()`.
- For CL pool operations (Slipstream / V3-style with tick ranges), sugar-sdk's `quote_concentrated_deposit` + `deposit` work if you can construct a full `LiquidityPool` object for the CL pool. Since `Sugar.all()` doesn't enumerate them, you'd need to fetch CL pool state directly from the Slipstream factory or NFPM contract — out of scope for this plugin's current scope.
- Always use `chain: "base"` (string) with `send_calls`, not the numeric chainId.
