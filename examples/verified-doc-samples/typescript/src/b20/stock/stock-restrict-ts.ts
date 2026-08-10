// docs:start stock-restrict-ts
import { parseEventLogs, type Address } from "viem";
import { account } from "../../shared/clients.js";
import { POLICY_REGISTRY, b20Abi, policyRegistryAbi, scope } from "../abi.js";
import { sendContract } from "../write.js";

export async function restrictStockHolders(token: Address, holders: Address[]) {
  const receipt = await sendContract({ address: POLICY_REGISTRY, abi: policyRegistryAbi, functionName: "createPolicyWithAccounts", args: [account.address, 1, holders] });
  const [created] = parseEventLogs({ abi: policyRegistryAbi, logs: receipt.logs, eventName: "PolicyCreated" });
  for (const policyScope of [scope("MINT_RECEIVER_POLICY"), scope("TRANSFER_SENDER_POLICY"), scope("TRANSFER_RECEIVER_POLICY")]) {
    await sendContract({ address: token, abi: b20Abi, functionName: "updatePolicy", args: [policyScope, created.args.policyId] });
  }
  return created.args.policyId;
}
// docs:end stock-restrict-ts
