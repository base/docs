// Read-only end-to-end check of the live PaymentsDemo flows against Vibenet.
//
// Uses eth_simulateV1, so nothing is signed or broadcast. From one unfunded
// address that plays payer and operator, it mints Vibenet's existing USDV
// (permissionless mint(address,uint256)) the same way the live demo does, then
// runs pre-approve → authorize → partial capture → void, and pre-approve →
// charge → fresh USDV liquidity → refund, using
// the exact calldata encoders and receipt checks from PaymentsDemo.jsx.
//
//   node scripts/simulate-payments-vibenet.mjs
import assert from "node:assert/strict";

import { loadProtocol } from "./lib/payments-protocol.mjs";

const API = "https://api.vibes.base.org/api/vibenet";
const RPC = `${API}/account/rpc`;
const P = await loadProtocol();

async function api(path) {
  const response = await fetch(`${API}${path}`, { signal: AbortSignal.timeout(20_000) });
  assert.ok(response.ok, `${path} returned ${response.status}`);
  return response.json();
}

async function rpc(method, params = []) {
  const response = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
    signal: AbortSignal.timeout(20_000),
  });
  const body = await response.json();
  if (body.error) throw Object.assign(new Error(body.error.message), { data: body.error.data });
  return body.result;
}
const call = (to, data) => rpc("eth_call", [{ to, data }, "latest"]);

const randomHex = (bytes) => `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString("hex")}`;
const units = (whole) => BigInt(whole) * 1_000_000n;
const actor = randomHex(20);
const receiver = randomHex(20);

// ---- Preconditions (plain eth_call / eth_getCode) ----
assert.equal(BigInt(await rpc("eth_chainId")), 84538453n, "Vibenet chain id");
for (const address of [P.ESCROW, P.PRE_APPROVAL_COLLECTOR, P.REFUND_COLLECTOR]) {
  assert.notEqual(await rpc("eth_getCode", [address, "latest"]), "0x", `${address} has code`);
}
assert.ok(P.same(P.decode.address(await call(P.PRE_APPROVAL_COLLECTOR, P.encode.authCaptureEscrow())), P.ESCROW));
assert.ok(P.same(P.decode.address(await call(P.REFUND_COLLECTOR, P.encode.authCaptureEscrow())), P.ESCROW));
assert.equal(P.decode.uint(await call(P.PRE_APPROVAL_COLLECTOR, P.encode.collectorType())), 0n);
assert.equal(P.decode.uint(await call(P.REFUND_COLLECTOR, P.encode.collectorType())), 1n);
console.log("ok  v1.1 escrow and collectors are deployed and wired on Vibenet");

// ---- Vibenet USDV, discovered at runtime exactly like the live demo ----
const [deployment, faucet] = await Promise.all([api("/contracts"), api("/faucet/status")]);
const token = deployment.usdv;
assert.match(token ?? "", /^0x[0-9a-fA-F]{40}$/, "/contracts lists usdv");
assert.ok(P.same(faucet.usdv_address, token), `faucet status USDV ${faucet.usdv_address} matches /contracts ${token}`);
assert.equal(BigInt(faucet.chain_id), 84538453n, "faucet chain id");
assert.notEqual(await rpc("eth_getCode", [token, "latest"]), "0x", "USDV has code");
assert.equal(P.decode.uint(await call(token, P.encode.decimals())), 6n, "USDV decimals");
assert.equal(P.decode.string(await call(token, P.encode.symbol())), "USDV", "USDV symbol");
console.log(`ok  USDV ${token}: code, 6 decimals, symbol USDV, faucet status agrees`);

// ---- Payments. getHash is read from the escrow, never computed locally. ----
const latest = await rpc("eth_getBlockByNumber", ["latest", false]);
const salt = () => BigInt(randomHex(32));
const terms = (maxAmount, authorizationSeconds) => P.buildPaymentInfo({
  operator: actor, payer: actor, receiver, token, maxAmount, now: BigInt(latest.timestamp), authorizationSeconds, salt: salt(),
});
const auth = terms(units(100));
const sale = terms(units(5));
const authHash = P.decode.bytes32(await call(P.ESCROW, P.encode.getHash(auth)));
const saleHash = P.decode.bytes32(await call(P.ESCROW, P.encode.getHash(sale)));
assert.notEqual(authHash, saleHash);
const store = P.decode.address(await call(P.ESCROW, P.encode.getTokenStore(actor)));

const steps = [
  ["mint USDV 105", token, P.encode.mint(actor, units(105))],
  ["approve collector 100", token, P.encode.approve(P.PRE_APPROVAL_COLLECTOR, units(100))],
  ["preApprove", P.PRE_APPROVAL_COLLECTOR, P.encode.preApprove(auth)],
  ["authorize 100", P.ESCROW, P.encode.authorize(auth, units(100), P.PRE_APPROVAL_COLLECTOR)],
  ["state after authorize", P.ESCROW, P.encode.paymentState(authHash)],
  ["capture 64", P.ESCROW, P.encode.capture(auth, units(64), 0n, P.ZERO_ADDRESS)],
  ["state after capture", P.ESCROW, P.encode.paymentState(authHash)],
  ["void", P.ESCROW, P.encode.void(auth)],
  ["state after void", P.ESCROW, P.encode.paymentState(authHash)],
  ["capture after void", P.ESCROW, P.encode.capture(auth, 1n, 0n, P.ZERO_ADDRESS)],
  ["approve collector 5", token, P.encode.approve(P.PRE_APPROVAL_COLLECTOR, units(5))],
  ["preApprove sale", P.PRE_APPROVAL_COLLECTOR, P.encode.preApprove(sale)],
  ["charge 5", P.ESCROW, P.encode.charge(sale, units(5), P.PRE_APPROVAL_COLLECTOR, 0n, P.ZERO_ADDRESS)],
  ["state after charge", P.ESCROW, P.encode.paymentState(saleHash)],
  ["mint refund liquidity 2", token, P.encode.mint(actor, units(2))],
  ["approve refund collector 2", token, P.encode.approve(P.REFUND_COLLECTOR, units(2))],
  ["refund 2", P.ESCROW, P.encode.refund(sale, units(2), P.REFUND_COLLECTOR)],
  ["state after refund", P.ESCROW, P.encode.paymentState(saleHash)],
  ["refund allowance", token, P.encode.allowance(actor, P.REFUND_COLLECTOR)],
  ["merchant balance", token, P.encode.balanceOf(receiver)],
  ["payer balance", token, P.encode.balanceOf(actor)],
];
const simulated = await rpc("eth_simulateV1", [{
  blockStateCalls: [{ calls: steps.map(([, to, data]) => ({ from: actor, to, data, gas: "0x2dc6c0" })) }],
  validation: false,
}, "latest"]);
const results = simulated[0].calls;
const byName = Object.fromEntries(steps.map(([name], index) => [name, results[index]]));
const receipt = (name) => ({ logs: byName[name].logs });

