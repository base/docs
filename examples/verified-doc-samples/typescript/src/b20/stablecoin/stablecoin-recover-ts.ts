// docs:start stablecoin-recover-ts
import { parseUnits, stringToHex, type Address } from "viem";
import { publicClient } from "../../shared/clients.js";
import { b20Abi, scope } from "../abi.js";
import { sendContract } from "../write.js";

export async function recoverBlockedFunds(token: Address, blocklistId: bigint, blocked: Address, treasury: Address) {
  const amount = parseUnits("50", 6);
  const memo = stringToHex("legal-hold-2026-118", { size: 32 });
  await sendContract({ address: token, abi: b20Abi, functionName: "updatePolicy", args: [scope("SEIZE_EXEMPT_POLICY"), blocklistId] });
  await sendContract({ address: token, abi: b20Abi, functionName: "seizeWithMemo", args: [blocked, treasury, amount, memo] });
  const balance = await publicClient.readContract({ address: token, abi: b20Abi, functionName: "balanceOf", args: [treasury] });
  if (balance < amount) throw new Error("Seized balance did not reach the treasury");
}
// docs:end stablecoin-recover-ts
