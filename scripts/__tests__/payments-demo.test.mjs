// Static checks for docs/snippets/PaymentsDemo.jsx. Offline: no network access.
// The hand-rolled Commerce Payments Protocol encoders are compared against viem
// (re-exported by the vendored AA bundle) so a wrong selector, tuple layout, or
// dynamic-bytes offset fails here instead of on Vibenet.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { extractProtocolBlock, loadProtocol, loadViem, readSnippet } from "../lib/payments-protocol.mjs";

const root = new URL("../../", import.meta.url);
const snippet = await readSnippet();
const P = await loadProtocol();
const viem = await loadViem();
const { encodeFunctionData, encodeAbiParameters, keccak256, toHex } = viem;

const PAYMENT_INFO = {
  type: "tuple",
  components: [
    { name: "operator", type: "address" },
    { name: "payer", type: "address" },
    { name: "receiver", type: "address" },
    { name: "token", type: "address" },
    { name: "maxAmount", type: "uint120" },
    { name: "preApprovalExpiry", type: "uint48" },
    { name: "authorizationExpiry", type: "uint48" },
    { name: "refundExpiry", type: "uint48" },
    { name: "minFeeBps", type: "uint16" },
    { name: "maxFeeBps", type: "uint16" },
    { name: "feeReceiver", type: "address" },
    { name: "salt", type: "uint256" },
  ],
};
const fn = (name, inputs, outputs = []) => ({ type: "function", name, stateMutability: "nonpayable", inputs, outputs });
const abi = [
  fn("getHash", [PAYMENT_INFO], [{ type: "bytes32" }]),
  fn("paymentState", [{ type: "bytes32" }], [{ type: "bool" }, { type: "uint120" }, { type: "uint120" }]),
  fn("getTokenStore", [{ type: "address" }], [{ type: "address" }]),
  fn("authorize", [PAYMENT_INFO, { type: "uint256" }, { type: "address" }, { type: "bytes" }]),
  fn("charge", [PAYMENT_INFO, { type: "uint256" }, { type: "address" }, { type: "bytes" }, { type: "uint256" }, { type: "address" }]),
  fn("capture", [PAYMENT_INFO, { type: "uint256" }, { type: "uint256" }, { type: "address" }]),
  fn("void", [PAYMENT_INFO]),
  fn("refund", [PAYMENT_INFO, { type: "uint256" }, { type: "address" }, { type: "bytes" }]),
  fn("preApprove", [PAYMENT_INFO]),
  fn("isPreApproved", [{ type: "bytes32" }], [{ type: "bool" }]),
  fn("authCaptureEscrow", [], [{ type: "address" }]),
  fn("collectorType", [], [{ type: "uint8" }]),
  fn("approve", [{ type: "address" }, { type: "uint256" }], [{ type: "bool" }]),
  fn("allowance", [{ type: "address" }, { type: "address" }], [{ type: "uint256" }]),
  fn("balanceOf", [{ type: "address" }], [{ type: "uint256" }]),
  fn("mint", [{ type: "address" }, { type: "uint256" }]),
];
const enc = (functionName, args = []) => encodeFunctionData({ abi, functionName, args });
const PI_TYPES = "(address,address,address,address,uint120,uint48,uint48,uint48,uint16,uint16,address,uint256)";

const operator = "0x1111111111111111111111111111111111111111";
const receiver = "0x2222222222222222222222222222222222222222";
const token = "0x3333333333333333333333333333333333333333";
const store = "0x4444444444444444444444444444444444444444";
const info = P.buildPaymentInfo({
  operator,
  payer: operator,
  receiver,
  token,
  maxAmount: 25_000_000n,
  now: 1_790_000_000n,
  authorizationSeconds: 3 * 86_400,
  salt: (1n << 255n) + 12345n,
});
const tuple = { ...info };
const hash = `0x${"ab".repeat(32)}`;

