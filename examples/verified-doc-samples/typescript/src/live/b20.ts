import { parseEventLogs, type Address } from "viem";
import { account, publicClient } from "../shared/clients.js";
import { required } from "../shared/env.js";
import { POLICY_REGISTRY, b20Abi, policyRegistryAbi, role, scope } from "../b20/abi.js";
import { sendContract, sentTransactionHashes } from "../b20/write.js";
import { createStablecoin } from "../b20/stablecoin/stablecoin-create-ts.js";
import { mintAndVerify } from "../b20/stablecoin/stablecoin-mint-ts.js";
import { burnAndVerify } from "../b20/stablecoin/stablecoin-burn-ts.js";
import { createHolderAllowlist } from "../b20/stablecoin/stablecoin-restrict-ts.js";
import { setBlocked } from "../b20/stablecoin/stablecoin-block-ts.js";
import { recoverBlockedFunds } from "../b20/stablecoin/stablecoin-recover-ts.js";
import { setTransfersPaused } from "../b20/stablecoin/stablecoin-pause-ts.js";
import { payWithMemo } from "../b20/stablecoin/stablecoin-memo-ts.js";
import { createStockToken } from "../b20/stock/stock-create-ts.js";
import { issueShares } from "../b20/stock/stock-issue-ts.js";
import { restrictStockHolders } from "../b20/stock/stock-restrict-ts.js";
import { cancelBlockedShares } from "../b20/stock/stock-cancel-ts.js";
import { announceStockDividend } from "../b20/stock/stock-dividend-ts.js";
import { runTwoForOneSplit } from "../b20/stock/stock-split-ts.js";
import { setStockTransfersPaused } from "../b20/stock/stock-pause-ts.js";

const holder = required("HOLDER_ADDRESS") as Address;

async function createBlocklist(token: Address) {
  const receipt = await sendContract({
    address: POLICY_REGISTRY,
    abi: policyRegistryAbi,
    functionName: "createPolicy",
    args: [account.address, 0],
  });
  const [created] = parseEventLogs({ abi: policyRegistryAbi, logs: receipt.logs, eventName: "PolicyCreated" });
  await sendContract({
    address: token,
    abi: b20Abi,
    functionName: "updatePolicy",
    args: [scope("TRANSFER_SENDER_POLICY"), created.args.policyId],
  });
  return created.args.policyId;
}

async function grantStablecoinRoles(token: Address) {
  for (const name of ["BURN_ROLE", "BURN_BLOCKED_ROLE", "PAUSE_ROLE", "UNPAUSE_ROLE"]) {
    await sendContract({
      address: token,
      abi: b20Abi,
      functionName: "grantRole",
      args: [role(name), account.address],
    });
  }
}

async function main() {
  const stablecoin = (process.env.STABLECOIN_ADDRESS as Address | undefined) ?? await createStablecoin();
  await grantStablecoinRoles(stablecoin);
  await mintAndVerify(stablecoin, account.address);
  await mintAndVerify(stablecoin, holder);
  await burnAndVerify(stablecoin);
  await createHolderAllowlist(stablecoin, [account.address, holder]);
  const stableBlocklist = await createBlocklist(stablecoin);
  await setBlocked(stableBlocklist, holder, true);
  await recoverBlockedFunds(stablecoin, holder, account.address);
  await setTransfersPaused(stablecoin, true);
  await setTransfersPaused(stablecoin, false);
  const memo = await payWithMemo(stablecoin, holder);

  const stock = (process.env.STOCK_ADDRESS as Address | undefined) ?? await createStockToken();
  await issueShares(stock, [account.address, holder]);
  await restrictStockHolders(stock, [account.address, holder]);
  const stockBlocklist = await createBlocklist(stock);
  await setBlocked(stockBlocklist, holder, true);
  await cancelBlockedShares(stock, holder);
  await announceStockDividend(stock, [account.address, holder]);
  await runTwoForOneSplit(stock, account.address);
  await setStockTransfersPaused(stock, true);
  await setStockTransfersPaused(stock, false);

  const stableSupply = await publicClient.readContract({ address: stablecoin, abi: b20Abi, functionName: "totalSupply" });
  console.log(JSON.stringify({
    network: "eip155:84532",
    issuer: account.address,
    stablecoin,
    stock,
    memo,
    stableSupply: stableSupply.toString(),
    transactions: sentTransactionHashes,
  }, null, 2));
}

await main();
