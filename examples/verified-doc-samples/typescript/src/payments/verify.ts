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
