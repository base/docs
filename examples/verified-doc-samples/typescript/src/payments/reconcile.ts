import { publicClient } from "../shared/clients.js";
import { AUTH_CAPTURE_ESCROW, authCaptureEscrowAbi } from "./protocol.js";

// docs:start reconcile-payments-ts
export async function buildSettlementReport(
  fromBlock: bigint,
  toBlock: bigint,
) {
  const logs = await publicClient.getContractEvents({
    address: AUTH_CAPTURE_ESCROW,
    abi: authCaptureEscrowAbi,
    fromBlock,
    toBlock,
    strict: true,
  });
  return logs.flatMap((log) => {
    if (!log.transactionHash) return [];
    if (log.eventName === "PaymentCharged") return [{
      paymentInfoHash: log.args.paymentInfoHash,
      transactionHash: log.transactionHash,
      logIndex: log.logIndex,
      operation: "charge",
      grossAmount: log.args.amount,
      feeAmount: log.args.feeAmount,
    }];
    if (log.eventName === "PaymentCaptured") return [{
      paymentInfoHash: log.args.paymentInfoHash,
      transactionHash: log.transactionHash,
      logIndex: log.logIndex,
      operation: "capture",
      grossAmount: log.args.amount,
      feeAmount: log.args.feeAmount,
    }];
    if (log.eventName === "PaymentRefunded") return [{
      paymentInfoHash: log.args.paymentInfoHash,
      transactionHash: log.transactionHash,
      logIndex: log.logIndex,
      operation: "refund",
      grossAmount: -log.args.amount,
      feeAmount: 0n,
    }];
    return [];
  });
}
// docs:end reconcile-payments-ts
