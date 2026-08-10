import { base as browserBase } from "@base-org/account";
import { base as serverBase } from "@base-org/account/node";
import type { Address } from "viem";

// docs:start subscribe-ts
export async function subscribe(owner: Address) {
  const subscription = await browserBase.subscription.subscribe({
    recurringCharge: "29.99",
    subscriptionOwner: owner,
    periodInDays: 30,
    testnet: true,
  });
  await fetch("/api/subscriptions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: subscription.id, payer: subscription.subscriptionPayer }),
  });
  return subscription.id;
}
// docs:end subscribe-ts

// docs:start charge-subscription-ts
export async function chargeSubscription(id: `0x${string}`, merchant: Address) {
  const status = await serverBase.subscription.getStatus({ id, testnet: true });
  if (!status.isSubscribed) throw new Error("Subscription is no longer active");
  if (Number(status.remainingChargeInPeriod ?? "0") <= 0) return { charged: false };
  const result = await serverBase.subscription.charge({
    id,
    amount: "max-remaining-charge",
    recipient: merchant,
    testnet: true,
    paymasterUrl: process.env.PAYMASTER_URL,
  });
  return { charged: true, transactionHash: result.id };
}
// docs:end charge-subscription-ts
