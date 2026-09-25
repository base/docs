import { parseUnits, type Address } from "viem";
import { account, publicClient, walletClient } from "../shared/clients.js";
import { USDC, usdcAbi } from "./usdc.js";

// docs:start simple-usdc-transfer-ts
export async function makeSimplePayment(recipient: Address, amount: string) {
  const simulation = await publicClient.simulateContract({
    account,
    address: USDC,
    abi: usdcAbi,
    functionName: "transfer",
    args: [recipient, parseUnits(amount, 6)],
  });
  const hash = await walletClient.writeContract(simulation.request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 2 });
  if (receipt.status !== "success") throw new Error("USDC transfer reverted");
  return hash;
}
// docs:end simple-usdc-transfer-ts
