// docs:start stock-split-ts
import { type Address } from "viem";
import { publicClient } from "../../shared/clients.js";
import { assetAbi } from "../abi.js";
import { sendContract } from "../write.js";

export async function scheduleTwoForOneSplit(token: Address) {
  const effectiveAt = BigInt(Math.floor(Date.now() / 1000) + 86_400);
  await sendContract({ address: token, abi: assetAbi, functionName: "updateUIMultiplier", args: [2n * 10n ** 18n, effectiveAt] });
  const pending = await publicClient.readContract({ address: token, abi: assetAbi, functionName: "newUIMultiplier" });
  if (pending !== 2n * 10n ** 18n) throw new Error("Split was not scheduled");
  return effectiveAt;
}
// docs:end stock-split-ts
