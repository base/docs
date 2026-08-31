// docs:start stablecoin-memo-ts
import { hexToString, parseEventLogs, parseUnits, stringToHex, type Address } from "viem";
import { b20Abi } from "../abi.js";
import { sendContract } from "../write.js";

export async function payWithMemo(token: Address, merchant: Address) {
  const memo = stringToHex("invoice-8842", { size: 32 });
  const receipt = await sendContract({
    address: token,
    abi: b20Abi,
    functionName: "transferWithMemo",
    args: [merchant, parseUnits("25", 6), memo],
  });
  const [event] = parseEventLogs({ abi: b20Abi, logs: receipt.logs, eventName: "Memo" });
  return hexToString(event.args.memo, { size: 32 }).replace(/\0+$/, "");
}
// docs:end stablecoin-memo-ts
