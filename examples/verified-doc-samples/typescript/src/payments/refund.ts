import { parseAbi, parseEventLogs, stringToHex, type Address, type Hash } from "viem";
import { account, publicClient, walletClient } from "../shared/clients.js";

const refundableTokenAbi = parseAbi([
  "function transferWithMemo(address,uint256,bytes32) returns (bool)",
  "event Transfer(address indexed from,address indexed to,uint256 amount)",
]);

export interface RefundLedger {
  captureHash(orderId: string): Promise<Hash>;
  reserveOnce(orderId: string, refundId: string, amount: bigint): Promise<boolean>;
  complete(refundId: string, hash: Hash): Promise<void>;
}

// docs:start refund-payment-ts
export async function refundPayment(args: {
  token: Address;
  captureHash: Hash;
  orderId: string;
  refundId: string;
  amount: bigint;
  ledger: RefundLedger;
}) {
  if ((await args.ledger.captureHash(args.orderId)) !== args.captureHash) {
    throw new Error("Capture hash does not belong to this order");
  }
  const capture = await publicClient.waitForTransactionReceipt({ hash: args.captureHash, confirmations: 2 });
  if (capture.status !== "success") throw new Error("Original payment reverted");
  const transfers = parseEventLogs({
    abi: refundableTokenAbi,
    eventName: "Transfer",
    logs: capture.logs,
    strict: true,
  });
  const payment = transfers.find(
    (log) =>
      log.address.toLowerCase() === args.token.toLowerCase() &&
      log.args.to.toLowerCase() === account.address.toLowerCase(),
  );
  if (!payment) throw new Error("Original payment to this merchant was not found");
  if (!(await args.ledger.reserveOnce(args.orderId, args.refundId, args.amount))) {
    throw new Error("Refund is duplicated or exceeds the refundable balance");
  }

  const simulation = await publicClient.simulateContract({
    account,
    address: args.token,
    abi: refundableTokenAbi,
    functionName: "transferWithMemo",
    args: [payment.args.from, args.amount, stringToHex(args.orderId, { size: 32 })],
  });
  const hash = await walletClient.writeContract(simulation.request);
  await publicClient.waitForTransactionReceipt({ hash, confirmations: 2 });
  await args.ledger.complete(args.refundId, hash);
  return hash;
}
// docs:end refund-payment-ts
