import { x402Client } from "@x402/core/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { toClientEvmSigner } from "@x402/evm";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { UptoEvmScheme } from "@x402/evm/upto/client";
import { BatchSettlementEvmScheme } from "@x402/evm/batch-settlement/client";
import { createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { required } from "../shared/env.js";

// docs:start x402-buyer-ts
const account = privateKeyToAccount(required("EVM_PRIVATE_KEY") as `0x${string}`);
const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
const client = new x402Client()
  .register("eip155:*", new ExactEvmScheme(account))
  .register("eip155:*", new UptoEvmScheme(account))
  .register("eip155:*", new BatchSettlementEvmScheme(toClientEvmSigner(account, publicClient)));

const baseSepoliaUsdc = "0x036CbD53842c5426634e7929541eC2318f3dCF7c";
let authorizedThisSession = 0n;
client.onBeforePaymentCreation(async ({ selectedRequirements }) => {
  if (selectedRequirements.network !== "eip155:84532") return { abort: true, reason: "Wrong network" };
  if (selectedRequirements.asset.toLowerCase() !== baseSepoliaUsdc.toLowerCase()) return { abort: true, reason: "Wrong asset" };
  const amount = BigInt(selectedRequirements.amount);
  if (amount > 100_000n || authorizedThisSession + amount > 1_000_000n) {
    return { abort: true, reason: "Spend limit exceeded" };
  }
  authorizedThisSession += amount;
});

const fetchWithPayment = wrapFetchWithPayment(fetch, client);
const response = await fetchWithPayment("http://localhost:4021/fixed");
if (!response.ok) throw new Error(`Paid request failed: ${response.status}`);
console.log(await response.json());
// docs:end x402-buyer-ts
