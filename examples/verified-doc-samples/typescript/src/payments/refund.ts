import { account, publicClient, walletClient } from "../shared/clients.js";
import {
  AUTH_CAPTURE_ESCROW,
  OPERATOR_REFUND_COLLECTOR,
  authCaptureEscrowAbi,
  refundApprovalAbi,
  type StoredProtocolPayment,
} from "./protocol.js";

// docs:start refund-payment-ts
export async function refundPayment(
  payment: StoredProtocolPayment,
  refundAmount: bigint,
) {
  const [, , refundableAmount] = await publicClient.readContract({
    address: AUTH_CAPTURE_ESCROW,
    abi: authCaptureEscrowAbi,
    functionName: "paymentState",
    args: [payment.paymentInfoHash],
  });
  if (refundAmount > refundableAmount) throw new Error("Refund exceeds captured amount");
  const approval = await publicClient.simulateContract({
    account,
    address: payment.paymentInfo.token,
    abi: refundApprovalAbi,
    functionName: "approve",
    args: [OPERATOR_REFUND_COLLECTOR, refundAmount],
  });
  const approvalHash = await walletClient.writeContract(approval.request);
  await publicClient.waitForTransactionReceipt({ hash: approvalHash, confirmations: 2 });

  const refund = await publicClient.simulateContract({
    account,
    address: AUTH_CAPTURE_ESCROW,
    abi: authCaptureEscrowAbi,
    functionName: "refund",
    args: [payment.paymentInfo, refundAmount, OPERATOR_REFUND_COLLECTOR, "0x"],
  });
  const hash = await walletClient.writeContract(refund.request);
  return publicClient.waitForTransactionReceipt({ hash, confirmations: 2 });
}
// docs:end refund-payment-ts
