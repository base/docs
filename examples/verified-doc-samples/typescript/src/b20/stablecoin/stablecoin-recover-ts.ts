// docs:start stablecoin-recover-ts
import { parseUnits, type Address } from "viem";
import { publicClient } from "../../shared/clients.js";
import { b20Abi } from "../abi.js";
import { sendContract } from "../write.js";

export async function recoverBlockedFunds(token: Address, blocked: Address, replacement: Address) {
  const amount = parseUnits("50", 6);
  await sendContract({ address: token, abi: b20Abi, functionName: "burnBlocked", args: [blocked, amount] });
  await sendContract({ address: token, abi: b20Abi, functionName: "mint", args: [replacement, amount] });
  const balance = await publicClient.readContract({ address: token, abi: b20Abi, functionName: "balanceOf", args: [replacement] });
  if (balance < amount) throw new Error("Replacement balance was not issued");
}
// docs:end stablecoin-recover-ts
