---
sidebarTitle: Sync Troubleshooting
title: Detailed Sync Troubleshooting
---

This guide provides detailed solutions for common Base node synchronization issues based on community reports (GitHub issues #127, #251, #369, #413, #419, #433).

## Quick Diagnostic Commands

```bash
# Check sync status
curl -s http://localhost:7545 | jq '.'

# Check current block
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545

# Check peer count
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}' \
  http://localhost:8545
```

---

## Detailed Sync Scenarios

### Node Consistently Behind (12+ Hours)

- **Issue**: Node falls further behind over time, gap keeps growing.
    - **Check**: L1 RPC rate limiting:
      ```bash
      docker compose logs node | grep -i "rate limit\|429"
      ```
    - **Check**: Measure lag:
      ```bash
      curl -s http://localhost:7545 | jq '{lag_hours: ((.head_l1.timestamp - .current_l1.timestamp) / 3600)}'
      ```
    - **Root Cause**: L1 RPC endpoint has insufficient throughput or rate limiting.
    - **Action**: Upgrade L1 RPC provider:
        - Free tier (Infura/Alchemy) insufficient for Base nodes
        - Recommended: Alchemy Growth (~$199/mo), QuickNode (~$49/mo), or self-hosted L1 node
        - Update `OP_NODE_L1_ETH_RPC` and `OP_NODE_L1_BEACON` in `.env.mainnet`
        - Restart: `docker compose down && docker compose up -d`
    - **Verify**: Monitor improvement:
      ```bash
      watch -n 10 'curl -s http://localhost:7545 | jq ".current_l1.number, .head_l1.number"'
      ```

### Node Completely Stuck (No Progress)

- **Issue**: Block height not increasing for 1+ hours, `eth_syncing` returns `false` but node is behind.
    - **Check**: Block progression:
      ```bash
      # Record current block, wait 60 seconds, check again
      curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        http://localhost:8545
      ```
    - **Check**: P2P connectivity (should be 10+ peers):
      ```bash
      curl -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}' \
        http://localhost:8545
      ```
    - **Check**: Port 30303 accessibility:
      ```bash
      sudo netstat -tulpn | grep 30303
      # If not listening, check firewall
      ```
    - **Root Cause**: Corrupted database, P2P issues, or lost L1/L2 connection.
    - **Action** (try in order):
        1. Simple restart: `docker compose restart`
        2. Open P2P port if peer count is 0:
           ```bash
           sudo ufw allow 30303/tcp
           sudo ufw allow 30303/udp
           ```
        3. If still stuck, consider snapshot restoration (see [Snapshots](/base-chain/node-operators/snapshots)).

### Extremely Slow Initial Sync

- **Issue**: Syncing at < 100 blocks/second, taking weeks instead of days.
    - **Check**: Storage type:
      ```bash
      lsblk -d -o NAME,ROTA,TYPE,SIZE,MODEL
      # ROTA: 0 = SSD/NVMe (good), 1 = HDD (too slow)
      ```
    - **Check**: Disk performance:
      ```bash
      sudo hdparm -t /dev/nvme0n1  # should show > 1000 MB/s
      ```
    - **Check**: RAID configuration (RAID-5/6 causes 10x slowdown):
      ```bash
      cat /proc/mdstat
      ```
    - **Check**: Disk I/O during sync:
      ```bash
      iostat -x 1 5
      # %util > 90% and await > 50ms = disk bottleneck
      ```
    - **Root Cause**: Hardware bottleneck - SATA SSD (3-5x slower), RAID-5/6 (10x penalty), or network-attached storage.
    - **Action**:
        - **Critical**: If using RAID-5/6, migrate to RAID-0, RAID-10, or single NVMe
        - **Critical**: If using network storage (NAS/iSCSI), migrate to local NVMe
        - Consider using snapshot to skip initial sync (see [Snapshots](/base-chain/node-operators/snapshots))
        - Upgrade to NVMe SSD if using SATA

### Reth-Specific Slow Sync

- **Issue**: Using Reth but sync slower than expected, low resource utilization.
    - **Check**: Current peer count:
      ```bash
      curl -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}' \
        http://localhost:8545
      # Should be 30-100 for fast sync
      ```
    - **Root Cause**: Reth not configured with performance flags.
    - **Action**: Add performance flags to `.env.mainnet`:
      ```bash
      # Edit .env.mainnet
      ADDITIONAL_ARGS=--full --max-outbound-peers=100 --max-inbound-peers=30
      
      # For systems with 32GB+ RAM, also add:
      # ADDITIONAL_ARGS=--full --max-outbound-peers=100 --max-inbound-peers=30 --max-cache-size=16384
      ```
    - **Action**: Restart to apply changes:
      ```bash
      docker compose down
      docker compose up -d
      ```
    - **Verify**: Check flags were applied:
      ```bash
      docker compose logs execution | grep "Starting reth"
      ```

---

## Hardware Anti-Patterns

### Storage Configurations to Avoid

- **RAID-5 / RAID-6**: Causes 10x write penalty due to parity calculations. Migrate to RAID-0, RAID-10, or single NVMe.
    - Check: `cat /proc/mdstat`

- **Network-Attached Storage (NAS/iSCSI)**: Network latency kills sync performance. Use local NVMe only.
    - Check: `df -h | grep reth-data`

- **SATA SSD**: 3-5x slower than NVMe. Acceptable for testing, not for production.
    - Test speed: `sudo hdparm -t /dev/sda` (should be > 500 MB/s for SATA, > 2000 MB/s for NVMe)

### Recommended Configuration

- **Storage**: Local NVMe SSD (PCIe Gen3/4)
- **RAM**: 32GB+ for Reth with large cache
- **CPU**: 8+ cores recommended
- **L1 RPC**: Paid tier or self-hosted (free tiers insufficient)

---

## Monitoring Commands

```bash
# Calculate blocks synced per minute
BLOCK1=$(curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545 | jq -r '.result' | xargs printf "%d"); sleep 60; BLOCK2=$(curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545 | jq -r '.result' | xargs printf "%d"); echo "Blocks/min: $(($BLOCK2 - $BLOCK1))"

# Check hours behind
curl -s http://localhost:7545 | jq '((.head_l1.timestamp - .current_l1.timestamp) / 3600)'

# Watch sync progress
watch -n 5 'curl -s -X POST -H "Content-Type: application/json" --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\",\"params\":[],\"id\":1}" http://localhost:8545 | jq -r ".result" | xargs printf "%d\n"'

# Container resources
docker stats --no-stream

# Recent errors
docker compose logs --since 1h | grep -i error | tail -20
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Check sync status | `curl -s http://localhost:7545 \| jq '.'` |
| Current block | `curl -X POST ... eth_blockNumber ...` |
| Peer count | `curl -X POST ... net_peerCount ...` |
| Exec logs | `docker compose logs -f execution` |
| Node logs | `docker compose logs -f node` |
| Restart | `docker compose restart` |
| Disk I/O | `iostat -x 1 5` |
| RAID config | `cat /proc/mdstat` |
| Disk speed | `sudo hdparm -t /dev/nvme0n1` |

---

## Related Issues

This guide addresses issues reported in:
- [#127](https://github.com/base-org/node/issues/127) - Node 12+ hours behind
- [#251](https://github.com/base-org/node/issues/251) - Intermittent slow sync
- [#369](https://github.com/base-org/node/issues/369) - RAID-5 performance issues
- [#413](https://github.com/base-org/node/issues/413) - op-reth slow sync
- [#419](https://github.com/base-org/node/issues/419) - Node stuck/unsynced
- [#433](https://github.com/base-org/node/issues/433) - Snapshot issues

For general troubleshooting, see [Node Troubleshooting](/base-chain/node-operators/troubleshooting).
