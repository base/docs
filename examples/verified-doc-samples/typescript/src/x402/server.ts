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
const facilitator = new HTTPFacilitatorClient({
  url: process.env.FACILITATOR_URL ?? "https://x402.org/facilitator",
});
const authorizer = privateKeyToAccount(required("RECEIVER_AUTHORIZER_PRIVATE_KEY") as `0x${string}`);
const receiverAuthorizerSigner: AuthorizerSigner = {
  address: authorizer.address,
  signTypedData: (parameters) => authorizer.signTypedData(parameters as never),
};
const batch = new BatchSettlementEvmScheme(payTo, {
  receiverAuthorizerSigner,
  withdrawDelay: 86_400,
  storage: new FileChannelStorage({ directory: "./channels" }),
});
const resourceServer = new x402ResourceServer(facilitator)
  .register(network, new ExactEvmScheme())
  .register(network, new UptoEvmScheme())
  .register(network, batch);

batch.createChannelManager(facilitator, network).start({
  claimIntervalSecs: 60,
  settleIntervalSecs: 300,
  refundIntervalSecs: 3600,
  maxClaimsPerBatch: 100,
});

// docs:start x402-exact-ts
app.use(paymentMiddleware({
  "GET /fixed": {
    accepts: [{ scheme: "exact", price: "$0.01", network, payTo }],
    description: "Fixed-price market report",
    mimeType: "application/json",
  },
}, resourceServer));
app.get("/fixed", (_request, response) => response.json({ report: "Base market summary" }));
// docs:end x402-exact-ts

// docs:start x402-upto-ts
app.use(paymentMiddleware({
  "GET /metered": {
    accepts: [{ scheme: "upto", price: "$0.10", network, payTo }],
    description: "Usage-priced inference",
    mimeType: "application/json",
  },
}, resourceServer));
app.get("/metered", (_request, response) => {
  setSettlementOverrides(response, { amount: "$0.04" });
  response.json({ tokens: 812, result: "Generated response" });
});
// docs:end x402-upto-ts

// docs:start x402-batch-ts
app.use(paymentMiddleware({
  "GET /stream": {
    accepts: [{ scheme: "batch-settlement", price: "$0.01", network, payTo }],
    description: "High-frequency price tick",
    mimeType: "application/json",
  },
}, resourceServer));
app.get("/stream", (_request, response) => {
  setSettlementOverrides(response, { amount: "50%" });
  response.json({ asset: "ETH", price: "3200.00" });
});
// docs:end x402-batch-ts

app.listen(4021, () => console.log("x402 server listening on http://localhost:4021"));
