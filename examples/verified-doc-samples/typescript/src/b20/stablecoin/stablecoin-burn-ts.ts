// docs:start stablecoin-burn-ts
import { parseUnits, type Address } from "viem";
import { publicClient } from "../../shared/clients.js";
import { b20Abi } from "../abi.js";
import { sendContract } from "../write.js";

export async function burnAndVerify(token: Address) {
  const before = await publicClient.readContract({ address: token, abi: b20Abi, functionName: "totalSupply" });
  const amount = parseUnits("400", 6);
  await sendContract({ address: token, abi: b20Abi, functionName: "burn", args: [amount] });
  const after = await publicClient.readContract({ address: token, abi: b20Abi, functionName: "totalSupply" });
  if (before - after !== amount) throw new Error("Unexpected supply change");
}
// docs:end stablecoin-burn-ts
