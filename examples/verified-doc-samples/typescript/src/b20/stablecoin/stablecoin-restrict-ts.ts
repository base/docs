// docs:start stablecoin-restrict-ts
import { parseEventLogs, type Address } from "viem";
import { account, publicClient } from "../../shared/clients.js";
import { POLICY_REGISTRY, b20Abi, policyRegistryAbi, scope } from "../abi.js";
import { sendContract } from "../write.js";

export async function createHolderAllowlist(token: Address, holders: Address[]) {
  const receipt = await sendContract({
    address: POLICY_REGISTRY,
    abi: policyRegistryAbi,
    functionName: "createPolicyWithAccounts",
    args: [account.address, 1, holders],
  });
  const [created] = parseEventLogs({ abi: policyRegistryAbi, logs: receipt.logs, eventName: "PolicyCreated" });
  const policyId = created.args.policyId;
  for (const policyScope of [scope("TRANSFER_SENDER_POLICY"), scope("TRANSFER_RECEIVER_POLICY")]) {
    await sendContract({ address: token, abi: b20Abi, functionName: "updatePolicy", args: [policyScope, policyId] });
  }
  const saved = await publicClient.readContract({ address: token, abi: b20Abi, functionName: "policyId", args: [scope("TRANSFER_RECEIVER_POLICY")] });
  if (saved !== policyId) throw new Error("Policy was not bound");
  return policyId;
}
// docs:end stablecoin-restrict-ts
