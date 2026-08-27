import { getPermissionStatus, prepareSpendCallData } from "@base-org/account/spend-permission/node";
import { parseUnits } from "viem";
import { account, publicClient, walletClient } from "../shared/clients.js";

type SpendPermission = Parameters<typeof prepareSpendCallData>[0];

// docs:start scheduled-charge-ts
export async function chargeSubscription(permission: SpendPermission, amount: string) {
  if (permission.permission.spender.toLowerCase() !== account.address.toLowerCase()) {
    throw new Error("Connected account is not the approved spender");
  }
  const charge = parseUnits(amount, 6);
  const status = await getPermissionStatus(permission, { rpcUrl: process.env.RPC_URL });
  if (!status.isActive || status.isRevoked || status.isExpired) {
    throw new Error("Spend permission is not active");
  }
  if (status.remainingSpend < charge) throw new Error("Period allowance is exhausted");

  const calls = await prepareSpendCallData(permission, charge, account.address, {
    rpcUrl: process.env.RPC_URL,
  });
  for (const call of calls) {
    const hash = await walletClient.sendTransaction({
      account,
      to: call.to,
      data: call.data,
      value: call.value,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 2 });
    if (receipt.status !== "success") throw new Error("Scheduled charge reverted");
  }
}
// docs:end scheduled-charge-ts
