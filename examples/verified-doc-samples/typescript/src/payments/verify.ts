import { parseEventLogs, type Hash } from "viem";
import { publicClient } from "../shared/clients.js";
import { AUTH_CAPTURE_ESCROW, authCaptureEscrowAbi } from "./protocol.js";

export interface PaymentStore {
  claimOnce(id: string, orderId: string): Promise<boolean>;
}

// docs:start verify-token-payment-ts
export async function verifyPayment(args: {
  hash: Hash;
  paymentInfoHash: Hash;
  orderId: string;
  store: PaymentStore;
}) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash: args.hash, confirmations: 2 });
  if (receipt.status !== "success") throw new Error("Payment transaction reverted");
  const events = parseEventLogs({
    abi: authCaptureEscrowAbi,
    logs: receipt.logs.filter(
      (log) => log.address.toLowerCase() === AUTH_CAPTURE_ESCROW.toLowerCase(),
    ),
    strict: true,
  });
  const settlement = events.find(
    (event) =>
      (event.eventName === "PaymentCharged" || event.eventName === "PaymentCaptured") &&
      event.args.paymentInfoHash === args.paymentInfoHash,
  );
  if (!settlement) throw new Error("Expected protocol settlement was not found");
  if (!(await args.store.claimOnce(args.paymentInfoHash, args.orderId))) {
    throw new Error("Payment was already used");
  }
  return settlement;
}
// docs:end verify-token-payment-ts
