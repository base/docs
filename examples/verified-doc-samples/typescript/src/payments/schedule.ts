import { zeroAddress, type Hex } from "viem";
import { account, publicClient, walletClient } from "../shared/clients.js";
import {
  AUTH_CAPTURE_ESCROW,
  SPEND_PERMISSION_PAYMENT_COLLECTOR,
  authCaptureEscrowAbi,
  type PaymentInfo,
} from "./protocol.js";

export interface BillingStore {
  reserveOnce(key: string): Promise<boolean>;
  complete(key: string, hash: Hex): Promise<void>;
}

// docs:start scheduled-charge-ts
export async function chargeSubscriptionPeriod(args: {
  paymentInfo: PaymentInfo;
  collectorData: Hex;
  billingKey: string;
  amount: bigint;
  store: BillingStore;
}) {
  if (!(await args.store.reserveOnce(args.billingKey))) {
    throw new Error("Billing period was already submitted");
  }
  const simulation = await publicClient.simulateContract({
    account,
    address: AUTH_CAPTURE_ESCROW,
    abi: authCaptureEscrowAbi,
    functionName: "charge",
    args: [
      args.paymentInfo,
      args.amount,
      SPEND_PERMISSION_PAYMENT_COLLECTOR,
      args.collectorData,
      0n,
      zeroAddress,
    ],
  });
  const hash = await walletClient.writeContract(simulation.request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 2 });
  if (receipt.status !== "success") throw new Error("Scheduled charge reverted");
  await args.store.complete(args.billingKey, hash);
  return receipt;
}
// docs:end scheduled-charge-ts
