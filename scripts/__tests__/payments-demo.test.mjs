// Static checks for docs/snippets/PaymentsDemo.jsx. Offline: no network access.
// The hand-rolled Commerce Payments Protocol encoders are compared against viem
// (re-exported by the vendored AA bundle) so a wrong selector, tuple layout, or
// dynamic-bytes offset fails here instead of on Vibenet.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { keccak256 } from "../lib/keccak256.mjs";
import { extractProtocolBlock, loadProtocol, loadViem, readSnippet } from "../lib/payments-protocol.mjs";

const root = new URL("../../", import.meta.url);
const snippet = await readSnippet();
const P = await loadProtocol();
const viem = await loadViem();
const { encodeFunctionData, encodeAbiParameters, toHex } = viem;

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
  fn("decimals", [], [{ type: "uint8" }]),
  fn("symbol", [], [{ type: "string" }]),
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
  assert.match(snippet, /fetchText\("\/static\/vibenet-engine\.txt\?v=7"\)/);
  assert.match(snippet, /from\\s\*"\\\.\\\/aa\\\.txt"/);
  assert.doesNotMatch(snippet, /createObjectURL/, "docs CSP blocks blob: scripts");
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
    [P.encode.decimals(), enc("decimals")],
    [P.encode.symbol(), enc("symbol")],
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
  assert.equal(P.decode.string(encodeAbiParameters([{ type: "string" }], ["USDV"])), "USDV");
  assert.equal(P.decode.string(encodeAbiParameters([{ type: "string" }], ["Vibe USD"])), "Vibe USD");
  assert.throws(() => P.decode.string(encodeAbiParameters([{ type: "uint256" }], [6n])), /not a string/);
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

