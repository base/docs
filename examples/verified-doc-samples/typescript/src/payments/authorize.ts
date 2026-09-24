import { type Address } from "viem";
import { account, publicClient, walletClient } from "../shared/clients.js";
import { prepareErc3009Payment } from "./from-humans.js";
import { AUTH_CAPTURE_ESCROW, ERC3009_PAYMENT_COLLECTOR, authCaptureEscrowAbi } from "./protocol.js";

// docs:start usdc-authorize-ts
export async function authorizePayment(
  merchant: Address,
  orderId: string,
  amount: string,
) {
  const payment = await prepareErc3009Payment(merchant, orderId, amount);
  const simulation = await publicClient.simulateContract({
    account,
    address: AUTH_CAPTURE_ESCROW,
    abi: authCaptureEscrowAbi,
    functionName: "authorize",
    args: [
      payment.paymentInfo,
      payment.paymentInfo.maxAmount,
      ERC3009_PAYMENT_COLLECTOR,
      payment.collectorData,
    ],
  });
  const hash = await walletClient.writeContract(simulation.request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 2 });
  if (receipt.status !== "success") throw new Error("Payment authorization reverted");
  return { ...payment, authorizationHash: hash };
}
// docs:end usdc-authorize-ts
