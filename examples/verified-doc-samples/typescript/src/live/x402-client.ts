import { x402Client } from "@x402/core/client";
import { wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { toClientEvmSigner } from "@x402/evm";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { UptoEvmScheme } from "@x402/evm/upto/client";
import { BatchSettlementEvmScheme } from "@x402/evm/batch-settlement/client";
import { createPublicClient, createWalletClient, http, maxUint256, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { required } from "../shared/env.js";

const asset = required("X402_ASSET") as `0x${string}`;
const account = privateKeyToAccount(required("EVM_PRIVATE_KEY") as `0x${string}`);
const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http() });
const permit2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const approval = await publicClient.simulateContract({
  account,
  address: asset,
  abi: parseAbi(["function approve(address,uint256) returns (bool)"]),
  functionName: "approve",
  args: [permit2, maxUint256],
});
const approvalHash = await walletClient.writeContract(approval.request);
await publicClient.waitForTransactionReceipt({ hash: approvalHash });

const client = new x402Client()
  .register("eip155:*", new ExactEvmScheme(account))
  .register("eip155:*", new UptoEvmScheme(account))
  .register("eip155:*", new BatchSettlementEvmScheme(toClientEvmSigner(account, publicClient)));
client.onBeforePaymentCreation(async ({ selectedRequirements }) => {
  if (selectedRequirements.asset.toLowerCase() !== asset.toLowerCase()) return { abort: true, reason: "Wrong asset" };
  if (BigInt(selectedRequirements.amount) > 100_000n) return { abort: true, reason: "Over cap" };
});

const paidFetch = wrapFetchWithPayment(fetch, client);
const responseParser = new x402HTTPClient(client);
const results = [];
const routes = process.env.X402_ROUTES?.split(",") ?? ["fixed", "metered", "stream"];
for (const route of routes) {
  let response = await paidFetch(`http://127.0.0.1:4021/${route}`);
  // Batch settlement can return a corrective 402 while synchronizing channel
  // state. A fresh paid request recovers the channel and retries the voucher.
  for (let attempt = 0; response.status === 402 && attempt < 2; attempt++) {
    response = await paidFetch(`http://127.0.0.1:4021/${route}`);
  }
  if (!response.ok) {
    throw new Error(`${route} failed: ${response.status} ${JSON.stringify(Object.fromEntries(response.headers))} ${await response.text()}`);
  }
  const result = await responseParser.processResponse(response.clone());
  const entry = { route, body: await response.json(), paymentStatus: result.paymentStatus, payment: result.header };
  results.push(entry);
  console.error(JSON.stringify(entry));
}
console.log(JSON.stringify({ approvalHash, results }, null, 2));