test("live flows mint Vibenet USDV and never write on load", () => {
  const liveBlock = snippet.slice(snippet.indexOf("const LIVE_FLOWS = {"), snippet.indexOf("const [active, setActive]"));
  for (const key of ["accept", "authorize", "capture", "partial", "void", "refund"]) {
    const start = liveBlock.indexOf(`\n    ${key}: {`);
    assert.ok(start >= 0, `LIVE_FLOWS.${key} exists`);
    const firstStep = liveBlock.slice(start, liveBlock.indexOf("{ stage:", liveBlock.indexOf("{ stage:", start) + 1));
    assert.match(firstStep, /mintUsdv|bootstrapAuthorization/, `${key} mints its own USDV in step 1`);
  }
  assert.match(snippet, /const bootstrapAuthorization[\s\S]*?mintUsdv\(engine, ctx, whole, "Payer"\)/);
  assert.doesNotMatch(liveBlock, /dUSD|B20/, "live copy names USDV, not a demo B20 token");
  assert.match(snippet, /const DEMO_TOKEN = "Vibenet USDV \(not USDC\)"/);
  const effect = snippet.slice(snippet.indexOf("useEffect(() => {"), snippet.indexOf("}, []);"));
  assert.match(effect, /probePayments\(\)/);
  assert.doesNotMatch(effect, /sendCalls|mintUsdv|loadVibenetEngine|runLiveStep|runStep/);
  assert.equal((snippet.match(/engine\.sendCalls\(/g) || []).length, 1, "every write goes through send()");
});

test("no token is deployed and B20 activation is not required", () => {
  assert.doesNotMatch(snippet, /createStablecoin|createB20|B20_FACTORY/);
  assert.doesNotMatch(snippet, /probeCapabilities/);
  const probe = snippet.slice(snippet.indexOf("const probePayments = async"), snippet.indexOf("// ----------------------------------------------------------------------", snippet.indexOf("const probePayments = async")));
  assert.doesNotMatch(probe, /isActivated|0x8453000000000000000000000000000000000001/);
  assert.match(probe, /discoverUsdv\(\)/);
  assert.doesNotMatch(snippet, /0x56370eA3085612e42a4d89E001fb7833b62617CF/i, "USDV address is discovered at runtime, not pinned");
});

test("a failed live step never falls back to a scripted mock step", () => {
  const live = snippet.slice(snippet.indexOf("const runLiveStep = async"), snippet.indexOf("const runStep = () =>"));
  assert.doesNotMatch(live, /runMockStep/);
  assert.match(live, /stepWrote/);
  assert.match(live, /setAborted\(true\)/);
  assert.match(live, /token: caps\.usdv/, "the flow's token is the freshly discovered USDV");
  assert.match(snippet, /ctx\.stepWrote = true;\n\s*let tx;\n\s*try \{\n\s*tx = await engine\.sendCalls/);
});

// Evaluates a real slice of the snippet with the given free variables.
const sliceSnippet = (start, end) => {
  const from = snippet.indexOf(start);
  const to = snippet.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `snippet contains ${start}`);
  return snippet.slice(from, to);
};
const evaluate = (source, deps, names) =>
  new Function(...Object.keys(deps), `${source}\nreturn { ${names.join(", ")} };`)(...Object.values(deps));

const mintLog = (to, value, address = token) => ({
  address,
  topics: [P.TOPICS.Transfer, P.addressTopic(P.ZERO_ADDRESS), P.addressTopic(to)],
  data: encodeAbiParameters([{ type: "uint256" }], [value]),
});

const TX = `0x${"cd".repeat(32)}`;
const MINT_TX = `0x${"aa".repeat(32)}`;
const OTHER_TX = `0x${"ee".repeat(32)}`;
const GENESIS = `0x${"ab".repeat(32)}`;
const RESET_GENESIS = `0x${"bc".repeat(32)}`;
// A mined receipt the snippet accepts as terminal for `hash`.
const receiptFor = (hash, fields = {}) => ({
  status: "0x1",
  phaseStatuses: ["0x1"],
  transactionHash: hash,
  blockHash: `0x${"ab".repeat(32)}`,
  blockNumber: "0x10",
  ...fields,
});
// Receipts that prove nothing about `hash` and must leave it pending.
const malformedReceipts = (hash) => [
  {},
  receiptFor(OTHER_TX),
  receiptFor(hash, { blockHash: undefined }),
  receiptFor(hash, { blockHash: `0x${"0".repeat(64)}` }),
  receiptFor(hash, { blockNumber: undefined }),
  receiptFor(hash, { status: "0x2" }),
];

// The snippet's real beforeWrite/send/mintUsdv source against a stub engine.
const loadWriteHelpers = ({ balances = [0n] } = {}) => {
  const source = [
    sliceSnippet("const beforeWrite = (ctx) =>", "  // Before every step after the first"),
    sliceSnippet("  // USDV's mint(address,uint256)", "  const newPayment = async"),
  ].join("\n");
  const reads = [];
  const expected = [];
  const deps = {
    P,
    tokenBalance: async (tokenAddress, holder) => { reads.push([tokenAddress, holder]); return balances[Math.min(reads.length - 1, balances.length - 1)]; },
    preflight: async () => {},
    expectBalance: async (ctx, holder, amount, label) => { expected.push([holder, amount, label]); },
    ok: (...args) => args,
    short: (v) => v,
    show: (engine, raw) => `${raw}`,
    txHref: (h) => h,
  };
  return { ...evaluate(source, deps, ["beforeWrite", "send", "mintUsdv"]), reads, expected };
};

test("USDV mint is a direct mint(address,uint256) call verified by Transfer and balance", async () => {
  const { mintUsdv, expected } = loadWriteHelpers({ balances: [7_000_000n] });
  const sent = [];
  const engine = {
    units: (w) => BigInt(w) * 1_000_000n,
    sendCalls: async (req) => { sent.push(req); return { hash: MINT_TX, receipt: receiptFor(MINT_TX, { logs: [mintLog(operator, 5_000_000n)] }) }; },
  };
  const ctx = { account: operator, token, isMounted: () => true, leaseHeld: () => true };
  const entries = await mintUsdv(engine, ctx, 5, "Payer");
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].calls, [{ to: token, data: P.encode.mint(operator, 5_000_000n) }]);
  assert.deepEqual(expected, [[operator, 12_000_000n, "Payer"]], "balance must rise by exactly the minted amount over the prior balance");
  assert.match(entries[0][1], /USDV .* not USDC/);

  for (const logs of [[], [mintLog(operator, 4_000_000n)], [mintLog(receiver, 5_000_000n)], [mintLog(operator, 5_000_000n, receiver)]]) {
    const bad = { ...engine, sendCalls: async () => ({ hash: OTHER_TX, receipt: receiptFor(OTHER_TX, { logs }) }) };
    await assert.rejects(() => mintUsdv(bad, { account: operator, token, isMounted: () => true, leaseHeld: () => true }, 5, "Payer"), (error) => /USDV mint Transfer was not in the receipt/.test(error.message) && error.hash === OTHER_TX);
  }
});

