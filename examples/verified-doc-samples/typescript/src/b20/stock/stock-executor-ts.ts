// docs:start stock-executor-ts
import { parseEventLogs, type Address } from "viem";
import { account } from "../../shared/clients.js";
import { POLICY_REGISTRY, b20Abi, policyRegistryAbi, scope } from "../abi.js";
import { sendContract } from "../write.js";

export async function restrictTransferInitiators(token: Address, transferAgent: Address) {
  const receipt = await sendContract({ address: POLICY_REGISTRY, abi: policyRegistryAbi, functionName: "createPolicyWithAccounts", args: [account.address, 1, [transferAgent]] });
  const [created] = parseEventLogs({ abi: policyRegistryAbi, logs: receipt.logs, eventName: "PolicyCreated" });
  await sendContract({ address: token, abi: b20Abi, functionName: "updatePolicy", args: [scope("TRANSFER_EXECUTOR_POLICY"), created.args.policyId] });
  return created.args.policyId;
}
// docs:end stock-executor-ts
