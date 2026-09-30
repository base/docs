import { createPublicClient, webSocket } from "viem";
import { base } from "viem/chains";
import { required } from "../shared/env.js";
import { AUTH_CAPTURE_ESCROW, authCaptureEscrowAbi } from "./protocol.js";

const confirmations = 12n;

export interface PaymentEventStore {
  lastScannedBlock(): Promise<bigint | undefined>;
  replaceRange(fromBlock: bigint, toBlock: bigint, logs: readonly unknown[]): Promise<void>;
}

const client = createPublicClient({
  chain: base,
  transport: webSocket(required("WS_RPC_URL")),
});

// docs:start watch-payments-ts
export async function watchPayments(
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
    const logs = await client.getContractEvents({
      address: AUTH_CAPTURE_ESCROW,
      abi: authCaptureEscrowAbi,
      fromBlock,
      toBlock,
      strict: true,
    });

    // Replace the overlap and advance the cursor in one database transaction.
    await store.replaceRange(fromBlock, toBlock, logs);
  }

  await backfillConfirmed();
  return client.watchContractEvent({
    address: AUTH_CAPTURE_ESCROW,
    abi: authCaptureEscrowAbi,
    onLogs: backfillConfirmed,
    onError: (error) => console.error("Payment watcher failed", error),
  });
}
// docs:end watch-payments-ts
