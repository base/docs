// docs:start stock-pause-ts
import { type Address } from "viem";
import { publicClient } from "../../shared/clients.js";
import { b20Abi } from "../abi.js";
import { sendContract } from "../write.js";

export async function setStockTransfersPaused(token: Address, paused: boolean) {
  await sendContract({ address: token, abi: b20Abi, functionName: paused ? "pause" : "unpause", args: [[0]] });
  const current = await publicClient.readContract({ address: token, abi: b20Abi, functionName: "isPaused", args: [0] });
  if (current !== paused) throw new Error("Unexpected transfer pause state");
}
// docs:end stock-pause-ts
