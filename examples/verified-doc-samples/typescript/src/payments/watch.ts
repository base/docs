import { createPublicClient, parseAbiItem, webSocket, type Address, type Log } from "viem";
import { base } from "viem/chains";
import { required } from "../shared/env.js";

const transferEvent = parseAbiItem("event Transfer(address indexed from,address indexed to,uint256 amount)");
const confirmations = 12n;

type TransferLog = Log<bigint, number, false, typeof transferEvent>;

export interface PaymentEventStore {
  lastScannedBlock(): Promise<bigint | undefined>;
  replaceRange(fromBlock: bigint, toBlock: bigint, logs: TransferLog[]): Promise<void>;
}

const client = createPublicClient({
  chain: base,
  transport: webSocket(required("WS_RPC_URL")),
});

// docs:start watch-payments-ts
export async function watchPayments(
  token: Address,
  merchant: Address,
  startBlock: bigint,
  store: PaymentEventStore,
) {
  async function backfillConfirmed() {
    const head = await client.getBlockNumber();
    if (head <= confirmations) return;
    const toBlock = head - confirmations;
    const cursor = await store.lastScannedBlock();
    const fromBlock = cursor && cursor > startBlock + confirmations
      ? cursor - confirmations
      : startBlock;
    const logs = await client.getLogs({
      address: token,
      event: transferEvent,
      args: { to: merchant },
      fromBlock,
      toBlock,
      strict: true,
    });

    // In one database transaction, replace this overlap window and advance the cursor.
    // Key each row by (blockHash, transactionHash, logIndex) so retries stay idempotent.
    await store.replaceRange(fromBlock, toBlock, logs);
  }

  await backfillConfirmed();
  return client.watchEvent({
    address: token,
    event: transferEvent,
    args: { to: merchant },
    onLogs: backfillConfirmed,
    onError: (error) => console.error("Payment watcher failed", error),
  });
}
// docs:end watch-payments-ts
