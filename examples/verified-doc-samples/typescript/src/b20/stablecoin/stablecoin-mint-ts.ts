// docs:start stablecoin-mint-ts
import { parseUnits, type Address } from "viem";
import { publicClient } from "../../shared/clients.js";
import { b20Abi } from "../abi.js";
import { sendContract } from "../write.js";

export async function mintAndVerify(token: Address, holder: Address) {
  const amount = parseUnits("1000", 6);
  await sendContract({ address: token, abi: b20Abi, functionName: "mint", args: [holder, amount] });
  const balance = await publicClient.readContract({ address: token, abi: b20Abi, functionName: "balanceOf", args: [holder] });
  if (balance < amount) throw new Error("Minted balance was not recorded");
  return balance;
}
// docs:end stablecoin-mint-ts