for (const [name] of steps) {
  const expectedFailure = name === "capture after void";
  const succeeded = byName[name].status === "0x1";
  assert.equal(succeeded, !expectedFailure, `${name}: status ${byName[name].status} ${byName[name].error?.message ?? ""}`);
}
console.log(`ok  ${steps.length} simulated calls from ${actor} on USDV ${token}`);

assert.equal(P.transferred(receipt("mint USDV 105"), token, P.ZERO_ADDRESS, actor), units(105), "permissionless mint emits Transfer from 0x0");
assert.equal(P.transferred(receipt("mint refund liquidity 2"), token, P.ZERO_ADDRESS, actor), units(2), "refund liquidity mint emits Transfer from 0x0");
console.log("ok  permissionless USDV mint from an arbitrary address: Transfer 0x0 → actor");

assert.ok(P.findLog(receipt("preApprove"), P.PRE_APPROVAL_COLLECTOR, P.TOPICS.PaymentPreApproved, authHash));
assert.ok(P.findLog(receipt("approve collector 100"), token, P.TOPICS.Approval, P.addressTopic(actor)), "USDV emits ERC-20 Approval");
const authorized = P.escrowEvent(receipt("authorize 100"), "PaymentAuthorized", authHash, auth);
assert.equal(authorized.amount, units(100));
assert.equal(P.transferred(receipt("authorize 100"), token, actor, store), units(100), "collector pulled via transferFrom");
assert.deepEqual(P.decode.paymentState(byName["state after authorize"].returnData), { hasCollectedPayment: true, capturableAmount: units(100), refundableAmount: 0n });
console.log("ok  preApprove + authorize: PaymentAuthorized 100, capturable 100");

assert.equal(P.escrowEvent(receipt("capture 64"), "PaymentCaptured", authHash).amount, units(64));
assert.equal(P.transferred(receipt("capture 64"), token, store, receiver), units(64));
assert.deepEqual(P.decode.paymentState(byName["state after capture"].returnData), { hasCollectedPayment: true, capturableAmount: units(36), refundableAmount: units(64) });
console.log("ok  partial capture: PaymentCaptured 64, capturable 36, refundable 64");

assert.equal(P.escrowEvent(receipt("void"), "PaymentVoided", authHash).amount, units(36));
assert.equal(P.transferred(receipt("void"), token, store, actor), units(36));
assert.deepEqual(P.decode.paymentState(byName["state after void"].returnData), { hasCollectedPayment: true, capturableAmount: 0n, refundableAmount: units(64) });
const afterVoid = byName["capture after void"];
const afterVoidData = afterVoid.error?.data || afterVoid.returnData;
assert.equal(P.revertName(afterVoidData), "InsufficientAuthorization", `capture after void reverts: ${JSON.stringify(afterVoid.error ?? afterVoidData)}`);
console.log("ok  void: PaymentVoided 36, later capture reverts InsufficientAuthorization");

const charged = P.escrowEvent(receipt("charge 5"), "PaymentCharged", saleHash, sale);
assert.equal(charged.amount, units(5));
assert.equal(charged.feeAmount, 0n);
assert.deepEqual(P.decode.paymentState(byName["state after charge"].returnData), { hasCollectedPayment: true, capturableAmount: 0n, refundableAmount: units(5) });
console.log("ok  charge: PaymentCharged 5, refundable 5");

const refunded = P.escrowEvent(receipt("refund 2"), "PaymentRefunded", saleHash);
assert.equal(refunded.amount, units(2));
assert.ok(P.same(refunded.tokenCollector, P.REFUND_COLLECTOR));
assert.equal(P.transferred(receipt("refund 2"), token, actor, store), units(2));
assert.equal(P.transferred(receipt("refund 2"), token, store, actor), units(2));
assert.deepEqual(P.decode.paymentState(byName["state after refund"].returnData), { hasCollectedPayment: true, capturableAmount: 0n, refundableAmount: units(3) });
assert.equal(P.decode.uint(byName["refund allowance"].returnData), 0n);
console.log("ok  refund: PaymentRefunded 2 via OperatorRefundCollector, refundable 3");

assert.equal(P.decode.uint(byName["merchant balance"].returnData), units(69));
// 105 minted - 100 authorized + 36 voided - 5 charged + 2 liquidity - 2 pulled + 2 refunded
assert.equal(P.decode.uint(byName["payer balance"].returnData), units(38));
console.log("ok  balances: merchant 69, payer 38");