test("unmounting stops the live step before its next transaction", async () => {
  const { send, mintUsdv } = loadWriteHelpers();
  const calls = [];
  const engine = {
    units: (w) => BigInt(w) * 1_000_000n,
    sendCalls: async (req) => { calls.push(["sendCalls", req.metadata]); return { hash: MINT_TX, receipt: receiptFor(MINT_TX, { logs: [mintLog(operator, 5_000_000n)] }) }; },
  };
  let mountedNow = true;
  const ctx = { account: operator, token, isMounted: () => mountedNow, leaseHeld: () => true };

  await mintUsdv(engine, ctx, 5, "Payer");
  await send(engine, ctx, [], "first");
  assert.deepEqual(calls, [["sendCalls", "Mint 5 USDV"], ["sendCalls", "first"]]);

  mountedNow = false;
  ctx.stepWrote = false;
  for (const attempt of [() => send(engine, ctx, [], "second"), () => mintUsdv(engine, ctx, 5, "Payer")]) {
    await assert.rejects(attempt, (error) => error.abort === true && error.unmounted === true && /no further transactions were sent/.test(error.message));
  }
  assert.equal(calls.length, 2, "no write is initiated after unmount");
  assert.equal(ctx.stepWrote, false, "a blocked write is not reported as attempted");
});

// Models one origin's Web Locks LockManager: every tab and every widget of the
// origin shares one named-lock registry. Only the exclusive ifAvailable path
// the demo uses is modeled, and the test fails if the demo asks for anything else.
const createOriginLocks = () => {
  const held = new Set();
  const tab = () => ({
    request: async (name, options, callback) => {
      assert.deepEqual(options, { mode: "exclusive", ifAvailable: true });
      if (held.has(name)) return callback(null);
      held.add(name);
      try {
        return await callback({ name, mode: "exclusive" });
      } finally {
        held.delete(name);
      }
    },
  });
  return { tab, held };
};
const tick = () => new Promise((resolve) => setImmediate(resolve));

// The snippet's real lease helpers plus beforeWrite/send against a stub engine.
const { validGenesis } = evaluate(
  sliceSnippet("  const validGenesis = ", "  const fetchApi = async"),
  { rpcCall: async () => ({ hash: GENESIS }) },
  ["validGenesis"],
);
test("genesis reads reject malformed reset evidence and normalize hex case", async () => {
  for (const value of [null, "0x", `0x${"00".repeat(32)}`, "0xmalformed"]) {
    const { genesisHashOf } = evaluate(sliceSnippet("  const validGenesis = ", "  const fetchApi = async"), { rpcCall: async () => ({ hash: value }) }, ["genesisHashOf"]);
    assert.equal(await genesisHashOf(), null);
  }
  const { genesisHashOf } = evaluate(sliceSnippet("  const validGenesis = ", "  const fetchApi = async"), { rpcCall: async () => ({ hash: `0x${GENESIS.slice(2).toUpperCase()}` }) }, ["genesisHashOf"]);
  assert.equal(await genesisHashOf(), GENESIS);
});
const loadLease = () => evaluate(
  [
    sliceSnippet("  // Exclusive run lease.", "  // Checked immediately before every write"),
    sliceSnippet("const beforeWrite = (ctx) =>", "  // Before every step after the first"),
  ].join("\n"),
  { VIBENET_CHAIN_ID: 84538453n, validGenesis },
  ["runLeaseKey", "acquireRunLease", "createLeaseSlot", "beforeWrite", "send", "reconcileSubmission"],
);
const LEASE_USDV = "0x56370eA3085612e42a4d89E001fb7833b62617CF";
const leaseTerms = { genesisHash: GENESIS, account: operator, token: LEASE_USDV };
const denied = (error) => error.lease === true && /Another live Payments demo is already running/.test(error.message) && /Nothing was sent/.test(error.message);

test("run lease key binds chain, genesis, account, and USDV", () => {
  const { runLeaseKey } = loadLease();
  const key = runLeaseKey(leaseTerms);
  assert.equal(key, `base-docs-payments-demo:v1:84538453:${GENESIS}:${operator}:${LEASE_USDV.toLowerCase()}`);
  assert.equal(runLeaseKey({ ...leaseTerms, token: LEASE_USDV.toLowerCase() }), key, "address case does not split the lease");
  for (const change of [{ genesisHash: "0xother" }, { account: receiver }, { token }]) {
    assert.notEqual(runLeaseKey({ ...leaseTerms, ...change }), key);
  }
});

