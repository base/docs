import { pay } from "@base-org/account";
import type { Address } from "viem";

// docs:start collect-payer-info-ts
export async function checkoutWithPayerInfo(merchant: Address) {
  const payment = await pay({
    amount: "25.00",
    to: merchant,
    testnet: true,
    payerInfo: {
      requests: [{ type: "email" }, { type: "physicalAddress", optional: true }],
      callbackURL: "https://merchant.example/api/validate-payer",
    },
  });
  if (!payment.payerInfoResponses?.email) throw new Error("Required email was not returned");
  return payment;
}
// docs:end collect-payer-info-ts

// docs:start validate-payer-info-ts
export async function validatePayerInfo(request: Request) {
  const body = await request.json();
  const requestedInfo = body?.capabilities?.dataCallback?.requestedInfo;
  const email = requestedInfo?.email as string | undefined;
  if (!email || !email.includes("@")) {
    return Response.json({ errors: { email: "Enter a valid email address" } }, { status: 400 });
  }
  return Response.json({ request: body });
}
// docs:end validate-payer-info-ts
