// docs:start stablecoin-block-ts
import { type Address } from "viem";
import { publicClient } from "../../shared/clients.js";
import { POLICY_REGISTRY, policyRegistryAbi } from "../abi.js";
import { sendContract } from "../write.js";

export async function setBlocked(policyId: bigint, holder: Address, blocked: boolean) {
  await sendContract({
    address: POLICY_REGISTRY,
    abi: policyRegistryAbi,
    functionName: "updateBlocklist",
    args: [policyId, blocked, [holder]],
  });
  const authorized = await publicClient.readContract({
    address: POLICY_REGISTRY,
    abi: policyRegistryAbi,
    functionName: "isAuthorized",
    args: [policyId, holder],
  });
  if (authorized === blocked) throw new Error("Unexpected blocklist state");
}
// docs:end stablecoin-block-ts