test("one run per account and USDV across tabs and widgets, held between steps", async () => {
  const { runLeaseKey, acquireRunLease } = loadLease();
  const origin = createOriginLocks();
  const tabA = origin.tab();
  const tabB = origin.tab();
  const key = runLeaseKey(leaseTerms);

  const a = await acquireRunLease(tabA, key);
  assert.equal(a.held(), true);
  await assert.rejects(acquireRunLease(tabB, key), denied, "a second tab is refused, not queued");
  await assert.rejects(acquireRunLease(tabA, key), denied, "a second widget in the same tab is refused");
  // Between user steps nothing is in flight, yet the lease stays held.
  await tick();
  await tick();
  assert.equal(a.held(), true);
  await assert.rejects(acquireRunLease(tabB, key), denied, "still refused between steps");
  const other = await acquireRunLease(tabB, runLeaseKey({ ...leaseTerms, account: receiver }));
  assert.equal(other.held(), true, "a different account is independent");
  other.release();

  a.release();
  a.release();
  assert.equal(a.held(), false);
  await tick();
  assert.equal(origin.held.has(key), false, "release frees the origin-wide lock");
  const b = await acquireRunLease(tabB, key);
  assert.equal(b.held(), true, "another tab recovers after release");
  b.release();
});

test("without the Web Locks API the demo refuses to write and has no fallback", async () => {
  const { acquireRunLease, beforeWrite, send } = loadLease();
  for (const locks of [undefined, null, {}, { request: "nope" }]) {
    await assert.rejects(acquireRunLease(locks, "k"), (error) => error.lease === true && /does not support the Web Locks API/.test(error.message) && /Nothing was sent/.test(error.message));
  }
  let sent = 0;
  const engine = { sendCalls: async () => { sent += 1; return {}; } };
  for (const ctx of [{ isMounted: () => true }, { isMounted: () => true, leaseHeld: () => false }]) {
    assert.throws(() => beforeWrite(ctx), (error) => error.abort === true && /exclusive demo lease/.test(error.message));
    await assert.rejects(send(engine, ctx, [], "x"), /exclusive demo lease/);
    assert.notEqual(ctx.stepWrote, true);
  }
  assert.equal(sent, 0, "no write is initiated without a held lease");
  const lease = sliceSnippet("  // Exclusive run lease.", "  // Checked immediately before every write");
  const code = lease.split("\n").filter((line) => !/^\s*\/\//.test(line)).join("\n");
  assert.doesNotMatch(code, /localStorage|sessionStorage|BroadcastChannel|indexedDB/, "no storage-based lock fallback");
  assert.doesNotMatch(code, /steal/, "never steals another run's lease");
});

test("unmount keeps the lease until the in-flight send settles", async () => {
  const { runLeaseKey, acquireRunLease, createLeaseSlot, send } = loadLease();
  const origin = createOriginLocks();
  const tabA = origin.tab();
  const tabB = origin.tab();
  const key = runLeaseKey(leaseTerms);

  // StrictMode: mount, cleanup, mount again before any click. Nothing is held.
  const slot = createLeaseSlot();
  slot.mount();
  slot.unmount();
  slot.mount();

  slot.begin();
  const lease = await acquireRunLease(tabA, key);
  slot.hold(lease);
  let mountedNow = true;
  const ctx = { isMounted: () => mountedNow, leaseHeld: lease.held };
  let finish;
  const calls = [];
  const engine = { sendCalls: (req) => { calls.push(req.metadata); return new Promise((resolve) => { finish = resolve; }); } };
  const inFlight = send(engine, ctx, [], "approve");
  await tick();

  mountedNow = false;
  slot.unmount();
  await tick();
  assert.equal(lease.held(), true, "the lease outlives unmount while a send is in flight");
  await assert.rejects(acquireRunLease(tabB, key), denied, "another tab cannot start while it settles");

  finish({ hash: TX, receipt: receiptFor(TX) });
  await inFlight;
  await assert.rejects(send(engine, ctx, [], "next"), (error) => error.unmounted === true);
  assert.deepEqual(calls, ["approve"], "no further write after unmount");
  assert.equal(lease.held(), true, "still held until the step itself ends");
  slot.end();
  assert.equal(lease.held(), false);
  await tick();
  const b = await acquireRunLease(tabB, key);
  assert.equal(b.held(), true, "another tab recovers once the unmounted step settled");
  b.release();

  // Idle unmount between steps releases at once; reset releases while mounted.
  const idle = createLeaseSlot();
  idle.mount();
  idle.begin();
  await tick();
  const c = await acquireRunLease(tabA, key);
  idle.hold(c);
  idle.end();
  assert.equal(c.held(), true, "held across steps while mounted");
  idle.unmount();
  assert.equal(c.held(), false);
  const reset = createLeaseSlot();
  reset.mount();
  await tick();
  const d = await acquireRunLease(tabA, key);
  reset.hold(d);
  reset.release();
  assert.equal(d.held(), false);
});

const okReceipt = receiptFor(TX);
const liveCtx = () => ({ isMounted: () => true, leaseHeld: () => true });

test("send separates a verified receipt and an unsent failure from an ambiguous submission", async () => {
  const { send } = loadLease();
  const run = (sendCalls) => send({ sendCalls }, liveCtx(), [], "x").then(() => null, (error) => error);
  const timeout = Object.assign(new Error("Timed out while waiting for transaction"), { submitted: true, hash: TX });

  let error = await run(async () => { throw timeout; });
  assert.equal(error.pending, true, "a receipt timeout after submission is pending");
  assert.equal(error.hash, TX, "the submitted hash is kept for reconciliation and the explorer link");

  error = await run(async () => { throw Object.assign(new Error("fetch failed"), { submitted: true }); });
  assert.equal(error.pending, true, "a lost eth_sendRawTransaction response is pending");
  assert.equal(error.hash, null, "no hash is invented when the node never returned one");

  error = await run(async () => { throw new Error("The operation was aborted"); });
  assert.equal(error.pending, true, "an unclassified engine error (older cached engine) is pending, not unsent");

  error = await run(async () => ({ hash: TX }));
  assert.equal(error.pending, true, "a result without a receipt is pending");
  assert.equal(error.hash, TX);

  error = await run(async () => { throw Object.assign(new Error("Vibenet faucet unavailable"), { notSent: true }); });
  assert.notEqual(error.pending, true, "a failure before eth_sendRawTransaction is not pending");

  const reverted = receiptFor(TX, { status: "0x0", phaseStatuses: ["0x0"] });
  error = await run(async () => { throw Object.assign(new Error(`Transaction reverted (${TX})`), { hash: TX, receipt: reverted }); });
  assert.notEqual(error.pending, true, "an engine-reported revert has a terminal receipt");
  assert.equal(error.receipt, reverted);
  error = await run(async () => ({ hash: TX, receipt: receiptFor(TX, { phaseStatuses: ["0x0"] }) }));
  assert.notEqual(error.pending, true, "a failed phase in a returned receipt is terminal");
  assert.equal(error.hash, TX);
  assert.equal(await run(async () => ({ hash: TX, receipt: okReceipt })), null, "success resolves");

  for (const receipt of malformedReceipts(TX)) {
    const label = JSON.stringify(receipt);
    error = await run(async () => ({ hash: TX, receipt }));
    assert.equal(error.pending, true, `a returned receipt that does not verify the hash is pending: ${label}`);
    assert.equal(error.hash, TX, label);
    error = await run(async () => { throw Object.assign(new Error(`Transaction reverted (${TX})`), { hash: TX, receipt }); });
    assert.equal(error.pending, true, `an engine error with an unverified receipt is pending: ${label}`);
    assert.equal(error.hash, TX, label);
  }

  // The engine's post-receipt deployment check failed: the receipt is final,
  // so the error is terminal and keeps the known hash and receipt.
  const deploymentError = Object.assign(new Error(`Transaction ${TX} confirmed, but the account deployment could not be verified: 502`), { hash: TX, receipt: okReceipt, deploymentUnverified: true });
  error = await run(async () => { throw deploymentError; });
  assert.equal(error, deploymentError);
  assert.notEqual(error.pending, true, "a verified receipt is never re-marked pending");
  assert.equal(error.hash, TX);
  assert.equal(error.receipt, okReceipt);
});

// Drives reconcileSubmission with scripted reads; wait() records the delay and
// resolves at once so the test controls every check. It rejects past maxChecks
// so a reconciliation that never ends fails the test instead of spinning.
const reconcileWith = ({ genesis = [], receipts = [], hash = TX, maxChecks = 20 } = {}) => {
  const { reconcileSubmission } = loadLease();
  const waits = [];
  const receiptReads = [];
  let g = 0;
  let r = 0;
  const next = (list, index) => {
    const value = list[Math.min(index, list.length - 1)];
    if (value instanceof Error) return Promise.reject(value);
    return Promise.resolve(value);
  };
  const done = reconcileSubmission({
    hash,
    genesisHash: GENESIS,
    readGenesis: () => next(genesis.length ? genesis : [GENESIS], g++),
    readReceipt: (txHash) => { receiptReads.push(txHash); return next(receipts.length ? receipts : [null], r++); },
    wait: async (ms) => {
      if (waits.length >= maxChecks) throw new Error(`reconciliation did not settle within ${maxChecks} checks`);
      waits.push(ms);
    },
  });
  return { done, waits, receiptReads };
};

test("reconciliation resolves only on a receipt or a verified reset, with capped backoff", async () => {
  const offline = new Error("Vibenet returned 502");
  let run = reconcileWith({ receipts: [null, offline, null, null, null, null, null, null, okReceipt] });
  assert.deepEqual(await run.done, { outcome: "success", hash: TX, receipt: okReceipt });
  assert.deepEqual(run.waits, [2_000, 4_000, 8_000, 16_000, 32_000, 60_000, 60_000, 60_000, 60_000], "backs off to one check per minute");
  assert.ok(run.receiptReads.every((h) => h === TX));

  const reverted = receiptFor(TX, { status: "0x0" });
  run = reconcileWith({ genesis: [offline, GENESIS], receipts: [reverted] });
  assert.equal((await run.done).outcome, "reverted", "a failed genesis read is not a reset");

  run = reconcileWith({ genesis: [GENESIS, null, RESET_GENESIS] });
  assert.deepEqual(await run.done, { outcome: "reset", hash: TX }, "a changed genesis hash is a verified reset");
  assert.equal(run.waits.length, 3);

  run = reconcileWith({ hash: null, genesis: [GENESIS, GENESIS, offline, GENESIS, RESET_GENESIS] });
  assert.deepEqual(await run.done, { outcome: "reset", hash: null }, "without a hash only a reset ends it");
  assert.deepEqual(run.receiptReads, [], "no receipt lookup is attempted without a hash");
  assert.equal(run.waits.length, 5);
  run = reconcileWith({ genesis: ["0x", null, `0x${"00".repeat(32)}`, "0xmalformed", `0x${GENESIS.slice(2).toUpperCase()}`, RESET_GENESIS], receipts: [null] });
  assert.deepEqual(await run.done, { outcome: "reset", hash: TX }, "only a valid changed genesis can release the lease");
  assert.equal(run.receiptReads.length, 5, "malformed, absent, zero and case-only hashes keep reconciliation pending");

  for (const count of [1, 2, 3]) {
    const bad = malformedReceipts(TX).slice(0, count);
    run = reconcileWith({ receipts: [...bad, okReceipt] });
    assert.deepEqual(await run.done, { outcome: "success", hash: TX, receipt: okReceipt }, `${count} unverified receipts stay pending, then the valid one settles`);
    assert.equal(run.waits.length, count + 1);
  }
  run = reconcileWith({ receipts: [...malformedReceipts(TX), reverted] });
  assert.equal((await run.done).outcome, "reverted");
  assert.equal(run.waits.length, malformedReceipts(TX).length + 1, "every malformed receipt was skipped");

  run = reconcileWith({ receipts: [{}], maxChecks: 5 });
  await assert.rejects(run.done, /did not settle within 5 checks/, "an endless {} receipt never settles it");
  run = reconcileWith({ receipts: [receiptFor(OTHER_TX)], maxChecks: 5 });
  await assert.rejects(run.done, /did not settle within 5 checks/, "a receipt for another hash never settles it");
  assert.equal(run.receiptReads.length, 5);
});

test("an ambiguous submission keeps the lease through reset and unmount until reconciled", async () => {
  const { runLeaseKey, acquireRunLease, createLeaseSlot, send, reconcileSubmission } = loadLease();
  const origin = createOriginLocks();
  const tabA = origin.tab();
  const tabB = origin.tab();
  const key = runLeaseKey(leaseTerms);

  for (const scenario of [
    { hash: TX, outcome: "success", finalRead: () => okReceipt },
    { hash: TX, outcome: "reverted", finalRead: () => receiptFor(TX, { status: "0x0" }) },
    { hash: null, outcome: "reset", finalRead: () => null },
  ]) {
    const slot = createLeaseSlot();
    slot.mount();
    slot.begin();
    const lease = await acquireRunLease(tabA, key);
    slot.hold(lease);
    let mountedNow = true;
    const ctx = { genesisHash: GENESIS, isMounted: () => mountedNow, leaseHeld: lease.held };
    const engine = { sendCalls: async () => { throw Object.assign(new Error("Timed out"), { submitted: true, ...(scenario.hash ? { hash: scenario.hash } : {}) }); } };

    // The component's catch: pin before anything else, then the step ends.
    const error = await send(engine, ctx, [], "approve").then(() => null, (e) => e);
    assert.equal(error.pending, true);
    let settled = false;
    const gate = [];
    const step = () => new Promise((resolve) => gate.push(resolve));
    const early = [null, ...malformedReceipts(TX)];
    let reads = 0;
    const reconciliation = slot.pin(reconcileSubmission({
      hash: error.hash,
      genesisHash: ctx.genesisHash,
      readGenesis: async () => (settled && scenario.outcome === "reset" ? RESET_GENESIS : GENESIS),
      readReceipt: async () => (settled ? scenario.finalRead() : early[reads++ % early.length]),
      wait: step,
    }));
    slot.end();

    assert.equal(slot.release(), false, "reset cannot release a pinned lease");
    assert.equal(slot.pinned(), true);
    mountedNow = false;
    slot.unmount();
    for (let i = 0; i < 4; i += 1) { await tick(); gate.shift()?.(); }
    await tick();
    assert.equal(lease.held(), true, `${scenario.outcome}: held through reset, unmount, and missing receipts`);
    await assert.rejects(acquireRunLease(tabB, key), denied, "another tab cannot race the pending transaction");

    settled = true;
    for (let i = 0; i < 50 && lease.held(); i += 1) { await tick(); gate.shift()?.(); }
    assert.equal(lease.held(), false, `${scenario.outcome}: reconciliation settled within 50 checks`);
    assert.equal((await reconciliation).outcome, scenario.outcome);
    assert.equal(slot.pinned(), false);
    await tick();
    const b = await acquireRunLease(tabB, key);
    assert.equal(b.held(), true, `${scenario.outcome}: released once the outcome is verified`);
    b.release();
    await tick();
  }
});

test("the component pins pending submissions before unmount handling and blocks reset", () => {
  const live = snippet.slice(snippet.indexOf("const runLiveStep = async"), snippet.indexOf("const runStep = () =>"));
  const pin = live.indexOf("holdPendingSubmission(error.hash || null, ctx.genesisHash)");
  assert.ok(pin > 0 && pin < live.indexOf("if (!mounted.current) return;"), "pinned even when the demo already unmounted");
  const hold = snippet.slice(snippet.indexOf("const holdPendingSubmission"), snippet.indexOf("const runMockStep"));
  assert.match(hold, /leaseSlot\.current\.pin\(reconcileSubmission\(/);
  assert.match(hold, /eth_getTransactionReceipt/);
  assert.match(snippet, /const reset = \(\) => \{ if \(busy \|\| pendingTx\) return;/);
  assert.match(snippet, /const select = \(k\) => \{ if \(busy \|\| pendingTx\) return;/);
  assert.doesNotMatch(live.slice(live.indexOf("if (pending) {"), live.indexOf("} else if (wrote || error?.abort)")), /release\(\)/, "the pending branch never releases");
});

test("the live run takes the lease before its first write and releases it on every exit", () => {
  const live = snippet.slice(snippet.indexOf("const runLiveStep = async"), snippet.indexOf("const runStep = () =>"));
  const acquire = live.indexOf("acquireRunLease(");
  assert.ok(acquire > 0 && acquire < live.indexOf("f.steps[stepIndex].run(engine, ctx, s)"), "lease before the step runs");
  assert.ok(acquire < live.indexOf("liveContext.current = ctx"), "no run context without a lease");
  assert.match(live, /navigator\.locks, runLeaseKey\(next\)/);
  assert.match(live, /next\.leaseHeld = lease\.held/);
  assert.ok(live.indexOf("leaseSlot.current.begin();") < live.indexOf("try {"), "the step is marked in flight before any await");
  assert.match(live, /finally \{[\s\S]*leaseSlot\.current\.end\(\);/);
  assert.match(live, /if \(stepIndex \+ 1 >= f\.steps\.length\) leaseSlot\.current\.release\(\);/, "completion releases");
  assert.match(live, /setAborted\(true\);\n\s*leaseSlot\.current\.release\(\);/, "abort releases");
  assert.match(live, /liveContext\.current = null;\n\s*leaseSlot\.current\.release\(\);/, "offline fallback releases");
  const clear = snippet.slice(snippet.indexOf("const clearRun = () =>"), snippet.indexOf("const select = "));
  assert.match(clear, /leaseSlot\.current\.release\(\);/, "reset and flow switch release");
  const effect = snippet.slice(snippet.indexOf("useEffect(() => {"), snippet.indexOf("}, []);"));
  assert.match(effect, /leaseSlot\.current\.mount\(\);/);
  assert.match(effect, /return \(\) => \{[^}]*leaseSlot\.current\.unmount\(\);/);
  assert.doesNotMatch(snippet, /cancel(l)?ed (the )?(transaction|tx)/i, "no claim that an in-flight transaction was canceled");
});

// The snippet's real discoverUsdv against stubbed /contracts, faucet status, and RPC.
const USDV = "0x56370eA3085612e42a4d89E001fb7833b62617CF";
const loadDiscovery = ({ contracts = { usdv: USDV }, faucet = { chain_id: 84538453, usdv_address: USDV }, code = true, decimals = 6n, symbol = "USDV" } = {}) => {
  const source = sliceSnippet("const discoverUsdv = async", "  // Read-only capability probe");
  const deps = {
    P,
    VIBENET_CHAIN_ID: 84538453n,
    fetchApi: async (path) => {
      const value = path === "/contracts" ? contracts : faucet;
      if (value instanceof Error) throw value;
      return value;
    },
    hasCode: async () => code,
    ethCall: async (to, data) => {
      if (data === P.encode.decimals()) return encodeAbiParameters([{ type: "uint8" }], [Number(decimals)]);
      if (data === P.encode.symbol()) return encodeAbiParameters([{ type: "string" }], [symbol]);
      throw new Error(`unexpected eth_call ${data}`);
    },
  };
  return evaluate(source, deps, ["discoverUsdv"]).discoverUsdv;
};

test("USDV is discovered at runtime and validated before any write", async () => {
  assert.deepEqual(await loadDiscovery()(), { address: USDV, reason: null });
  // Either endpoint alone is enough; a boot-window {} from /contracts falls back to the faucet.
  assert.deepEqual(await loadDiscovery({ contracts: {} })(), { address: USDV, reason: null });
  assert.deepEqual(await loadDiscovery({ faucet: new Error("down") })(), { address: USDV, reason: null });
  const fails = {
    "does not list a USDV": { contracts: {}, faucet: { chain_id: 84538453 } },
    "different USDV addresses": { faucet: { chain_id: 84538453, usdv_address: token } },
    "faucet reports chain": { faucet: { chain_id: 8453, usdv_address: USDV } },
    "has no code": { code: false },
    "6 decimals": { decimals: 18n },
    "different symbol": { symbol: "USDC" },
  };
  for (const [reason, options] of Object.entries(fails)) {
    const result = await loadDiscovery(options)();
    assert.equal(result.address, null, reason);
    assert.match(result.reason, new RegExp(reason), reason);
  }
  await assert.rejects(loadDiscovery({ contracts: new Error("down"), faucet: new Error("down") }), /lookup did not respond/);
});

test("later steps abort if the USDV address changes", async () => {
  const source = sliceSnippet("const guard = async", "  // USDV is shared and long-lived");
  const load = (usdv) => evaluate(source, {
    P,
    genesisHashOf: async () => "0xgenesis",
    hasCode: async () => true,
    discoverUsdv: async () => usdv,
    abortError: (message) => Object.assign(new Error(message), { abort: true }),
    short: (v) => v,
  }, ["guard"]).guard;
  const engine = { getSharedAccount: async () => ({ account: { address: operator } }) };
  const ctx = { genesisHash: "0xgenesis", token: USDV, account: operator };
  await load({ address: USDV.toLowerCase(), reason: null })(engine, ctx);
  await assert.rejects(load({ address: token, reason: null })(engine, ctx), (error) => error.abort && /USDV token changed/.test(error.message));
  await assert.rejects(load({ address: null, reason: "USDV has no code" })(engine, ctx), (error) => error.abort && /USDV has no code/.test(error.message));
  await assert.rejects(load({ address: USDV, reason: null })(engine, { ...ctx, genesisHash: "0xold" }), (error) => error.abort && /reset/.test(error.message));
});

test("every write boundary checks the mount guard and unmount clears it", () => {
  assert.match(snippet, /beforeWrite\(ctx\);\n\s*ctx\.stepWrote = true;\n\s*let tx;\n\s*try \{\n\s*tx = await engine\.sendCalls/);
  const effect = snippet.slice(snippet.indexOf("useEffect(() => {"), snippet.indexOf("}, []);"));
  assert.match(effect, /mounted\.current = true;/);
  assert.match(effect, /return \(\) => \{[^}]*mounted\.current = false;/);
  assert.match(snippet, /isMounted: \(\) => mounted\.current/);
  const live = snippet.slice(snippet.indexOf("const runLiveStep = async"), snippet.indexOf("const runStep = () =>"));
  assert.match(live, /catch \(error\) \{[\s\S]*?if \(!mounted\.current\) return;[\s\S]*?probePayments/, "no retry probe after unmount");
});

test("pages with live flows describe USDV accurately", async () => {
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
    assert.match(source, /existing USDV test token, not USDC/, page);
    assert.doesNotMatch(source, /dUSD|demo B20 stablecoin/, page);
  }
});