test("snippet stays Mintlify-compatible and reuses the shared engine loader", () => {
  assert.doesNotMatch(snippet, /^\s*import\s/m, "Mintlify snippets must not contain imports");
  assert.match(snippet, /fetchText\("\/static\/aa\.txt"\)/);
  assert.match(snippet, /fetchText\("\/static\/vibenet-engine\.txt\?v=4"\)/);
  assert.match(snippet, /replace\('"\.\/aa\.txt"'/);
  assert.match(snippet, /window\.__baseDocsVibenetEngineV3/);
});

test("protocol block is pure JavaScript", () => {
  const block = extractProtocolBlock(snippet);
  assert.doesNotMatch(block, /<[A-Za-z]/, "no JSX in the protocol block");
  assert.doesNotMatch(block, /\b(window|document|fetch|useState|useEffect|localStorage)\b/);
});

test("deployment addresses are the supplied Commerce Payments v1.1 contracts", () => {
  assert.equal(P.ESCROW, "0xf96815976523E00e65Be8f34cA5e64b4f41EB19c");
  assert.equal(P.PRE_APPROVAL_COLLECTOR, "0xF1F9C408C787B2bC6CAEB91e5BbEc434a5c8d2Ea");
  assert.equal(P.REFUND_COLLECTOR, "0x7a03443724d14798c4AB4622F1DAAcA761Fea486");
});

test("PaymentInfo terms: ordered expiries, zero fee bounds, fresh-salt friendly", () => {
  assert.ok(info.preApprovalExpiry < info.authorizationExpiry && info.authorizationExpiry < info.refundExpiry);
  assert.equal(info.preApprovalExpiry, 1_790_000_000n + 3_600n);
  assert.equal(info.authorizationExpiry, 1_790_000_000n + 3n * 86_400n);
  assert.equal(info.minFeeBps, 0n);
  assert.equal(info.maxFeeBps, 0n);
  assert.equal(info.feeReceiver, P.ZERO_ADDRESS);
  assert.throws(() => P.buildPaymentInfo({ ...info, now: 0n, authorizationSeconds: 10, preApprovalSeconds: 20, salt: 1n }), /ordered/);
  assert.throws(() => P.buildPaymentInfo({ ...info, now: 0n, maxAmount: 1n << 120n, salt: 1n }), /uint120/);
  assert.throws(() => P.paymentInfoWords({ ...info, maxFeeBps: 10_001n }), /fee bounds/);
  assert.throws(() => P.paymentInfoWords({ ...info, minFeeBps: 5n, maxFeeBps: 1n }), /fee bounds/);
  assert.throws(() => P.paymentInfoWords({ ...info, payer: "0x1234" }), /payer is not an address/);
});

test("escrow and collector calldata matches viem ABI encoding", () => {
  const pairs = [
    [P.encode.getHash(info), enc("getHash", [tuple])],
    [P.encode.paymentState(hash), enc("paymentState", [hash])],
    [P.encode.getTokenStore(operator), enc("getTokenStore", [operator])],
    [P.encode.preApprove(info), enc("preApprove", [tuple])],
    [P.encode.isPreApproved(hash), enc("isPreApproved", [hash])],
    [P.encode.authorize(info, 25_000_000n, P.PRE_APPROVAL_COLLECTOR), enc("authorize", [tuple, 25_000_000n, P.PRE_APPROVAL_COLLECTOR, "0x"])],
    [P.encode.charge(info, 5_000_000n, P.PRE_APPROVAL_COLLECTOR, 0n, P.ZERO_ADDRESS), enc("charge", [tuple, 5_000_000n, P.PRE_APPROVAL_COLLECTOR, "0x", 0n, P.ZERO_ADDRESS])],
    [P.encode.capture(info, 64_000_000n, 0n, P.ZERO_ADDRESS), enc("capture", [tuple, 64_000_000n, 0n, P.ZERO_ADDRESS])],
    [P.encode.void(info), enc("void", [tuple])],
    [P.encode.refund(info, 2_000_000n, P.REFUND_COLLECTOR), enc("refund", [tuple, 2_000_000n, P.REFUND_COLLECTOR, "0x"])],
    [P.encode.authCaptureEscrow(), enc("authCaptureEscrow")],
    [P.encode.collectorType(), enc("collectorType")],
    [P.encode.approve(P.PRE_APPROVAL_COLLECTOR, 25_000_000n), enc("approve", [P.PRE_APPROVAL_COLLECTOR, 25_000_000n])],
    [P.encode.allowance(operator, P.REFUND_COLLECTOR), enc("allowance", [operator, P.REFUND_COLLECTOR])],
    [P.encode.balanceOf(receiver), enc("balanceOf", [receiver])],
    [P.encode.mint(operator, 2_000_000n), enc("mint", [operator, 2_000_000n])],
  ];
  for (const [ours, reference] of pairs) assert.equal(ours, reference.toLowerCase());
});

test("event topics and error selectors match their Solidity signatures", () => {
  const topic = (signature) => keccak256(toHex(signature));
  assert.equal(P.TOPICS.PaymentCharged, topic(`PaymentCharged(bytes32,${PI_TYPES},uint256,address,uint256,address)`));
  assert.equal(P.TOPICS.PaymentAuthorized, topic(`PaymentAuthorized(bytes32,${PI_TYPES},uint256,address)`));
  assert.equal(P.TOPICS.PaymentCaptured, topic("PaymentCaptured(bytes32,uint256,uint256,address)"));
  assert.equal(P.TOPICS.PaymentVoided, topic("PaymentVoided(bytes32,uint256)"));
  assert.equal(P.TOPICS.PaymentRefunded, topic("PaymentRefunded(bytes32,uint256,address)"));
  assert.equal(P.TOPICS.PaymentPreApproved, topic("PaymentPreApproved(bytes32)"));
  assert.equal(P.TOPICS.Approval, topic("Approval(address,address,uint256)"));
  assert.equal(P.TOPICS.Transfer, topic("Transfer(address,address,uint256)"));
  const errors = {
    InsufficientAuthorization: "InsufficientAuthorization(bytes32,uint256,uint256)",
    ZeroAuthorization: "ZeroAuthorization(bytes32)",
    PaymentNotPreApproved: "PaymentNotPreApproved(bytes32)",
    PaymentAlreadyCollected: "PaymentAlreadyCollected(bytes32)",
    PaymentAlreadyPreApproved: "PaymentAlreadyPreApproved(bytes32)",
    RefundExceedsCapture: "RefundExceedsCapture(uint256,uint256)",
    AfterAuthorizationExpiry: "AfterAuthorizationExpiry(uint48,uint48)",
    InvalidSender: "InvalidSender(address,address)",
    TokenCollectionFailed: "TokenCollectionFailed()",
    InsufficientAllowance: "InsufficientAllowance(address,uint256,uint256)",
    InsufficientBalance: "InsufficientBalance(address,uint256,uint256)",
  };
  for (const [name, signature] of Object.entries(errors)) {
    assert.equal(P.ERRORS[topic(signature).slice(0, 10)], name, signature);
  }
  assert.equal(P.revertName(`${topic("InsufficientAuthorization(bytes32,uint256,uint256)").slice(0, 10)}${"00".repeat(96)}`), "InsufficientAuthorization");
  assert.equal(P.revertName("0xdeadbeef"), null);
});

test("return data decoders reject malformed shapes", () => {
  const state = encodeAbiParameters([{ type: "bool" }, { type: "uint120" }, { type: "uint120" }], [true, 36n, 64n]);
  assert.deepEqual(P.decode.paymentState(state), { hasCollectedPayment: true, capturableAmount: 36n, refundableAmount: 64n });
  assert.throws(() => P.decode.paymentState("0x"), /unexpected shape/);
  assert.equal(P.decode.address(encodeAbiParameters([{ type: "address" }], [P.ESCROW])), P.ESCROW.toLowerCase());
  assert.throws(() => P.decode.bool(encodeAbiParameters([{ type: "uint256" }], [2n])), /bool/);
  assert.throws(() => P.decode.bytes32("0x1234"), /bytes32/);
});

const escrowLog = (name, data, indexed = hash, address = P.ESCROW) => ({ address, topics: [P.TOPICS[name], indexed], data, logIndex: "0x3" });
const piData = (rest, restTypes) => encodeAbiParameters([PAYMENT_INFO, ...restTypes], [tuple, ...rest]);

test("escrow events are verified by address, topic, hash, terms, and shape", () => {
  const authorized = { logs: [escrowLog("PaymentAuthorized", piData([25_000_000n, P.PRE_APPROVAL_COLLECTOR], [{ type: "uint256" }, { type: "address" }]))] };
  const event = P.escrowEvent(authorized, "PaymentAuthorized", hash, info);
  assert.equal(event.amount, 25_000_000n);
  assert.equal(event.tokenCollector, P.PRE_APPROVAL_COLLECTOR.toLowerCase());
  assert.equal(event.logIndex, 3);

  const charged = { logs: [escrowLog("PaymentCharged", piData([5_000_000n, P.PRE_APPROVAL_COLLECTOR, 0n, P.ZERO_ADDRESS], [{ type: "uint256" }, { type: "address" }, { type: "uint256" }, { type: "address" }]))] };
  assert.equal(P.escrowEvent(charged, "PaymentCharged", hash, info).feeAmount, 0n);

  const captured = { logs: [escrowLog("PaymentCaptured", encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }, { type: "address" }], [64n, 0n, P.ZERO_ADDRESS]))] };
  assert.equal(P.escrowEvent(captured, "PaymentCaptured", hash).amount, 64n);

  // Wrong terms, wrong emitter, wrong hash, duplicates, and absence all fail.
  const otherTerms = { ...tuple, salt: 1n };
  const wrongTerms = { logs: [escrowLog("PaymentAuthorized", encodeAbiParameters([PAYMENT_INFO, { type: "uint256" }, { type: "address" }], [otherTerms, 1n, P.PRE_APPROVAL_COLLECTOR]))] };
  assert.throws(() => P.escrowEvent(wrongTerms, "PaymentAuthorized", hash, info), /different PaymentInfo/);
  const voided = escrowLog("PaymentVoided", encodeAbiParameters([{ type: "uint256" }], [25n]));
  assert.throws(() => P.escrowEvent({ logs: [{ ...voided, address: token }] }, "PaymentVoided", hash), /not in the receipt/);
  assert.throws(() => P.escrowEvent({ logs: [voided] }, "PaymentVoided", `0x${"cd".repeat(32)}`), /not in the receipt/);
  assert.throws(() => P.escrowEvent({ logs: [voided, voided] }, "PaymentVoided", hash), /not in the receipt/);
  assert.throws(() => P.escrowEvent({ logs: [] }, "PaymentRefunded", hash), /not in the receipt/);
  assert.throws(() => P.escrowEvent({ logs: [escrowLog("PaymentVoided", "0x")] }, "PaymentVoided", hash), /unexpected shape/);
});

