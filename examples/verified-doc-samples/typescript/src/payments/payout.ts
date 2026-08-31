import { keccak256, parseAbi, parseUnits, toHex, type Address } from "viem";
import { account, publicClient, walletClient } from "../shared/clients.js";

const payoutAbi = parseAbi([
  "function sendPayouts(bytes32,address[],uint256[])",
  "function splitPayment(bytes32,uint256,address[],uint16[],uint256)",
]);

// docs:start send-payout-ts
export async function sendPayouts(
  payout: Address,
  batchReference: string,
  recipients: Address[],
  amounts: string[],
) {
  if (recipients.length !== amounts.length) throw new Error("Recipient and amount counts differ");
  const batchId = keccak256(toHex(batchReference));
  const simulation = await publicClient.simulateContract({
    account,
    address: payout,
    abi: payoutAbi,
    functionName: "sendPayouts",
    args: [batchId, recipients, amounts.map((amount) => parseUnits(amount, 6))],
  });
  const hash = await walletClient.writeContract(simulation.request);
  return publicClient.waitForTransactionReceipt({ hash, confirmations: 2 });
}
// docs:end send-payout-ts

// docs:start split-payment-ts
export async function splitPayment(
  payout: Address,
  splitReference: string,
  amount: string,
  recipients: Address[],
  sharesBps: number[],
  remainderRecipient = 0,
) {
  if (sharesBps.reduce((sum, share) => sum + share, 0) !== 10_000) {
    throw new Error("Shares must total 10,000 basis points");
  }
  const splitId = keccak256(toHex(splitReference));
  const simulation = await publicClient.simulateContract({
    account,
    address: payout,
    abi: payoutAbi,
    functionName: "splitPayment",
    args: [splitId, parseUnits(amount, 6), recipients, sharesBps, BigInt(remainderRecipient)],
  });
  const hash = await walletClient.writeContract(simulation.request);
  return publicClient.waitForTransactionReceipt({ hash, confirmations: 2 });
}
// docs:end split-payment-ts
