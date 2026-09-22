import { parseUnits, zeroAddress } from "viem";
import { account, publicClient, walletClient } from "../shared/clients.js";
import { AUTH_CAPTURE_ESCROW, authCaptureEscrowAbi, type StoredProtocolPayment } from "./protocol.js";

// docs:start usdc-variable-payment-ts
export async function capturePartialPayment(
  payment: StoredProtocolPayment,
  actualAmount: string,
) {
  const amount = parseUnits(actualAmount, 6);
  const [, capturableAmount] = await publicClient.readContract({
    address: AUTH_CAPTURE_ESCROW,
    abi: authCaptureEscrowAbi,
    functionName: "paymentState",
    args: [payment.paymentInfoHash],
  });
  if (amount > capturableAmount) throw new Error("Capture exceeds authorized amount");
  const simulation = await publicClient.simulateContract({
    account,
    address: AUTH_CAPTURE_ESCROW,
    abi: authCaptureEscrowAbi,
    functionName: "capture",
    args: [payment.paymentInfo, amount, 0n, zeroAddress],
  });
  const hash = await walletClient.writeContract(simulation.request);
  return publicClient.waitForTransactionReceipt({ hash, confirmations: 2 });
}
// docs:end usdc-variable-payment-ts
