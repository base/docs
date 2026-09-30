import { zeroAddress } from "viem";
import { account, publicClient, walletClient } from "../shared/clients.js";
import { AUTH_CAPTURE_ESCROW, authCaptureEscrowAbi, type StoredProtocolPayment } from "./protocol.js";

// docs:start usdc-capture-ts
export async function captureAuthorization(
  payment: StoredProtocolPayment,
  amount = payment.paymentInfo.maxAmount,
) {
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
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 2 });
  if (receipt.status !== "success") throw new Error("Payment capture reverted");
  return receipt;
}
// docs:end usdc-capture-ts
