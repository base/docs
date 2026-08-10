import express from "express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { UptoEvmScheme } from "@x402/evm/upto/server";
import { BatchSettlementEvmScheme, type AuthorizerSigner } from "@x402/evm/batch-settlement/server";
import { FileChannelStorage } from "@x402/evm/batch-settlement/server/file-storage";
import { paymentMiddleware, setSettlementOverrides, x402ResourceServer } from "@x402/express";
import { privateKeyToAccount } from "viem/accounts";
import { required } from "../shared/env.js";

const app = express();
const network = "eip155:84532" as const;
const payTo = required("PAY_TO") as `0x${string}`;
const asset = required("X402_ASSET") as `0x${string}`;
const facilitator = new HTTPFacilitatorClient({ url: "https://x402.org/facilitator" });
const authorizer = privateKeyToAccount(required("RECEIVER_AUTHORIZER_PRIVATE_KEY") as `0x${string}`);
const receiverAuthorizerSigner: AuthorizerSigner = {
  address: authorizer.address,
  signTypedData: (parameters) => authorizer.signTypedData(parameters as never),
};
const batch = new BatchSettlementEvmScheme(payTo, {
  receiverAuthorizerSigner,
  withdrawDelay: 86_400,
  storage: new FileChannelStorage({ directory: process.env.CHANNEL_DIR ?? "/tmp/base-docs-x402-channels" }),
});
const server = new x402ResourceServer(facilitator)
  .register(network, new ExactEvmScheme())
  .register(network, new UptoEvmScheme())
  .register(network, batch);

batch.createChannelManager(facilitator, network).start({
  claimIntervalSecs: 2,
  settleIntervalSecs: 3,
  refundIntervalSecs: 60,
  maxClaimsPerBatch: 100,
});

const extra = { name: "Merchant USD", version: "1", assetTransferMethod: "permit2" };
app.use(paymentMiddleware({
  "GET /fixed": { accepts: [{ scheme: "exact", price: { amount: "10000", asset, extra }, network, payTo }] },
  "GET /metered": { accepts: [{ scheme: "upto", price: { amount: "100000", asset, extra }, network, payTo }] },
  "GET /stream": { accepts: [{ scheme: "batch-settlement", price: { amount: "10000", asset, extra }, network, payTo }] },
}, server));

app.get("/fixed", (_req, res) => res.json({ scheme: "exact" }));
app.get("/metered", (_req, res) => {
  setSettlementOverrides(res, { amount: "40000" });
  res.json({ scheme: "upto" });
});
app.get("/stream", (_req, res) => {
  setSettlementOverrides(res, { amount: "50%" });
  res.json({ scheme: "batch-settlement" });
});

app.listen(4021, () => console.log("live x402 server ready"));
