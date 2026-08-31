// docs:start stock-dividend-ts
import { encodeFunctionData, parseUnits, type Address } from "viem";
import { publicClient } from "../../shared/clients.js";
import { assetAbi } from "../abi.js";
import { sendContract } from "../write.js";

export async function announceStockDividend(token: Address, holders: Address[]) {
  const mint = encodeFunctionData({
    abi: assetAbi,
    functionName: "batchMint",
    args: [holders, [parseUnits("30", 6), parseUnits("20", 6)]],
  });
  const id = `dividend-${Date.now()}`;
  await sendContract({
    address: token,
    abi: assetAbi,
    functionName: "announce",
    args: [[mint], id, "Five-percent stock dividend", "https://example.com/actions/dividend"],
  });
  const used = await publicClient.readContract({ address: token, abi: assetAbi, functionName: "isAnnouncementIdUsed", args: [id] });
  if (!used) throw new Error("Announcement was not recorded");
}
// docs:end stock-dividend-ts
