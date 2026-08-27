import type { Abi, Hash } from "viem";
import { account, publicClient, walletClient } from "../shared/clients.js";

export async function sendContract(args: {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
}) {
  const simulation = await publicClient.simulateContract({
    account,
    ...args,
  } as never);
  const hash = await walletClient.writeContract(simulation.request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`Transaction ${hash} reverted`);
  // Public RPC traffic can be load-balanced across nodes at slightly different
  // heads. Wait one additional block before state-based verification reads.
  for (let attempt = 0; attempt < 30; attempt++) {
    if (await publicClient.getBlockNumber({ cacheTime: 0 }) > receipt.blockNumber) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  sentTransactionHashes.push(hash);
  return receipt;
}

export const sentTransactionHashes: Hash[] = [];
