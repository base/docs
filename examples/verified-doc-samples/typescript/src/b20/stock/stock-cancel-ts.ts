// docs:start stock-cancel-ts
import { parseUnits, type Address } from "viem";
import { publicClient } from "../../shared/clients.js";
import { b20Abi } from "../abi.js";
import { sendContract } from "../write.js";

export async function cancelBlockedShares(token: Address, holder: Address) {
  const amount = parseUnits("100", 6);
  await sendContract({ address: token, abi: b20Abi, functionName: "burnBlocked", args: [holder, amount] });
  return publicClient.readContract({ address: token, abi: b20Abi, functionName: "balanceOf", args: [holder] });
}
// docs:end stock-cancel-ts