test("refund Transfer legs are summed per direction", () => {
  const transfer = (from, to, value) => ({
    address: token,
    topics: [P.TOPICS.Transfer, P.addressTopic(from), P.addressTopic(to)],
    data: encodeAbiParameters([{ type: "uint256" }], [value]),
  });
  const receipt = { logs: [transfer(operator, store, 2n), transfer(store, operator, 2n), transfer(operator, receiver, 9n)] };
  assert.equal(P.transferred(receipt, token, operator, store), 2n);
  assert.equal(P.transferred(receipt, token, store, operator), 2n);
  assert.equal(P.transferred(receipt, receiver, operator, store), 0n);
});

test("live flows bootstrap themselves and never write on load", () => {
  const liveBlock = snippet.slice(snippet.indexOf("const LIVE_FLOWS = {"), snippet.indexOf("const [active, setActive]"));
  for (const key of ["accept", "authorize", "capture", "partial", "void", "refund"]) {
    const start = liveBlock.indexOf(`\n    ${key}: {`);
    assert.ok(start >= 0, `LIVE_FLOWS.${key} exists`);
    const firstStep = liveBlock.slice(start, liveBlock.indexOf("{ stage:", liveBlock.indexOf("{ stage:", start) + 1));
    assert.match(firstStep, /mintDemoToken|bootstrapAuthorization/, `${key} mints its own demo token in step 1`);
  }
  const effect = snippet.slice(snippet.indexOf("useEffect(() => {"), snippet.indexOf("}, []);"));
  assert.match(effect, /probePayments\(\)/);
  assert.doesNotMatch(effect, /sendCalls|createStablecoin|loadVibenetEngine|runLiveStep|runStep/);
  assert.equal((snippet.match(/engine\.sendCalls\(/g) || []).length, 1, "every write goes through send()");
});

test("a failed live step never falls back to a scripted mock step", () => {
  const live = snippet.slice(snippet.indexOf("const runLiveStep = async"), snippet.indexOf("const runStep = () =>"));
  assert.doesNotMatch(live, /runMockStep/);
  assert.match(live, /stepWrote/);
  assert.match(live, /setAborted\(true\)/);
  assert.match(snippet, /ctx\.stepWrote = true;\n\s*const tx = await engine\.sendCalls/);
  assert.match(snippet, /ctx\.stepWrote = true;\n\s*const created = await engine\.createStablecoin/);
});

// Evaluates the snippet's real beforeWrite/send/mintDemoToken source against a
// stub engine to prove that nothing new is initiated after unmount.
const loadWriteHelpers = () => {
  const slice = (start, end) => {
    const from = snippet.indexOf(start);
    const to = snippet.indexOf(end, from);
    assert.ok(from >= 0 && to > from, `snippet contains ${start}`);
    return snippet.slice(from, to);
  };
  const source = [
    slice("const beforeWrite = (ctx) =>", "  // Before every step after the first"),
    slice("const mintDemoToken = async", "  const newPayment = async"),
  ].join("\n");
  const expectBalance = async () => {};
  const ok = (...args) => args;
  const short = (v) => v;
  const show = () => "";
  const txHref = (h) => h;
  return new Function("expectBalance", "ok", "short", "show", "txHref", "TOKEN",
    `${source}\nreturn { beforeWrite, send, mintDemoToken };`)(expectBalance, ok, short, show, txHref, "dUSD");
};

test("unmounting stops the live step before its next transaction", async () => {
  const { send, mintDemoToken } = loadWriteHelpers();
  const calls = [];
  const receipt = { status: "0x1", phaseStatuses: ["0x1"] };
  const engine = {
    units: (w) => BigInt(w) * 1_000_000n,
    sendCalls: async (req) => { calls.push(["sendCalls", req.metadata]); return { hash: "0xaa", receipt }; },
    createStablecoin: async () => { calls.push(["createStablecoin"]); return { token, hash: "0xbb" }; },
  };
  let mountedNow = true;
  const ctx = { account: operator, isMounted: () => mountedNow };

  await mintDemoToken(engine, ctx, 5);
  await send(engine, ctx, [], "first");
  assert.deepEqual(calls, [["createStablecoin"], ["sendCalls", "first"]]);

  mountedNow = false;
  ctx.stepWrote = false;
  for (const attempt of [() => send(engine, ctx, [], "second"), () => mintDemoToken(engine, ctx, 5)]) {
    await assert.rejects(attempt, (error) => error.abort === true && error.unmounted === true && /no further transactions were sent/.test(error.message));
  }
  assert.equal(calls.length, 2, "no write is initiated after unmount");
  assert.equal(ctx.stepWrote, false, "a blocked write is not reported as attempted");
});

test("every write boundary checks the mount guard and unmount clears it", () => {
  assert.match(snippet, /beforeWrite\(ctx\);\n\s*ctx\.stepWrote = true;\n\s*const tx = await engine\.sendCalls/);
  assert.match(snippet, /beforeWrite\(ctx\);\n\s*ctx\.stepWrote = true;\n\s*const created = await engine\.createStablecoin/);
  assert.equal((snippet.match(/engine\.createStablecoin\(/g) || []).length, 1, "one createStablecoin call site");
  const effect = snippet.slice(snippet.indexOf("useEffect(() => {"), snippet.indexOf("}, []);"));
  assert.match(effect, /mounted\.current = true;/);
  assert.match(effect, /return \(\) => \{[^}]*mounted\.current = false;/);
  assert.match(snippet, /isMounted: \(\) => mounted\.current/);
  const live = snippet.slice(snippet.indexOf("const runLiveStep = async"), snippet.indexOf("const runStep = () =>"));
  assert.match(live, /catch \(error\) \{[\s\S]*?if \(!mounted\.current\) return;[\s\S]*?probePayments/, "no retry probe after unmount");
});

test("pages with live flows no longer claim to be mock only", async () => {
  const pages = {
    "request-a-payment.mdx": "accept",
    "authorize-a-payment.mdx": "authorize",
    "capture-an-authorization.mdx": "capture",
    "void-an-authorization.mdx": "void",
    "refund-a-payment.mdx": "refund",
  };
  for (const [page, key] of Object.entries(pages)) {
    const source = await readFile(new URL(`docs/build-on-base/accept-payments/${page}`, root), "utf8");
    assert.match(source, new RegExp(`<PaymentsDemo flow="${key}" />`));
    assert.doesNotMatch(source, /The demo above is mock only/, page);
    assert.match(source, /not USDC/, page);
  }
});
