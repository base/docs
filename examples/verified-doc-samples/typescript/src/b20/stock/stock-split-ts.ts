// docs:start stock-split-ts
import { type Address } from "viem";
import { publicClient } from "../../shared/clients.js";
import { assetAbi } from "../abi.js";
import { sendContract } from "../write.js";

export async function runTwoForOneSplit(token: Address, holder: Address) {
  await sendContract({ address: token, abi: assetAbi, functionName: "updateMultiplier", args: [2n * 10n ** 18n] });
  const multiplier = await publicClient.readContract({ address: token, abi: assetAbi, functionName: "multiplier" });
  const scaled = await publicClient.readContract({ address: token, abi: assetAbi, functionName: "scaledBalanceOf", args: [holder] });
  if (multiplier !== 2n * 10n ** 18n) throw new Error("Multiplier was not updated");
  return scaled;
}
// docs:end stock-split-ts
