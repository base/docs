#!/usr/bin/env bash
set -euo pipefail

: "${RPC_URL:?Set RPC_URL}"
: "${PRIVATE_KEY:?Set PRIVATE_KEY}"
: "${TOKEN_ADDRESS:?Set TOKEN_ADDRESS}"

POLICY_REGISTRY=0x8453000000000000000000000000000000000002

# docs:start stablecoin-mint-cli
base-cast send "$TOKEN_ADDRESS" "mint(address,uint256)" "$HOLDER" 1000000000 \
  --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
base-cast call "$TOKEN_ADDRESS" "balanceOf(address)(uint256)" "$HOLDER" --rpc-url "$RPC_URL"
# docs:end stablecoin-mint-cli

# docs:start stablecoin-burn-cli
base-cast send "$TOKEN_ADDRESS" "burn(uint256)" 400000000 \
  --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
base-cast call "$TOKEN_ADDRESS" "totalSupply()(uint256)" --rpc-url "$RPC_URL"
# docs:end stablecoin-burn-cli

# docs:start stablecoin-restrict-cli
CREATE_TX=$(base-cast send "$POLICY_REGISTRY" \
  "createPolicyWithAccounts(address,uint8,address[])" "$ADMIN" 1 "[$ALICE,$BOB]" \
  --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --json | jq -r .transactionHash)
POLICY_TOPIC=$(base-cast receipt "$CREATE_TX" --rpc-url "$RPC_URL" --json | \
  jq -r '.logs[] | select(.address | ascii_downcase == "0x8453000000000000000000000000000000000002") | .topics[1]' | head -1)
POLICY_ID=$(base-cast to-dec "$POLICY_TOPIC")
for SCOPE in TRANSFER_SENDER_POLICY TRANSFER_RECEIVER_POLICY; do
  base-cast send "$TOKEN_ADDRESS" "updatePolicy(bytes32,uint64)" "$(base-cast keccak "$SCOPE")" "$POLICY_ID" \
    --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
done
# docs:end stablecoin-restrict-cli

# docs:start stablecoin-block-cli
base-cast send "$POLICY_REGISTRY" "updateBlocklist(uint64,bool,address[])" \
  "$BLOCKLIST_ID" true "[$ACCOUNT]" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
base-cast call "$POLICY_REGISTRY" "isAuthorized(uint64,address)(bool)" \
  "$BLOCKLIST_ID" "$ACCOUNT" --rpc-url "$RPC_URL"
# docs:end stablecoin-block-cli

# docs:start stablecoin-recover-cli
base-cast send "$TOKEN_ADDRESS" "burnBlocked(address,uint256)" "$BLOCKED" 50000000 \
  --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
base-cast send "$TOKEN_ADDRESS" "mint(address,uint256)" "$REPLACEMENT" 50000000 \
  --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
base-cast call "$TOKEN_ADDRESS" "balanceOf(address)(uint256)" "$REPLACEMENT" --rpc-url "$RPC_URL"
# docs:end stablecoin-recover-cli

# docs:start stablecoin-pause-cli
base-cast send "$TOKEN_ADDRESS" "pause(uint8[])" "[0]" \
  --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
base-cast call "$TOKEN_ADDRESS" "isPaused(uint8)(bool)" 0 --rpc-url "$RPC_URL"
base-cast send "$TOKEN_ADDRESS" "unpause(uint8[])" "[0]" \
  --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
# docs:end stablecoin-pause-cli

# docs:start stablecoin-memo-cli
MEMO=$(base-cast format-bytes32-string "invoice-8842")
TX=$(base-cast send "$TOKEN_ADDRESS" "transferWithMemo(address,uint256,bytes32)" \
  "$MERCHANT" 25000000 "$MEMO" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --json | jq -r .transactionHash)
base-cast receipt "$TX" --rpc-url "$RPC_URL"
# docs:end stablecoin-memo-cli

# docs:start stock-issue-cli
base-cast send "$TOKEN_ADDRESS" "batchMint(address[],uint256[])" \
  "[$ALICE,$BOB]" "[600000000,400000000]" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
base-cast call "$TOKEN_ADDRESS" "balanceOf(address)(uint256)" "$ALICE" --rpc-url "$RPC_URL"
# docs:end stock-issue-cli

# docs:start stock-restrict-cli
CREATE_TX=$(base-cast send "$POLICY_REGISTRY" \
  "createPolicyWithAccounts(address,uint8,address[])" "$ADMIN" 1 "[$ALICE,$BOB]" \
  --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --json | jq -r .transactionHash)
POLICY_TOPIC=$(base-cast receipt "$CREATE_TX" --rpc-url "$RPC_URL" --json | jq -r '.logs[0].topics[1]')
POLICY_ID=$(base-cast to-dec "$POLICY_TOPIC")
for SCOPE in MINT_RECEIVER_POLICY TRANSFER_SENDER_POLICY TRANSFER_RECEIVER_POLICY; do
  base-cast send "$TOKEN_ADDRESS" "updatePolicy(bytes32,uint64)" "$(base-cast keccak "$SCOPE")" "$POLICY_ID" \
    --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
done
# docs:end stock-restrict-cli

# docs:start stock-cancel-cli
base-cast send "$TOKEN_ADDRESS" "burnBlocked(address,uint256)" "$BLOCKED_HOLDER" 100000000 \
  --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
base-cast call "$TOKEN_ADDRESS" "balanceOf(address)(uint256)" "$BLOCKED_HOLDER" --rpc-url "$RPC_URL"
# docs:end stock-cancel-cli

# docs:start stock-split-cli
base-cast send "$TOKEN_ADDRESS" "updateMultiplier(uint256)" 2000000000000000000 \
  --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
base-cast call "$TOKEN_ADDRESS" "scaledBalanceOf(address)(uint256)" "$HOLDER" --rpc-url "$RPC_URL"
# docs:end stock-split-cli

# docs:start stock-pause-cli
base-cast send "$TOKEN_ADDRESS" "pause(uint8[])" "[0]" \
  --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
base-cast call "$TOKEN_ADDRESS" "isPaused(uint8)(bool)" 0 --rpc-url "$RPC_URL"
base-cast send "$TOKEN_ADDRESS" "unpause(uint8[])" "[0]" \
  --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
# docs:end stock-pause-cli
