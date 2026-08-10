import { getPaymentStatus } from "@base-org/account";
import { createPublicClient, http, parseAbi, parseEventLogs, parseUnits, type Address, type Hash } from "viem";
import { baseSepolia } from "viem/chains";

const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
const tokenEvents = parseAbi([
  "event Transfer(address indexed from,address indexed to,uint256 amount)",
  "event Memo(address indexed caller,bytes32 indexed memo)",
]);

export interface PaymentStore {
  claimOnce(id: string, orderId: string): Promise<boolean>;
}

// docs:start verify-base-pay-ts
export async function verifyBasePay(args: {
  id: Hash;
  payer: Address;
  merchant: Address;
  amount: string;
  orderId: string;
  store: PaymentStore;
}) {
  const payment = await getPaymentStatus({ id: args.id, testnet: true });
  if (payment.status !== "completed") throw new Error("Payment is not complete");
  if (payment.sender?.toLowerCase() !== args.payer.toLowerCase()) throw new Error("Wrong sender");
  if (payment.recipient?.toLowerCase() !== args.merchant.toLowerCase()) throw new Error("Wrong recipient");
  if (payment.amount !== args.amount) throw new Error("Wrong amount");
  if (!(await args.store.claimOnce(args.id, args.orderId))) throw new Error("Payment already used");
}
// docs:end verify-base-pay-ts

// docs:start verify-token-payment-ts
export async function verifyTokenPayment(args: {
  hash: Hash;
  token: Address;
  payer: Address;
  merchant: Address;
  amount: string;
  memo?: `0x${string}`;
  orderId: string;
  store: PaymentStore;
}) {
  const receipt = await publicClient.getTransactionReceipt({ hash: args.hash });
  if (receipt.status !== "success") throw new Error("Transaction reverted");
  const transfers = parseEventLogs({ abi: tokenEvents, eventName: "Transfer", logs: receipt.logs, strict: true });
  const transfer = transfers.find((log) => log.address.toLowerCase() === args.token.toLowerCase());
  if (!transfer || transfer.args.from.toLowerCase() !== args.payer.toLowerCase()) throw new Error("Wrong sender");
  if (transfer.args.to.toLowerCase() !== args.merchant.toLowerCase()) throw new Error("Wrong recipient");
  if (transfer.args.amount !== parseUnits(args.amount, 6)) throw new Error("Wrong amount");
  const memos = parseEventLogs({ abi: tokenEvents, eventName: "Memo", logs: receipt.logs, strict: true });
  if (args.memo && !memos.some((log) => log.args.memo === args.memo)) throw new Error("Wrong memo");
  if (!(await args.store.claimOnce(args.hash, args.orderId))) throw new Error("Payment already used");
}
// docs:end verify-token-payment-ts
