// docs:start stock-issue-ts
import { parseUnits, type Address } from "viem";
import { publicClient } from "../../shared/clients.js";
import { assetAbi, b20Abi } from "../abi.js";
import { sendContract } from "../write.js";

export async function issueShares(token: Address, holders: [Address, Address]) {
  const amounts = [parseUnits("600", 6), parseUnits("400", 6)] as const;
  await sendContract({ address: token, abi: assetAbi, functionName: "batchMint", args: [holders, amounts] });
  const balances = await Promise.all(holders.map((holder) => publicClient.readContract({ address: token, abi: b20Abi, functionName: "balanceOf", args: [holder] })));
  if (balances[0] !== amounts[0] || balances[1] !== amounts[1]) throw new Error("Unexpected issuance balances");
}
// docs:end stock-issue-ts
