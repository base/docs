// docs:start stock-seize-ts
import { parseUnits, stringToHex, type Address } from "viem";
import { account, publicClient } from "../../shared/clients.js";
import { b20Abi, scope } from "../abi.js";
import { sendContract } from "../write.js";

export async function seizeAndCancelUnits(token: Address, blocklistId: bigint, holder: Address) {
  const amount = parseUnits("100", 6);
  const memo = stringToHex("cancel-2026-07", { size: 32 });
  await sendContract({ address: token, abi: b20Abi, functionName: "updatePolicy", args: [scope("SEIZE_EXEMPT_POLICY"), blocklistId] });
  await sendContract({ address: token, abi: b20Abi, functionName: "seizeWithMemo", args: [holder, account.address, amount, memo] });
  await sendContract({ address: token, abi: b20Abi, functionName: "burnWithMemo", args: [amount, memo] });
  return publicClient.readContract({ address: token, abi: b20Abi, functionName: "totalSupply" });
}
// docs:end stock-seize-ts
