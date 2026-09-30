import { account, publicClient, walletClient } from "../shared/clients.js";
import { AUTH_CAPTURE_ESCROW, authCaptureEscrowAbi, type StoredProtocolPayment } from "./protocol.js";

// docs:start usdc-void-ts
export async function voidAuthorization(payment: StoredProtocolPayment) {
  const [, capturableAmount] = await publicClient.readContract({
    address: AUTH_CAPTURE_ESCROW,
    abi: authCaptureEscrowAbi,
    functionName: "paymentState",
    args: [payment.paymentInfoHash],
  });
  if (capturableAmount === 0n) throw new Error("Authorization has no remaining funds");
  const simulation = await publicClient.simulateContract({
    account,
    address: AUTH_CAPTURE_ESCROW,
    abi: authCaptureEscrowAbi,
    functionName: "void",
    args: [payment.paymentInfo],
  });
  const hash = await walletClient.writeContract(simulation.request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 2 });
  if (receipt.status !== "success") throw new Error("Payment void reverted");
  return receipt;
}
// docs:end usdc-void-ts
