export const PaymentsDemo = ({ flow }) => {
  // No imports allowed in Mintlify snippets: useState/useEffect/useRef are injected globally.
  const sans = "'Base Sans','Inter Tight',Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  const mono = "'Base Mono','Roboto Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace";

  // Mintlify intercepts import(url), and snippets cannot import other snippets or
  // npm packages. The shared live engine therefore ships as .txt, is linked and
  // evaluated on the first live click, and publishes its API on window. This
  // loader is identical to the one in StablecoinDemo.jsx and AssetDemo.jsx.
  const loadVibenetEngine = () => {
    if (window.__baseDocsVibenetEngineV3) return Promise.resolve(window.__baseDocsVibenetEngineV3);
    if (window.__baseDocsVibenetEnginePromiseV3) return window.__baseDocsVibenetEnginePromiseV3;

    window.__baseDocsVibenetEnginePromiseV3 = (async () => {
      try {
        const fetchText = async (path) => {
          const response = await fetch(path, { cache: "force-cache" });
          if (!response.ok) throw new Error(`${path} returned ${response.status}`);
          return response.text();
        };
        const [aaSource, engineSource] = await Promise.all([
          fetchText("/static/aa.txt"),
          fetchText("/static/vibenet-engine.txt?v=7"),
        ]);
        // docs.base.org's CSP blocks blob: scripts, so both modules are linked
        // into one function body: the AA bundle's trailing export list becomes
        // a returned object, and the engine's import from "./aa.txt" reads it.
        const exportAt = aaSource.lastIndexOf("export{");
        const exportEnd = aaSource.indexOf("}", exportAt);
        if (exportAt === -1 || exportEnd === -1) throw new Error("Could not read the AA bundle exports");
        const aaExports = aaSource
          .slice(exportAt + 7, exportEnd)
          .split(",")
          .map((entry) => {
            const [local, exported] = entry.trim().split(/\s+as\s+/);
            return `${JSON.stringify(exported || local)}:${local}`;
          })
          .join(",");
        const aaModule = `const __baseDocsAA=(()=>{${aaSource.slice(0, exportAt)}\nreturn{${aaExports}};})();`;
        const importPattern = /import\s*\{([\s\S]*?)\}\s*from\s*"\.\/aa\.txt";/;
        if (!importPattern.test(engineSource)) throw new Error("Could not connect the Vibenet engine to the AA bundle");
        const engineBody = engineSource
          .replace(importPattern, "const {$1} = __baseDocsAA;")
          .replace(/^export default [^;]+;$/m, "")
          .replace(/^export\s+(?=(async\s+)?(function|const|let|class)\b)/gm, "");
        try {
          new Function(`"use strict";\n${aaModule}\n${engineBody}`)();
        } catch (error) {
          throw new Error(`Failed to evaluate the Vibenet engine: ${error?.message || error}`);
        }
        if (!window.__baseDocsVibenetEngineV3) throw new Error("Failed to evaluate the Vibenet engine");
        return window.__baseDocsVibenetEngineV3;
      } catch (error) {
        window.__baseDocsVibenetEnginePromiseV3 = null;
        throw error;
      }
    })();
    return window.__baseDocsVibenetEnginePromiseV3;
  };

  // @payments-protocol:begin
  // Pure Commerce Payments Protocol v1.1 encoders and receipt checks. This block
  // must stay free of JSX and browser globals: scripts/__tests__/payments-demo.test.mjs
  // extracts it and checks every encoding against viem, and
  // scripts/simulate-payments-vibenet.mjs replays the live flows with it.
  const PAYMENTS_PROTOCOL = (() => {
    const ESCROW = "0xf96815976523E00e65Be8f34cA5e64b4f41EB19c";
    const PRE_APPROVAL_COLLECTOR = "0xF1F9C408C787B2bC6CAEB91e5BbEc434a5c8d2Ea";
    const REFUND_COLLECTOR = "0x7a03443724d14798c4AB4622F1DAAcA761Fea486";
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    const MAX_FEE_BPS = 10_000n;
    // PaymentInfo = (address operator, address payer, address receiver, address token,
    // uint120 maxAmount, uint48 preApprovalExpiry, uint48 authorizationExpiry,
    // uint48 refundExpiry, uint16 minFeeBps, uint16 maxFeeBps, address feeReceiver, uint256 salt)
    const SELECTORS = {
      getHash: "0x063a70ff",
      paymentState: "0x34b778ed",
      getTokenStore: "0x9d3facde",
      authorize: "0x41d66202",
      charge: "0xc449d17c",
      capture: "0x3efa46e1",
      void: "0xfa1cad17",
      refund: "0xd458db5a",
      preApprove: "0xc6184c2f",
      isPreApproved: "0xaa78d16a",
      authCaptureEscrow: "0x40865734",
      collectorType: "0xccdafa11",
      approve: "0x095ea7b3",
      allowance: "0xdd62ed3e",
      balanceOf: "0x70a08231",
      mint: "0x40c10f19",
      decimals: "0x313ce567",
      symbol: "0x95d89b41",
    };
    const TOPICS = {
      PaymentCharged: "0x137b0e73e4453f43c2e1ad2552980a0e0c7e988764619974ca26d37a7159940c",
      PaymentAuthorized: "0x1c81fb2e3bab27f6bb09bee9a0dddf61600b7cbaf2c12683e4864e0cbdb9d284",
      PaymentCaptured: "0xac1e0db1957daedbc6944bcb4c8dc947ff8101d710671ac2ec26309f7f38d58e",
      PaymentVoided: "0xcadce8c3acb008e3e1c64ca7f60d22a3c87069183182b7dbb9e4d8cfb3a15842",
      PaymentRefunded: "0x1bf415371b303ca6b8bbb4ce479b177cba5ad15dbe0c9a7750a588aa6bcd25b2",
      PaymentPreApproved: "0x648e07873d502d2121c8e8dfb7efab466b43a83ef86ada8626ae88cf568becde",
      Approval: "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925",
      Transfer: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
    };
    const ERRORS = {
      "0xe1130dba": "InvalidSender",
      "0x1f2a2005": "ZeroAmount",
      "0x6c0442a2": "AmountOverflow",
      "0x092af19e": "ExceedsMaxAmount",
      "0xc46cf60f": "AfterPreApprovalExpiry",
      "0x88ef0760": "InvalidExpiries",
      "0xbf47e3f7": "FeeBpsOverflow",
      "0x0950d5d0": "InvalidFeeBpsRange",
      "0x7c2dcc22": "FeeAmountOutOfRange",
      "0xb6802b7f": "ZeroFeeReceiver",
      "0x4caf6a34": "InvalidFeeReceiver",
      "0x5313287d": "InvalidCollectorForOperation",
      "0x3c73c4a0": "TokenCollectionFailed",
      "0xad7c145a": "PaymentAlreadyCollected",
      "0x36f2d211": "AfterAuthorizationExpiry",
      "0x604b0947": "InsufficientAuthorization",
      "0x93bb7a12": "ZeroAuthorization",
      "0xaa5674ad": "BeforeAuthorizationExpiry",
      "0x94271bde": "AfterRefundExpiry",
      "0x6295d604": "RefundExceedsCapture",
      "0xa8334d15": "PaymentNotPreApproved",
      "0x19af2135": "PaymentAlreadyPreApproved",
      "0xbde034f9": "OnlyAuthCaptureEscrow",
      "0x5274afe7": "SafeERC20FailedOperation",
      "0x192b9e4e": "InsufficientAllowance",
      "0xdb42144d": "InsufficientBalance",
      "0xa43fec12": "PolicyForbids",
      "0xfd8c4245": "ContractPaused",
    };

    const same = (a, b) => typeof a === "string" && typeof b === "string" && a.toLowerCase() === b.toLowerCase();
    const uintWord = (value, bits, label) => {
      const v = BigInt(value);
      if (v < 0n || v >= 1n << BigInt(bits)) throw new Error(`${label} is outside the uint${bits} range`);
      return v.toString(16).padStart(64, "0");
    };
    const addressWord = (value, label) => {
      if (typeof value !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error(`${label} is not an address`);
      return value.slice(2).toLowerCase().padStart(64, "0");
    };
    const bytes32Word = (value, label) => {
      if (typeof value !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(value)) throw new Error(`${label} is not bytes32`);
      return value.slice(2).toLowerCase();
    };
    const addressTopic = (value) => `0x${addressWord(value, "topic address")}`;
    // collectorData is always empty for these collectors: offset word, then a zero length.
    const emptyBytesTail = (headWords) => uintWord(BigInt(headWords) * 32n, 256, "offset") + uintWord(0, 256, "length");

    const paymentInfoWords = (p) => {
      if (!p) throw new Error("PaymentInfo is missing");
      if (!(BigInt(p.preApprovalExpiry) <= BigInt(p.authorizationExpiry) && BigInt(p.authorizationExpiry) <= BigInt(p.refundExpiry))) {
        throw new Error("PaymentInfo expiries must be ordered preApproval <= authorization <= refund");
      }
      if (BigInt(p.maxFeeBps) > MAX_FEE_BPS || BigInt(p.minFeeBps) > BigInt(p.maxFeeBps)) throw new Error("PaymentInfo fee bounds are invalid");
      return [
        addressWord(p.operator, "operator"),
        addressWord(p.payer, "payer"),
        addressWord(p.receiver, "receiver"),
        addressWord(p.token, "token"),
        uintWord(p.maxAmount, 120, "maxAmount"),
        uintWord(p.preApprovalExpiry, 48, "preApprovalExpiry"),
        uintWord(p.authorizationExpiry, 48, "authorizationExpiry"),
        uintWord(p.refundExpiry, 48, "refundExpiry"),
        uintWord(p.minFeeBps, 16, "minFeeBps"),
        uintWord(p.maxFeeBps, 16, "maxFeeBps"),
        addressWord(p.feeReceiver, "feeReceiver"),
        uintWord(p.salt, 256, "salt"),
      ].join("");
    };

    const encode = {
      getHash: (p) => SELECTORS.getHash + paymentInfoWords(p),
      paymentState: (hash) => SELECTORS.paymentState + bytes32Word(hash, "paymentInfoHash"),
      getTokenStore: (operator) => SELECTORS.getTokenStore + addressWord(operator, "operator"),
      preApprove: (p) => SELECTORS.preApprove + paymentInfoWords(p),
      isPreApproved: (hash) => SELECTORS.isPreApproved + bytes32Word(hash, "paymentInfoHash"),
      // Head: 12 PaymentInfo words + amount + tokenCollector + bytes offset = 15 words.
      authorize: (p, amount, collector) =>
        SELECTORS.authorize + paymentInfoWords(p) + uintWord(amount, 256, "amount") + addressWord(collector, "tokenCollector") + emptyBytesTail(15),
      // Head: 12 PaymentInfo words + amount + tokenCollector + bytes offset + feeAmount + feeReceiver = 17 words.
      charge: (p, amount, collector, feeAmount, feeReceiver) =>
        SELECTORS.charge + paymentInfoWords(p) + uintWord(amount, 256, "amount") + addressWord(collector, "tokenCollector") +
        uintWord(17n * 32n, 256, "offset") + uintWord(feeAmount, 256, "feeAmount") + addressWord(feeReceiver, "feeReceiver") + uintWord(0, 256, "length"),
      capture: (p, amount, feeAmount, feeReceiver) =>
        SELECTORS.capture + paymentInfoWords(p) + uintWord(amount, 256, "amount") + uintWord(feeAmount, 256, "feeAmount") + addressWord(feeReceiver, "feeReceiver"),
      void: (p) => SELECTORS.void + paymentInfoWords(p),
      refund: (p, amount, collector) =>
        SELECTORS.refund + paymentInfoWords(p) + uintWord(amount, 256, "amount") + addressWord(collector, "tokenCollector") + emptyBytesTail(15),
      authCaptureEscrow: () => SELECTORS.authCaptureEscrow,
      collectorType: () => SELECTORS.collectorType,
      approve: (spender, amount) => SELECTORS.approve + addressWord(spender, "spender") + uintWord(amount, 256, "amount"),
      allowance: (owner, spender) => SELECTORS.allowance + addressWord(owner, "owner") + addressWord(spender, "spender"),
      balanceOf: (holder) => SELECTORS.balanceOf + addressWord(holder, "holder"),
      mint: (to, amount) => SELECTORS.mint + addressWord(to, "to") + uintWord(amount, 256, "amount"),
      decimals: () => SELECTORS.decimals,
      symbol: () => SELECTORS.symbol,
    };

    const words = (hex) => {
      const body = (hex || "0x").slice(2);
      if (body.length % 64 !== 0) throw new Error("Return data is not word aligned");
      const out = [];
      for (let i = 0; i < body.length; i += 64) out.push(BigInt(`0x${body.slice(i, i + 64)}`));
      return out;
    };
    const wordAddress = (value) => `0x${value.toString(16).padStart(40, "0")}`;
    const decode = {
      uint: (hex) => { const w = words(hex); if (w.length < 1) throw new Error("Empty return data"); return w[0]; },
      bool: (hex) => { const w = words(hex); if (w.length < 1 || w[0] > 1n) throw new Error("Return data is not a bool"); return w[0] === 1n; },
      address: (hex) => { const w = words(hex); if (w.length < 1 || w[0] >= 1n << 160n) throw new Error("Return data is not an address"); return wordAddress(w[0]); },
      bytes32: (hex) => { if (!/^0x[0-9a-fA-F]{64}$/.test(hex || "")) throw new Error("Return data is not bytes32"); return hex.toLowerCase(); },
      // ABI-encoded string (offset, length, bytes). Decodes ASCII, which covers token symbols.
      string: (hex) => {
        const w = words(hex);
        if (w.length < 2 || w[0] !== 32n) throw new Error("Return data is not a string");
        const length = Number(w[1]);
        if (w.length < 2 + Math.ceil(length / 32)) throw new Error("Return data is not a string");
        const bytes = hex.slice(2 + 128, 2 + 128 + length * 2);
        let out = "";
        for (let i = 0; i < bytes.length; i += 2) out += String.fromCharCode(parseInt(bytes.slice(i, i + 2), 16));
        return out;
      },
      paymentState: (hex) => {
        const w = words(hex);
        if (w.length !== 3 || w[0] > 1n) throw new Error("paymentState returned an unexpected shape");
        return { hasCollectedPayment: w[0] === 1n, capturableAmount: w[1], refundableAmount: w[2] };
      },
    };

    const buildPaymentInfo = ({ operator, payer, receiver, token, maxAmount, now, preApprovalSeconds = 3_600, authorizationSeconds = 7 * 86_400, refundSeconds = 30 * 86_400, salt }) => {
      const t = BigInt(now);
      const info = {
        operator, payer, receiver, token,
        maxAmount: BigInt(maxAmount),
        preApprovalExpiry: t + BigInt(preApprovalSeconds),
        authorizationExpiry: t + BigInt(authorizationSeconds),
        refundExpiry: t + BigInt(refundSeconds),
        minFeeBps: 0n,
        maxFeeBps: 0n,
        feeReceiver: ZERO_ADDRESS,
        salt: BigInt(salt),
      };
      paymentInfoWords(info);
      return info;
    };

    // Returns the single log from `address` whose topic0 matches and, when
    // given, whose first indexed topic equals `indexed`. Zero or several
    // matches are a failed verification, never a success.
    const findLog = (receipt, address, topic, indexed) => {
      const matches = (receipt?.logs || []).filter((log) =>
        same(log.address, address) && same(log.topics?.[0], topic) && (indexed === undefined || same(log.topics?.[1], indexed)));
      return matches.length === 1 ? matches[0] : null;
    };
    // Sum of ERC-20 Transfer values from `from` to `to` emitted by `token`.
    const transferred = (receipt, token, from, to) => (receipt?.logs || [])
      .filter((log) => same(log.address, token) && same(log.topics?.[0], TOPICS.Transfer) && same(log.topics?.[1], addressTopic(from)) && same(log.topics?.[2], addressTopic(to)))
      .reduce((sum, log) => sum + words(log.data)[0], 0n);
    const EVENT_FIELDS = {
      PaymentCharged: { paymentInfo: true, fields: ["amount", "tokenCollector", "feeAmount", "feeReceiver"] },
      PaymentAuthorized: { paymentInfo: true, fields: ["amount", "tokenCollector"] },
      PaymentCaptured: { paymentInfo: false, fields: ["amount", "feeAmount", "feeReceiver"] },
      PaymentVoided: { paymentInfo: false, fields: ["amount"] },
      PaymentRefunded: { paymentInfo: false, fields: ["amount", "tokenCollector"] },
    };
    const escrowEvent = (receipt, name, paymentInfoHash, info) => {
      const spec = EVENT_FIELDS[name];
      if (!spec) throw new Error(`Unknown escrow event ${name}`);
      const log = findLog(receipt, ESCROW, TOPICS[name], paymentInfoHash);
      if (!log) throw new Error(`${name} for this paymentInfoHash was not in the receipt`);
      const body = (log.data || "0x").slice(2).toLowerCase();
      const offset = spec.paymentInfo ? 12 : 0;
      if (spec.paymentInfo && body.slice(0, 12 * 64) !== paymentInfoWords(info)) throw new Error(`${name} carried different PaymentInfo terms`);
      const w = words(log.data);
      if (w.length !== offset + spec.fields.length) throw new Error(`${name} data has an unexpected shape`);
      const out = { logIndex: Number(BigInt(log.logIndex ?? 0)) };
      spec.fields.forEach((field, i) => {
        const value = w[offset + i];
        out[field] = field === "tokenCollector" || field === "feeReceiver" ? wordAddress(value) : value;
      });
      return out;
    };

    const revertName = (data) => {
      const selector = typeof data === "string" ? data.slice(0, 10).toLowerCase() : null;
      return selector && ERRORS[selector] ? ERRORS[selector] : null;
    };

    return {
      ESCROW, PRE_APPROVAL_COLLECTOR, REFUND_COLLECTOR, ZERO_ADDRESS, SELECTORS, TOPICS, ERRORS,
      same, addressTopic, paymentInfoWords, encode, decode, buildPaymentInfo, findLog, transferred, escrowEvent, revertName,
    };
  })();
  // @payments-protocol:end
  const P = PAYMENTS_PROTOCOL;

  const VIBENET_API = "https://api.vibes.base.org/api/vibenet";
  const VIBENET_RPC = `${VIBENET_API}/account/rpc`;
  const VIBENET_CHAIN_ID = 84538453n;
  const EXPLORER_URL = "https://chain.base.org/vibenet/explorer";

  // Read-only JSON-RPC used by the probe, state reads, and preflight eth_calls.
  // Node-reported errors carry `rpc: true` so callers can tell a revert from an outage.
  const rpcCall = async (method, params = [], timeoutMs = 10_000) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(VIBENET_RPC, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
        signal: controller.signal,
      });
      const body = await response.json().catch(() => null);
      if (body?.error) throw Object.assign(new Error(body.error.message || `${method} failed`), { rpc: true, data: body.error.data });
      if (!response.ok || !body) throw new Error(`Vibenet returned ${response.status}`);
      return body.result;
    } finally {
      clearTimeout(timeout);
    }
  };
  const ethCall = (to, data, from) => rpcCall("eth_call", [from ? { from, to, data } : { to, data }, "latest"]);
  const hasCode = async (address) => { const code = await rpcCall("eth_getCode", [address, "latest"]); return Boolean(code && code !== "0x"); };
  const validGenesis = (hash) => typeof hash === "string" && /^0x[0-9a-fA-F]{64}$/.test(hash) && !/^0x0{64}$/i.test(hash);
  const genesisHashOf = async () => {
    const hash = (await rpcCall("eth_getBlockByNumber", ["0x0", false]))?.hash;
    return validGenesis(hash) ? hash.toLowerCase() : null;
  };
  const fetchApi = async (path, timeoutMs = 10_000) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${VIBENET_API}${path}`, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error(`${path} returned ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  };

  // The demos pay with Vibenet's existing USDV token ("Vibe USD", 6 decimals,
  // permissionless mint), not USDC. Vibenet resets can redeploy it, so its
  // address is read at runtime from /contracts and the faucet status, which must
  // agree, then checked onchain for code, decimals, and symbol. Throws only when
  // neither endpoint answers; any other mismatch is returned as `reason`.
  const discoverUsdv = async () => {
    const [deployment, faucet] = await Promise.all([
      fetchApi("/contracts").catch(() => null),
      fetchApi("/faucet/status").catch(() => null),
    ]);
    if (!deployment && !faucet) throw new Error("Vibenet contract lookup did not respond");
    const valid = (value) => (typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value) ? value : null);
    const listed = valid(deployment?.usdv);
    const dripped = valid(faucet?.usdv_address);
    const address = listed || dripped;
    if (!address) return { address: null, reason: "Vibenet does not list a USDV contract" };
    if (listed && dripped && !P.same(listed, dripped)) return { address: null, reason: "Vibenet contracts and faucet report different USDV addresses" };
    if (faucet?.chain_id !== undefined && BigInt(faucet.chain_id) !== VIBENET_CHAIN_ID) return { address: null, reason: `Vibenet faucet reports chain ${faucet.chain_id}` };
    if (!(await hasCode(address))) return { address: null, reason: `USDV ${address} has no code on Vibenet` };
    const [decimals, symbol] = await Promise.all([ethCall(address, P.encode.decimals()), ethCall(address, P.encode.symbol())]);
    if (P.decode.uint(decimals) !== 6n) return { address: null, reason: "USDV on Vibenet does not report 6 decimals" };
    if (P.decode.string(symbol) !== "USDV") return { address: null, reason: "The listed Vibenet USDV contract reports a different symbol" };
    return { address, reason: null };
  };

  // Read-only capability probe. It never loads aa.txt and never writes: live
  // flows stay idle until the reader presses a step button.
  const probePayments = async () => {
    const [chainId, genesis, escrowCode, preCode, refundCode] = await Promise.all([
      rpcCall("eth_chainId", [], 5_000),
      genesisHashOf(),
      hasCode(P.ESCROW),
      hasCode(P.PRE_APPROVAL_COLLECTOR),
      hasCode(P.REFUND_COLLECTOR),
    ]);
    let reason = null;
    let usdv = null;
    if (BigInt(chainId) !== VIBENET_CHAIN_ID) reason = `Unexpected chain ${BigInt(chainId)}`;
    else if (!escrowCode || !preCode || !refundCode) reason = "Commerce Payments v1.1 contracts are not deployed on Vibenet";
    else {
      const [preEscrow, refundEscrow, preType, refundType] = await Promise.all([
        ethCall(P.PRE_APPROVAL_COLLECTOR, P.encode.authCaptureEscrow()),
        ethCall(P.REFUND_COLLECTOR, P.encode.authCaptureEscrow()),
        ethCall(P.PRE_APPROVAL_COLLECTOR, P.encode.collectorType()),
        ethCall(P.REFUND_COLLECTOR, P.encode.collectorType()),
      ]);
      if (!P.same(P.decode.address(preEscrow), P.ESCROW) || !P.same(P.decode.address(refundEscrow), P.ESCROW)
        || P.decode.uint(preType) !== 0n || P.decode.uint(refundType) !== 1n) {
        reason = "Vibenet collectors are not wired to AuthCaptureEscrow v1.1";
      }
    }
    if (!reason) {
      const token = await discoverUsdv();
      reason = token.reason;
      usdv = token.address;
    }
    return { live: !reason, reason, genesisHash: genesis, usdv };
  };

  // ----------------------------------------------------------------------
  // Color roles map to CSS custom properties defined in the <style> block,
  // so a single dark-theme block flips the whole demo. Values resolve at
  // render time; keep using C.* in inline styles exactly as before.
  // ----------------------------------------------------------------------
  const C = {
    blue: "var(--wf-blue)", onBlue: "var(--wf-on-blue)", cerulean: "var(--wf-cerulean)",
    ink: "var(--wf-ink)", body: "var(--wf-body)", sec: "var(--wf-sec)", sub: "var(--wf-sub)",
    border: "var(--wf-border)", panel: "var(--wf-panel)", white: "var(--wf-surface)",
    success: "var(--wf-success)", lime: "var(--wf-lime)", error: "var(--wf-error)", warn: "var(--wf-warn)",
    blueSoft: "var(--wf-blue-soft)", successSoft: "var(--wf-success-soft)", errorSoft: "var(--wf-error-soft)",
  };
  // Account markers use fixed brand hues that read on either theme.
  const dot = { Merchant: C.blue, Alice: "#66c800", Bob: "#8a63d2", Agent: "#3c8aff", "Payer & operator": "#66c800", Escrow: "#8a63d2" };

  const NETWORK = "Base Vibenet";

  // ---- result-line helpers ----
  const ok = (name, detail, href) => ({ kind: "ok", name, detail: detail || "", href });
  const err = (name, detail, href) => ({ kind: "err", name, detail: detail || "", href });
  const nfo = (name, detail, href) => ({ kind: "info", name, detail: detail || "", href });
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const M = (v) => ({ v, mono: true });

  const freshSim = () => ({ balances: {}, blocked: null });

  // ======================================================================
  // Scripted flows. Each step mutates a cloned sim and returns log lines.
  // ======================================================================
  const FLOWS = {
    simple: {
      label: "Transfer", title: "Send USDC directly to another wallet", readout: true,
      href: "https://developers.circle.com/stablecoins/usdc-contract-addresses",
      erc20: "A standard ERC-20 transfer moves USDC directly from the sender to the recipient.",
      steps: [
        { stage: "Prepare", action: "Enter payment",
          text: "Alice enters the recipient address and the amount of USDC to send.",
          summary: [["From", "Alice"], ["To", "Bob"], ["Amount", M("5.00 USDC")], ["Network", NETWORK]],
          run: (s) => { s.balances.Alice = 5; return { entries: [nfo("recipient", "Bob"), nfo("amount", "5.00 USDC")] }; } },
        { stage: "Send", action: "Send $5",
          text: "Alice signs the transfer and submits it directly to the USDC contract.",
          summary: [["Operation", "ERC-20 transfer"], ["From", "Alice"], ["To", "Bob"], ["Amount", M("5.00 USDC")]],
          run: (s) => { s.balances.Alice = 0; s.balances.Bob = 5; return { entries: [ok("Transfer", "Alice → Bob · 5.00 USDC"), ok("receipt", "confirmed")], caption: "Bob controls the USDC as soon as the transfer confirms." }; } }
      ],
    },
    accept: {
      label: "Accept", title: "Charge an escrow-backed payment", readout: true,
      href: "https://github.com/base/commerce-payments/blob/main/docs/operations/Charge.md",
      erc20: "The payer signs immutable terms; the operator collects and settles in one atomic transaction.",
      steps: [
        { stage: "Approve", action: "Approve $5",
          text: "Alice approves a 5 USDC protocol payment with the merchant, expiry, and fee bounds fixed.",
          summary: [["Operation", "Charge"], ["Receiver", "Merchant"], ["Payer", "Alice"], ["Maximum", M("5.00 USDC")], ["Network", NETWORK]],
          run: (s) => { s.balances.Alice = 5; return { entries: [ok("PaymentInfo", "terms fixed"), ok("collector signature", "5.00 USDC")], caption: "The signature authorizes collection; it is not settlement yet." }; } },
        { stage: "Charge", action: "Submit charge",
          text: "The operator submits charge, pays gas, and settles the payment atomically.",
          summary: [["Caller", "Operator"], ["From", "Alice"], ["To", "Merchant"], ["Amount", M("5.00 USDC")], ["State", "Refundable"]],
          run: (s) => { s.balances.Alice = 0; s.balances.Merchant = 5; s.refundable = 5; return { entries: [ok("PaymentCharged", "5.00 USDC"), nfo("refundableAmount", "5.00 USDC")], caption: "A successful PaymentCharged event is the settlement signal." }; } },
      ],
    },
    verify: {
      label: "Verify", title: "Confirm a protocol payment before you ship", readout: false,
      href: "https://github.com/base/commerce-payments/blob/main/src/AuthCaptureEscrow.sol",
      erc20: "Never trust the browser — confirm AuthCaptureEscrow events and payment state server-side.",
      steps: [
        { stage: "Receive", action: "Send hash",
          text: "Your frontend sends the settlement transaction and expected paymentInfoHash to your backend.",
          summary: [["Endpoint", M("POST /orders/confirm")], ["Transaction", M("0x9f…c2")], ["Payment hash", M("0xa7…91")]],
          run: () => ({ entries: [nfo("POST", "/orders/confirm"), nfo("paymentInfoHash", "0xa7…91")] }) },
        { stage: "Verify", action: "Decode event",
          text: "Confirm PaymentCharged or PaymentCaptured came from the v1.1 escrow and matches the order.",
          summary: [["Contract", "AuthCaptureEscrow"], ["Event", "PaymentCharged"], ["Amount", M("5.00 USDC")], ["State", "Refundable"]],
          run: () => ({ entries: [ok("PaymentCharged", "0xa7…91 · 5.00 USDC"), ok("paymentState", "refundable 5.00")], caption: "Protocol events identify the lifecycle operation; raw token transfers do not." }) },
        { stage: "Replay", action: "Replay event",
          text: "A database uniqueness constraint rejects the same event a second time.",
          summary: [["Event key", M("chain + tx + logIndex")], ["Result", "Already processed"], ["Fulfillment", "Rejected"]],
          run: () => ({ entries: [err("rejected", "event already processed")], caption: "Claim the event in the same durable workflow as fulfillment." }) },
      ],
    },
    b20: {
      label: "B20", title: "Accept and reconcile a B20 payment", readout: false,
      href: "https://github.com/base/commerce-payments/blob/main/docs/TokenCollectors.md",
      erc20: "A B20 memo ties the payment to your order without assigning a deposit address per customer.",
      steps: [
        { stage: "Pay", action: "Pay order",
          text: "Alice pays 25 EXM and includes the order reference in the same transaction.",
          summary: [["Payment type", "B20 transfer"], ["Payer", "Alice"], ["Merchant", "Merchant"], ["Amount", M("25 EXM")], ["Memo", M('"order-8842"')]],
          run: () => ({ entries: [ok("Transfer", "Alice → Merchant · 25 EXM"), ok("Memo", '"order-8842"')], caption: "transferWithMemo emits the standard transfer and its bytes32 reference together." }) },
        { stage: "Match", action: "Reconcile",
          text: "Your backend reads the receipt and matches the payment to the order.",
          summary: [["Operation", "Reconcile"], ["Source", M("parseEventLogs")], ["Matched", M("order-8842")], ["Amount", M("25 EXM")]],
          run: () => ({ entries: [nfo("parseEventLogs", "Transfer + Memo"), ok("matched", 'order-8842 · 25 EXM · Alice')], caption: "The payment can still be rejected by the token's holder policy or transfer pause." }) },
      ],
    },
    x402: {
      label: "Agent pays", title: "Let an agent pay per API call", readout: false,
      href: "https://github.com/base/commerce-payments",
      erc20: "Agents pay for data and services autonomously, one request at a time.",
      steps: [
        { stage: "Request", action: "Call API",
          text: "Your agent calls a paid API. It returns 402 Payment Required.",
          summary: [["Operation", "Agent request"], ["Endpoint", M("GET /v1/market-report")], ["Response", M("402 Payment Required")], ["Amount", M("0.02 USDC")]],
          run: () => ({ entries: [nfo("GET", "/v1/market-report"), err("402", "Payment Required · 0.02 USDC")] }) },
        { stage: "Pay", action: "Pay & retry",
          text: "The x402 client pays and retries automatically.",
          summary: [["Payment type", "x402"], ["Payer", "Agent"], ["Amount", M("0.02 USDC")], ["Response", M("200 OK")], ["Network", NETWORK]],
          run: () => ({ entries: [ok("x402", "paid 0.02 USDC on Base"), ok("200", "report delivered")], caption: "A wrapped fetch turns a 402 into a paid, completed request." }) },
        { stage: "Cap", action: "Enforce cap",
          text: "You cap spend so an agent never overpays.",
          summary: [["Operation", "Spend cap"], ["Requested", M("0.50 USDC")], ["maxValue", M("0.10 USDC")], ["Result", "Blocked"]],
          run: () => ({ entries: [err("blocked", "0.50 > maxValue 0.10")], caption: "Set a per-request cap; anything above it is refused." }) },
      ],
    },
    authorize: {
      label: "Authorize", title: "Reserve funds in protocol escrow", readout: false,
      href: "https://github.com/base/commerce-payments/blob/main/docs/operations/Authorize.md",
      metrics: (s) => [["Authorization", s.authorization || "Not submitted"], ["Capturable", M(`${s.capturable || 0}.00 USDC`)]],
      erc20: "The payer approves immutable terms; the operator moves funds into escrow before fulfillment.",
      steps: [
        { stage: "Terms", action: "Set terms", text: "Bind the operator, payer, receiver, maximum, expiries, fees, and a unique salt.",
          summary: [["Maximum", M("25.00 USDC")], ["Receiver", "Merchant"], ["Capture window", "7 days"], ["Payment hash", M("0xa7…91")]],
          run: (s) => { s.authorization = "Terms ready"; return { entries: [nfo("PaymentInfo", "25.00 USDC · expires in 7d")] }; } },
        { stage: "Approve", action: "Sign collector", text: "Alice signs the ERC-3009 collector authorization for this payment.",
          summary: [["Collector", "ERC-3009"], ["Signer", "Alice"], ["Maximum", M("25.00 USDC")], ["Settlement", "Not yet"]],
          run: (s) => { s.authorization = "Signed · not collected"; return { entries: [ok("collector signature", "stored"), nfo("capturableAmount", "0.00")], caption: "A signature alone does not reserve funds." }; } },
        { stage: "Escrow", action: "Authorize $25", text: "The operator submits authorize and the collector moves 25 USDC into its token store.",
          summary: [["Caller", "Operator"], ["Amount", M("25.00 USDC")], ["State", "Capturable"], ["Payer gas", M("0")]],
          run: (s) => { s.authorization = "Authorized"; s.capturable = 25; return { entries: [ok("PaymentAuthorized", "25.00 USDC"), ok("capturableAmount", "25.00")], caption: "The confirmed onchain authorization is the funds guarantee." }; } },
      ],
    },
    capture: {
      label: "Capture", title: "Capture an escrowed authorization", readout: true,
      href: "https://github.com/base/commerce-payments/blob/main/docs/operations/Capture.md",
      metrics: (s) => [["Capturable", M(`${s.capturable ?? 25}.00 USDC`)], ["Refundable", M(`${s.refundable || 0}.00 USDC`)]],
      erc20: "Capture settles funds already held in the operator token store; it does not contact the payer again.",
      steps: [
        { stage: "Check", action: "Check state", text: "Confirm the payment has 25 USDC capturable and has not reached authorization expiry.",
          summary: [["Payment hash", M("0xa7…91")], ["Capturable", M("25.00 USDC")], ["Expiry", "In 3 days"]],
          run: (s) => { s.capturable = 25; s.refundable = 0; return { entries: [ok("paymentState", "capturable 25.00"), ok("deadline", "open")] }; } },
        { stage: "Capture", action: "Capture $25", text: "The operator captures the gross amount and supplies an absolute fee within the payer-approved bounds.",
          summary: [["Gross", M("25.00 USDC")], ["Fee", M("0.00 USDC")], ["Receiver", "Merchant"], ["State", "Refundable"]],
          run: (s) => { s.capturable = 0; s.refundable = 25; s.balances.Merchant = 25; return { entries: [ok("PaymentCaptured", "25.00 USDC"), nfo("refundableAmount", "25.00")], caption: "Capture converts capturable value into refundable settled value." }; } },
      ],
    },
    partial: {
      label: "Variable", title: "Capture below the authorized amount", readout: true,
      href: "https://github.com/base/commerce-payments/blob/main/docs/operations/Capture.md",
      metrics: (s) => [["Capturable", M(`${s.capturable ?? 100}.00 USDC`)], ["Refundable", M(`${s.refundable || 0}.00 USDC`)]],
      erc20: "One authorization can settle through multiple captures; the escrow tracks the remainder onchain.",
      steps: [
        { stage: "Authorize", action: "Authorize max", text: "Alice authorizes 100 USDC and the operator moves it into escrow.",
          summary: [["Authorized", M("100.00 USDC")], ["Capturable", M("100.00 USDC")], ["Receiver", "Merchant"]],
          run: (s) => { s.capturable = 100; s.refundable = 0; return { entries: [ok("PaymentAuthorized", "100.00 USDC")] }; } },
        { stage: "Finalize", action: "Set total", text: "The merchant computes a final fulfilled total of 64 USDC.",
          summary: [["Authorized", M("100.00 USDC")], ["Final total", M("64.00 USDC")], ["Remainder", M("36.00 USDC")]],
          run: () => ({ entries: [nfo("order total", "64.00 USDC")], caption: "No new payer signature is required." }) },
        { stage: "Capture", action: "Capture $64", text: "Capture 64 USDC and leave 36 USDC available to capture or void.",
          summary: [["Captured", M("64.00 USDC")], ["Capturable", M("36.00 USDC")], ["Refundable", M("64.00 USDC")]],
          run: (s) => { s.capturable = 36; s.refundable = 64; s.balances.Merchant = 64; return { entries: [ok("PaymentCaptured", "64.00 USDC"), nfo("capturableAmount", "36.00")] }; } },
      ],
    },
    void: {
      label: "Void", title: "Return an unused escrow balance", readout: false,
      href: "https://github.com/base/commerce-payments/blob/main/docs/operations/Void.md",
      metrics: (s) => [["Payment state", s.authorization || "Authorized"], ["Capturable", M(`${s.capturable ?? 25}.00 USDC`)]],
      erc20: "The operator can void now; the payer can reclaim the same remainder after authorization expiry.",
      steps: [
        { stage: "Decide", action: "Cancel order", text: "Stop capture workers and confirm the remaining authorization should return to Alice.",
          summary: [["Order", M("order-8842")], ["Capturable", M("25.00 USDC")], ["Captured", M("0.00 USDC")]],
          run: (s) => { s.authorization = "Canceling"; s.capturable = 25; return { entries: [nfo("order", "capture disabled")] }; } },
        { stage: "Void", action: "Return $25", text: "The operator calls void and the token store returns the full capturable amount.",
          summary: [["Caller", "Operator"], ["Recipient", "Alice"], ["Returned", M("25.00 USDC")], ["Capturable", M("0.00 USDC")]],
          run: (s) => { s.authorization = "Voided"; s.capturable = 0; return { entries: [ok("PaymentVoided", "25.00 USDC"), nfo("later capture", "reverts")], caption: "If the operator is inactive, Alice can reclaim after expiry instead." }; } },
      ],
    },
    schedule: {
      label: "Schedule", title: "Charge one protocol payment per billing period", readout: true,
      href: "https://github.com/base/commerce-payments/blob/main/docs/TokenCollectors.md#spendpermissionpaymentcollector",
      metrics: (s) => [["Billing period", s.period || "Not charged"], ["Refundable", M(`${s.refundable || 0}.00 USDC`)]],
      erc20: "A spend permission can fund repeated collection, but every protocol charge needs fresh PaymentInfo and salt.",
      steps: [
        { stage: "Prepare", action: "Create period", text: "Create August PaymentInfo and reserve the durable billing key before submission.",
          summary: [["Billing key", M("sub-42:2026-08")], ["Amount", M("8.00 USDC")], ["Collector", "Spend permission"]],
          run: (s) => { s.period = "2026-08 · reserved"; return { entries: [ok("billing key", "reserved"), nfo("salt", "fresh")] }; } },
        { stage: "Charge", action: "Charge $8", text: "The operator calls charge through SpendPermissionPaymentCollector.",
          summary: [["Operation", "Charge"], ["Amount", M("8.00 USDC")], ["Payer gas", M("0")], ["State", "Refundable"]],
          run: (s) => { s.period = "2026-08 · charged"; s.refundable = 8; s.balances.Merchant = 8; return { entries: [ok("PaymentCharged", "8.00 USDC"), nfo("refundableAmount", "8.00")], caption: "Your scheduler creates the next payment; the protocol does not schedule itself." }; } },
      ],
    },
    x402Upto: {
      label: "Usage", title: "Settle actual API usage below a maximum", readout: false,
      href: "https://github.com/base/commerce-payments",
      metrics: (s) => [["Authorized maximum", M("0.10 USDC")], ["Settled actual", M(`${s.usageCharge || "0.00"} USDC`)]],
      erc20: "x402 upto separates the maximum a buyer approves from the amount a successful handler settles.",
      steps: [
        { stage: "Authorize", action: "Authorize max", text: "The 402 response advertises a maximum price of 0.10 USDC.",
          summary: [["Scheme", M("upto")], ["Maximum", M("0.10 USDC")], ["Endpoint", M("GET /metered")]],
          run: () => ({ entries: [ok("authorization", "up to 0.10 USDC")] }) },
        { stage: "Measure", action: "Run workload", text: "The protected handler measures 812 generated tokens.",
          summary: [["Usage", M("812 tokens")], ["Calculated charge", M("0.04 USDC")]],
          run: (s) => { s.usageCharge = "0.04"; return { entries: [nfo("usage", "812 tokens"), nfo("settlement override", "0.04 USDC")] }; } },
        { stage: "Settle", action: "Settle $0.04", text: "The facilitator settles the actual charge, not the maximum.",
          summary: [["Maximum", M("0.10 USDC")], ["Actual", M("0.04 USDC")], ["Response", M("200 OK")]],
          run: () => ({ entries: [ok("settlement", "0.04 USDC"), ok("200", "response delivered")] }) },
      ],
    },
    x402Batch: {
      label: "Batch", title: "Settle many small API calls as a channel", readout: false,
      href: "https://github.com/base/commerce-payments",
      metrics: (s) => [["Latest voucher", M(`${s.voucher || "0.00"} USDC`)], ["Onchain claims", String(s.claims || 0)]],
      erc20: "Cumulative vouchers keep per-call latency offchain while the latest channel state remains claimable.",
      steps: [
        { stage: "Open", action: "Open channel", text: "The buyer funds a channel and starts at a zero cumulative voucher.",
          summary: [["Scheme", M("batch-settlement")], ["Channel", M("0x51…aa")], ["Voucher", M("0.00 USDC")]],
          run: (s) => { s.voucher = "0.00"; s.claims = 0; return { entries: [ok("channel", "opened") ] }; } },
        { stage: "Advance", action: "Process calls", text: "Ten API calls advance one signed cumulative voucher.",
          summary: [["Calls", "10"], ["Price per call", M("0.01 USDC")], ["Latest voucher", M("0.10 USDC")]],
          run: (s) => { s.voucher = "0.10"; return { entries: [nfo("voucher", "0.10 USDC cumulative")], caption: "Store the newest voucher atomically; older vouchers must never replace it." }; } },
        { stage: "Claim", action: "Claim batch", text: "The receiver submits the latest voucher once.",
          summary: [["Settled", M("0.10 USDC")], ["Requests covered", "10"], ["Transactions", "1"]],
          run: (s) => { s.claims = 1; return { entries: [ok("claim", "0.10 USDC · 10 calls")] }; } },
      ],
    },
    x402Buyer: {
      label: "Agent buys", title: "Apply policy before an agent pays", readout: false,
      href: "https://github.com/base/commerce-payments",
      erc20: "The x402 wrapper retries automatically, but your local wallet policy remains the final signing gate.",
      steps: [
        { stage: "Discover", action: "Read 402", text: "The agent receives payment requirements from the service.",
          summary: [["Network", M("eip155:84532")], ["Asset", "Base Sepolia USDC"], ["Amount", M("0.02 USDC")]],
          run: () => ({ entries: [err("402", "Payment Required"), nfo("requirements", "exact · 0.02 USDC")] }) },
        { stage: "Policy", action: "Check policy", text: "Reject wrong networks, wrong tokens, and spend above either cap.",
          summary: [["Per request", M("≤ 0.10 USDC")], ["Per session", M("≤ 1.00 USDC")], ["Decision", "Allow"]],
          run: () => ({ entries: [ok("network", "allowed"), ok("asset", "allowed"), ok("spend", "within cap")] }) },
        { stage: "Retry", action: "Pay & retry", text: "The wallet signs, the wrapper retries, and the agent validates the response.",
          summary: [["Paid", M("0.02 USDC")], ["Response", M("200 OK")], ["Validation", "Schema checked"]],
          run: () => ({ entries: [ok("payment", "0.02 USDC"), ok("response", "validated")], caption: "Paid content is still untrusted input." }) },
      ],
    },
    watch: {
      label: "Watch", title: "Watch and backfill protocol events", readout: false,
      href: "https://github.com/base/commerce-payments/blob/main/src/AuthCaptureEscrow.sol",
      metrics: (s) => [["Confirmed cursor", M(s.cursor || "#21,499,988")], ["Indexed events", String(s.indexed || 0)]],
      erc20: "WebSocket events wake the worker; an overlapping AuthCaptureEscrow log scan restores canonical state.",
      steps: [
        { stage: "Subscribe", action: "Subscribe", text: "Listen for lifecycle events from the v1.1 AuthCaptureEscrow address.",
          summary: [["Contract", "AuthCaptureEscrow"], ["Events", "6 lifecycle events"], ["Status", "Connected"]],
          run: () => ({ entries: [ok("subscription", "PaymentAuthorized → PaymentRefunded")] }) },
        { stage: "Confirm", action: "Wait 12 blocks", text: "Hold candidates until they pass your confirmation policy.",
          summary: [["Head", M("#21,500,012")], ["Confirmed through", M("#21,500,000")], ["Depth", "12 blocks"]],
          run: (s) => { s.cursor = "#21,500,000"; return { entries: [nfo("confirmations", "12 blocks")] }; } },
        { stage: "Backfill", action: "Replace window", text: "Rescan an overlap and replace stored rows in one database transaction.",
          summary: [["From", M("#21,499,988")], ["To", M("#21,500,000")], ["New events", "3"]],
          run: (s) => { s.indexed = 3; return { entries: [ok("eth_getLogs", "3 canonical events"), ok("cursor", "advanced")], caption: "Key every row by chain, contract, transaction, and log index." }; } },
      ],
    },
    reconcile: {
      label: "Reconcile", title: "Turn protocol events into settlement rows", readout: false,
      href: "https://github.com/base/commerce-payments/blob/main/src/AuthCaptureEscrow.sol",
      metrics: (s) => [["Rows exported", String(s.rows || 0)], ["Unmatched", String(s.unmatched || 0)]],
      erc20: "paymentInfoHash joins charges, captures, fees, voids, reclaims, and refunds to one order lifecycle.",
      steps: [
        { stage: "Query", action: "Query range", text: "Fetch finalized AuthCaptureEscrow events for the accounting window.",
          summary: [["From block", M("#21,400,000")], ["To block", M("#21,499,999")], ["Version", "v1.1.0"]],
          run: (s) => { s.rows = 7; s.unmatched = 0; return { entries: [ok("eth_getLogs", "7 protocol events")] }; } },
        { stage: "Reduce", action: "Reduce state", text: "Apply events in chain order and reconcile capturable and refundable balances.",
          summary: [["Charges", "2"], ["Captures", "3"], ["Refunds", "1"], ["Returns", "1"]],
          run: () => ({ entries: [ok("paymentState", "event ledger matches chain")] }) },
        { stage: "Export", action: "Export report", text: "Write gross, fee, merchant net, and refund rows keyed by paymentInfoHash.",
          summary: [["Rows", "7"], ["Gross and fees", "Separated"], ["Format", "CSV"]],
          run: () => ({ entries: [ok("report", "7 rows exported")], caption: "Refund limits use gross captured value, not merchant net." }) },
      ],
    },
    refund: {
      label: "Refund", title: "Refund captured protocol value", readout: true,
      href: "https://github.com/base/commerce-payments/blob/main/docs/operations/Refund.md",
      metrics: (s) => [["Refundable", M(`${s.refundable || 5}.00 USDC`)]],
      erc20: "The protocol enforces the refund limit; a refund collector supplies replacement liquidity.",
      steps: [
        { stage: "Check", action: "Read state", text: "Confirm the payment has 5 USDC refundable and remains before refund expiry.",
          summary: [["Payment hash", M("0xa7…91")], ["Refundable", M("5.00 USDC")], ["Requested", M("2.00 USDC")]],
          run: (s) => { s.refundable = 5; return { entries: [ok("paymentState", "refundable 5.00")] }; } },
        { stage: "Fund", action: "Approve $2", text: "The operator approves OperatorRefundCollector for 2 USDC of refund liquidity.",
          summary: [["Liquidity source", "Operator"], ["Collector", "OperatorRefundCollector"], ["Amount", M("2.00 USDC")]],
          run: () => ({ entries: [ok("Approval", "2.00 USDC")], caption: "Refund accounting is not liquidity; the funds must be supplied again." }) },
        { stage: "Refund", action: "Refund $2", text: "The operator calls refund and the protocol returns tokens to the original payer.",
          summary: [["Recipient", "Alice"], ["Amount", M("2.00 USDC")], ["Remaining", M("3.00 USDC")]],
          run: (s) => { s.refundable = 3; s.balances.Alice = 2; return { entries: [ok("PaymentRefunded", "2.00 USDC"), nfo("refundableAmount", "3.00")] }; } },
      ],
    },
    payout: {
      label: "Payout", title: "Send one referenced payout batch", readout: false,
      href: "https://github.com/base/commerce-payments",
      metrics: (s) => [["Recipients paid", String(s.recipientsPaid || 0)], ["Total", M(`${s.payoutTotal || 0}.00 USDC`)]],
      erc20: "A bounded payout contract pulls tokens directly from sender to recipients and emits one reference per leg.",
      steps: [
        { stage: "Approve", action: "Approve total", text: "Approve the payout contract for exactly the planned batch total.",
          summary: [["Batch", M("payroll-2026-08")], ["Recipients", "3"], ["Total", M("300.00 USDC")]],
          run: () => ({ entries: [ok("Approval", "300.00 USDC → Payout") ] }) },
        { stage: "Send", action: "Send batch", text: "The contract transfers each amount directly and emits the shared batch reference.",
          summary: [["Alice", M("120.00 USDC")], ["Bob", M("100.00 USDC")], ["Carol", M("80.00 USDC")]],
          run: (s) => { s.recipientsPaid = 3; s.payoutTotal = 300; return { entries: [ok("PayoutSent", "Alice · 120.00"), ok("PayoutSent", "Bob · 100.00"), ok("PayoutSent", "Carol · 80.00")] }; } },
      ],
    },
    split: {
      label: "Split", title: "Split one amount without stranded dust", readout: false,
      href: "https://github.com/base/commerce-payments",
      metrics: (s) => [["Distributed", M(`${s.distributed || 0} units`)], ["Contract balance", M("0 units")]],
      erc20: "Basis-point math rounds down; assigning the remainder makes the split equal the input exactly.",
      steps: [
        { stage: "Define", action: "Define shares", text: "Set seller, platform, and referrer shares that total 10,000 basis points.",
          summary: [["Seller", "9,500 bps"], ["Platform", "400 bps"], ["Referrer", "100 bps"]],
          run: () => ({ entries: [ok("shares", "10,000 bps") ] }) },
        { stage: "Calculate", action: "Calculate legs", text: "Round each leg down and assign the remainder unit to the seller.",
          summary: [["Input", M("10,001 units")], ["Floor sum", M("10,000 units")], ["Remainder", M("1 unit → Seller")]],
          run: () => ({ entries: [nfo("rounding", "1 remainder unit assigned") ] }) },
        { stage: "Distribute", action: "Send split", text: "Pull each leg directly from the payer to its recipient in one transaction.",
          summary: [["Distributed", M("10,001 units")], ["Dust", M("0 units")], ["Reference", M("split-2026-08")]],
          run: (s) => { s.distributed = "10,001"; return { entries: [ok("PayoutSent", "3 referenced legs"), ok("sum", "10,001 units") ] }; } },
      ],
    },
  };

  const order = ["accept", "authorize", "capture", "x402", "verify", "refund", "payout"];
  const invalidFlow = flow && !FLOWS[flow];
  const pinned = flow && FLOWS[flow] ? flow : null;

  // ======================================================================
  // Live Vibenet flows. Each pinned flow mints its own USDV from Vibenet's
  // existing permissionless USDV token and creates its own payment, so it never
  // depends on state left behind by another page. Every success line is derived
  // from a transaction receipt plus a follow-up read of token or escrow state;
  // anything that cannot be verified throws instead.
  // ======================================================================
  const TOKEN = "USDV";
  const PAYER = "Payer & operator";
  const short = (value) => (value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "");
  const txHref = (hash) => `${EXPLORER_URL}/tx/${hash}`;
  const addrHref = (address) => `${EXPLORER_URL}/address/${address}`;
  const show = (engine, raw) => `${engine.displayUnits(raw).toFixed(2)} ${TOKEN}`;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const abortError = (message) => Object.assign(new Error(message), { abort: true });
  const randomSalt = () => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return BigInt(`0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`);
  };
  const revertData = (error) => {
    const data = error?.data;
    return typeof data === "string" ? data : typeof data?.data === "string" ? data.data : null;
  };

  // Reads right after a receipt can reach an RPC replica one block behind, so
  // poll briefly for the expected value and fail loudly if it never appears.
  const settle = async (read, check, label) => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const value = await read();
      if (check(value)) return value;
      await sleep(300);
    }
    throw new Error(`${label} did not reach the expected onchain value`);
  };
  const readPaymentState = async (hash) => P.decode.paymentState(await ethCall(P.ESCROW, P.encode.paymentState(hash)));
  const tokenBalance = async (token, holder) => P.decode.uint(await ethCall(token, P.encode.balanceOf(holder)));
  const tokenAllowance = async (token, owner, spender) => P.decode.uint(await ethCall(token, P.encode.allowance(owner, spender)));
  const expectState = (ctx, capturable, refundable) => settle(
    () => readPaymentState(ctx.hash),
    (s) => s.hasCollectedPayment && s.capturableAmount === capturable && s.refundableAmount === refundable,
    `paymentState(${short(ctx.hash)})`,
  );
  const expectBalance = (ctx, holder, amount, label) => settle(() => tokenBalance(ctx.token, holder), (v) => v === amount, `${label} balance`);
  const expectAllowance = (ctx, spender, amount, label) => settle(() => tokenAllowance(ctx.token, ctx.account, spender), (v) => v === amount, `${label} allowance`);

  // eth_call each write from the demo account first so a protocol revert is
  // reported by name without spending a transaction.
  const preflight = async (ctx, to, data, label) => {
    try {
      await ethCall(to, data, ctx.account);
    } catch (error) {
      if (!error?.rpc) throw error;
      const name = P.revertName(revertData(error)) || error.message || "execution reverted";
      throw new Error(`${label} would revert on Vibenet (${name}). Nothing was sent for this step.`);
    }
  };
  // Exclusive run lease. Every live run with the same chain, genesis, demo
  // account, and USDV token shares one USDV balance and one allowance per
  // collector, so a second run's approve would overwrite the first run's
  // allowance between its steps. engine.sendCalls serializes single
  // transactions only; this lease serializes whole multistep runs across every
  // widget on the page and every tab of this origin. It is a Web Locks API
  // exclusive lock, requested with ifAvailable so a busy lease is refused
  // instead of queued. There is deliberately no localStorage fallback: without
  // navigator.locks the live demo sends nothing.
  const runLeaseKey = ({ genesisHash, account, token }) =>
    ["base-docs-payments-demo", "v1", VIBENET_CHAIN_ID, genesisHash, account, token].map((part) => String(part).toLowerCase()).join(":");
  const acquireRunLease = async (locks, key) => {
    if (!locks || typeof locks.request !== "function") {
      throw Object.assign(new Error("This browser does not support the Web Locks API, which the live demo needs so two runs never share one USDV balance and allowance. Nothing was sent. Open this page in a current browser to run it live"), { lease: true });
    }
    let unlock;
    const hold = new Promise((resolve) => { unlock = resolve; });
    let held = false;
    const granted = await new Promise((resolve, reject) => {
      locks.request(key, { mode: "exclusive", ifAvailable: true }, (lock) => {
        if (!lock) { resolve(false); return null; }
        held = true;
        resolve(true);
        return hold;
      }).then(() => { held = false; }, (error) => { held = false; reject(error); });
    });
    if (!granted) {
      throw Object.assign(new Error("Another live Payments demo is already running with this Vibenet account and USDV, on this page or in another tab. Finish or reset that run, then try again. Nothing was sent"), { lease: true });
    }
    return { key, held: () => held, release: () => { held = false; unlock(); } };
  };
  // Owns one widget's lease. Reset, completion, and abort release it at once.
  // Unmount releases it at once when idle; while a step is in flight it stays
  // held until that step settles, because a transaction already handed to the
  // engine is not recalled and must not race another run. A submission whose
  // outcome is unknown pins the lease: release, reset, and unmount are no-ops
  // until the pinned reconciliation settles with a verified outcome.
  const createLeaseSlot = () => {
    let lease = null;
    let inFlight = 0;
    let closed = false;
    let pinned = null;
    const drop = () => { const current = lease; lease = null; if (current) current.release(); };
    const release = () => { if (pinned) return false; drop(); return true; };
    return {
      hold: (next) => { lease = next; },
      release,
      begin: () => { inFlight += 1; },
      end: () => { inFlight -= 1; if (closed && inFlight === 0) release(); },
      mount: () => { closed = false; },
      unmount: () => { closed = true; if (inFlight === 0) release(); },
      pinned: () => pinned !== null,
      pin: (reconciliation) => {
        const token = {};
        pinned = token;
        return Promise.resolve(reconciliation).then((outcome) => {
          if (pinned === token) { pinned = null; drop(); }
          return outcome;
        });
      },
    };
  };

  // Checked immediately before every write is initiated. Once the demo unmounts
  // (for example, SPA navigation), the step stops before its next transaction.
  // A transaction already handed to the engine is not recalled. No write is
  // initiated unless this run still holds its exclusive lease.
  const beforeWrite = (ctx) => {
    if (!ctx.isMounted()) throw Object.assign(new Error("The demo closed, so no further transactions were sent"), { abort: true, unmounted: true });
    if (typeof ctx.leaseHeld !== "function" || ctx.leaseHeld() !== true) {
      throw Object.assign(new Error("This run no longer holds its exclusive demo lease, so no further transactions were sent. Reset the demo to start a new payment"), { abort: true });
    }
  };
  const receiptSucceeded = (receipt) => {
    const phases = receipt?.phaseStatuses || receipt?.eip8130?.phaseStatuses || [];
    return receipt?.status === "0x1" && !phases.some((status) => status !== "0x1" && status !== "0x01");
  };
  const TX_HASH = /^0x[0-9a-fA-F]{64}$/;
  // A receipt is an outcome only if it is a mined receipt for the expected
  // transaction: a final status (0x1 or 0x0), the same transaction hash, and
  // a real block hash and number. Anything else, including an empty object,
  // proves nothing about the submission and leaves it pending.
  const verifiedReceipt = (receipt, hash) => Boolean(
    receipt && typeof receipt === "object"
    && TX_HASH.test(hash || "")
    && (receipt.status === "0x1" || receipt.status === "0x0")
    && typeof receipt.transactionHash === "string" && receipt.transactionHash.toLowerCase() === hash.toLowerCase()
    && TX_HASH.test(receipt.blockHash || "") && !/^0x0{64}$/.test(receipt.blockHash)
    && typeof receipt.blockNumber === "string" && /^0x[0-9a-fA-F]{1,64}$/.test(receipt.blockNumber),
  );
  // Once engine.sendCalls starts, only two failures are final: the engine
  // says it stopped before eth_sendRawTransaction (notSent), or a verified
  // receipt for its hash came back. Anything else may have reached the node,
  // including a malformed or mismatched receipt and errors from an
  // older cached engine that does not classify them, so it is marked pending
  // with the transaction hash when known. A missing receipt never proves the
  // transaction was not sent.
  const send = async (engine, ctx, calls, metadata) => {
    beforeWrite(ctx);
    ctx.stepWrote = true;
    let tx;
    try {
      tx = await engine.sendCalls({ calls, metadata, gasFloor: 900_000n });
    } catch (error) {
      if (error?.notSent || verifiedReceipt(error?.receipt, error?.hash)) throw error;
      throw Object.assign(error instanceof Error ? error : new Error(String(error)), {
        pending: true,
        hash: TX_HASH.test(error?.hash || "") ? error.hash : null,
      });
    }
    const receipt = tx?.receipt;
    if (!verifiedReceipt(receipt, tx?.hash)) {
      throw Object.assign(new Error(receipt ? "Vibenet returned a receipt that does not verify this transaction" : "Vibenet returned no receipt for this transaction"), { pending: true, hash: TX_HASH.test(tx?.hash || "") ? tx.hash : null });
    }
    if (!receiptSucceeded(receipt)) {
      throw Object.assign(new Error(`Transaction ${tx?.hash || ""} did not succeed onchain`), { hash: tx?.hash, receipt });
    }
    return tx;
  };
  // Resolves only with a verified outcome for a pending submission: its
  // receipt (success or revert), or a Vibenet reset (the genesis hash changed,
  // so the chain the transaction targeted no longer exists). Read failures and
  // missing or unverified receipts are not outcomes. Checks back off from 2 s to one per
  // minute. Without a hash only a reset can end it, so the lease stays held
  // until then or until the tab closes.
  const reconcileSubmission = async ({ hash, genesisHash, readReceipt, readGenesis, wait }) => {
    for (let attempt = 0; ; attempt += 1) {
      await wait(Math.min(2_000 * 2 ** attempt, 60_000));
      const genesis = await readGenesis().catch(() => null);
      if (validGenesis(genesis) && validGenesis(genesisHash) && genesis.toLowerCase() !== genesisHash.toLowerCase()) return { outcome: "reset", hash };
      if (!hash) continue;
      const receipt = await readReceipt(hash).catch(() => null);
      if (verifiedReceipt(receipt, hash)) return { outcome: receiptSucceeded(receipt) ? "success" : "reverted", hash, receipt };
    }
  };

  // Before every step after the first: the chain, the escrow, the USDV token,
  // and the browser account must be the ones this flow started with.
  const guard = async (engine, ctx) => {
    const [genesis, escrowLive] = await Promise.all([genesisHashOf(), hasCode(P.ESCROW)]);
    if (genesis !== ctx.genesisHash || !escrowLive) {
      throw abortError("Vibenet was reset after this flow started, so the balances and payment from earlier steps no longer exist. Reset the demo to start a new payment.");
    }
    const usdv = await discoverUsdv();
    if (!usdv.address || !P.same(usdv.address, ctx.token)) {
      throw abortError(`The Vibenet USDV token changed after this flow started (${usdv.reason || `now ${short(usdv.address)}`}). Reset the demo to start a new payment.`);
    }
    const shared = await engine.getSharedAccount();
    if (!P.same(shared.account.address, ctx.account)) {
      throw abortError("The Vibenet demo account in this browser changed after this flow started. Reset the demo to start a new payment.");
    }
  };

  // USDV is shared and long-lived, so the demo account and the operator token
  // store can hold USDV from earlier runs. Escrow shows only this payment's
  // capturable amount, read from the escrow.
  const refreshBalances = async (engine, ctx, s) => {
    const [payer, merchant, state] = await Promise.all([
      tokenBalance(ctx.token, ctx.account),
      tokenBalance(ctx.token, ctx.receiver),
      ctx.hash ? readPaymentState(ctx.hash) : Promise.resolve(null),
    ]);
    s.balances = { [PAYER]: engine.displayUnits(payer), Merchant: engine.displayUnits(merchant) };
    if (state !== null) s.balances.Escrow = engine.displayUnits(state.capturableAmount);
  };
  const applyState = (engine, ctx, s, state) => {
    s.hash = ctx.hash;
    s.capturable = engine.displayUnits(state.capturableAmount);
    s.refundable = engine.displayUnits(state.refundableAmount);
  };

  // USDV's mint(address,uint256) is permissionless on Vibenet, so the demo
  // account mints to itself in an ordinary EIP-8130 transaction. Success needs
  // the mint Transfer in the receipt and the matching balance increase.
  const mintUsdv = async (engine, ctx, whole, label) => {
    const amount = engine.units(whole);
    const before = await tokenBalance(ctx.token, ctx.account);
    const data = P.encode.mint(ctx.account, amount);
    await preflight(ctx, ctx.token, data, "USDV mint");
    const tx = await send(engine, ctx, [{ to: ctx.token, data }], `Mint ${whole} USDV`);
    if (P.transferred(tx.receipt, ctx.token, P.ZERO_ADDRESS, ctx.account) !== amount) {
      throw Object.assign(new Error("The USDV mint Transfer was not in the receipt"), { hash: tx.hash });
    }
    await expectBalance(ctx, ctx.account, before + amount, label);
    return [ok("Transfer", `USDV ${short(ctx.token)} · 0x0 → ${label.toLowerCase()} · ${show(engine, amount)} · not USDC`, txHref(tx.hash))];
  };

  const newPayment = async (engine, ctx, whole, authorizationSeconds) => {
    const latest = await rpcCall("eth_getBlockByNumber", ["latest", false]);
    const info = P.buildPaymentInfo({
      operator: ctx.account,
      payer: ctx.account,
      receiver: ctx.receiver,
      token: ctx.token,
      maxAmount: engine.units(whole),
      now: BigInt(latest.timestamp),
      authorizationSeconds,
      salt: randomSalt(),
    });
    // The escrow computes paymentInfoHash (it binds chain id and its own address).
    const hash = P.decode.bytes32(await ethCall(P.ESCROW, P.encode.getHash(info)));
    const [state, store] = await Promise.all([readPaymentState(hash), ethCall(P.ESCROW, P.encode.getTokenStore(ctx.account))]);
    if (state.hasCollectedPayment) throw new Error("This salt already has an onchain payment. Reset to generate a new one.");
    ctx.info = info;
    ctx.hash = hash;
    ctx.store = P.decode.address(store);
    return [
      nfo("getHash", `paymentInfoHash ${short(hash)}`, addrHref(P.ESCROW)),
      nfo("PaymentInfo", `max ${show(engine, info.maxAmount)} · fee 0–0 bps · fresh salt`),
    ];
  };

  const preApprove = async (engine, ctx) => {
    const amount = ctx.info.maxAmount;
    const approveData = P.encode.approve(P.PRE_APPROVAL_COLLECTOR, amount);
    const preApproveData = P.encode.preApprove(ctx.info);
    await preflight(ctx, ctx.token, approveData, "approve");
    await preflight(ctx, P.PRE_APPROVAL_COLLECTOR, preApproveData, "preApprove");
    const tx = await send(engine, ctx, [
      { to: ctx.token, data: approveData },
      { to: P.PRE_APPROVAL_COLLECTOR, data: preApproveData },
    ], "Pre-approve payment");
    if (!P.findLog(tx.receipt, P.PRE_APPROVAL_COLLECTOR, P.TOPICS.PaymentPreApproved, ctx.hash)) {
      throw new Error("PaymentPreApproved for this paymentInfoHash was not in the receipt");
    }
    await Promise.all([
      expectAllowance(ctx, P.PRE_APPROVAL_COLLECTOR, amount, "PreApprovalPaymentCollector"),
      settle(async () => P.decode.bool(await ethCall(P.PRE_APPROVAL_COLLECTOR, P.encode.isPreApproved(ctx.hash))), (v) => v, "isPreApproved"),
    ]);
    return [
      ok("Approval", `PreApprovalPaymentCollector · ${show(engine, amount)}`, txHref(tx.hash)),
      ok("PaymentPreApproved", short(ctx.hash), txHref(tx.hash)),
    ];
  };

  const authorize = async (engine, ctx, s) => {
    const amount = ctx.info.maxAmount;
    const data = P.encode.authorize(ctx.info, amount, P.PRE_APPROVAL_COLLECTOR);
    await preflight(ctx, P.ESCROW, data, "authorize");
    const storeBefore = await tokenBalance(ctx.token, ctx.store);
    const tx = await send(engine, ctx, [{ to: P.ESCROW, data }], "Authorize payment");
    const event = P.escrowEvent(tx.receipt, "PaymentAuthorized", ctx.hash, ctx.info);
    if (event.amount !== amount || !P.same(event.tokenCollector, P.PRE_APPROVAL_COLLECTOR)) {
      throw new Error("PaymentAuthorized did not match the requested amount and collector");
    }
    const state = await expectState(ctx, amount, 0n);
    if (P.transferred(tx.receipt, ctx.token, ctx.account, ctx.store) !== amount) throw new Error("The collector's USDV Transfer into the token store was not in the receipt");
    await expectBalance(ctx, ctx.store, storeBefore + amount, "Escrow token store");
    applyState(engine, ctx, s, state);
    return [
      ok("PaymentAuthorized", `${show(engine, event.amount)} · ${short(ctx.hash)}`, txHref(tx.hash)),
      nfo("capturableAmount", show(engine, state.capturableAmount), addrHref(P.ESCROW)),
    ];
  };

  const charge = async (engine, ctx, s) => {
    const amount = ctx.info.maxAmount;
    const data = P.encode.charge(ctx.info, amount, P.PRE_APPROVAL_COLLECTOR, 0n, P.ZERO_ADDRESS);
    await preflight(ctx, P.ESCROW, data, "charge");
    const tx = await send(engine, ctx, [{ to: P.ESCROW, data }], "Charge payment");
    const event = P.escrowEvent(tx.receipt, "PaymentCharged", ctx.hash, ctx.info);
    if (event.amount !== amount || event.feeAmount !== 0n || !P.same(event.tokenCollector, P.PRE_APPROVAL_COLLECTOR)) {
      throw new Error("PaymentCharged did not match the requested amount, fee, and collector");
    }
    const state = await expectState(ctx, 0n, amount);
    await expectBalance(ctx, ctx.receiver, amount, "Merchant");
    applyState(engine, ctx, s, state);
    return [
      ok("PaymentCharged", `${show(engine, event.amount)} · fee 0.00 · ${short(ctx.hash)}`, txHref(tx.hash)),
      nfo("refundableAmount", show(engine, state.refundableAmount), addrHref(P.ESCROW)),
    ];
  };

  const capture = async (engine, ctx, s, amount) => {
    const before = await readPaymentState(ctx.hash);
    const merchantBefore = await tokenBalance(ctx.token, ctx.receiver);
    const data = P.encode.capture(ctx.info, amount, 0n, P.ZERO_ADDRESS);
    await preflight(ctx, P.ESCROW, data, "capture");
    const tx = await send(engine, ctx, [{ to: P.ESCROW, data }], "Capture payment");
    const event = P.escrowEvent(tx.receipt, "PaymentCaptured", ctx.hash);
    if (event.amount !== amount || event.feeAmount !== 0n) throw new Error("PaymentCaptured did not match the requested amount and fee");
    const state = await expectState(ctx, before.capturableAmount - amount, before.refundableAmount + amount);
    await expectBalance(ctx, ctx.receiver, merchantBefore + amount, "Merchant");
    applyState(engine, ctx, s, state);
    return [
      ok("PaymentCaptured", `${show(engine, event.amount)} · fee 0.00`, txHref(tx.hash)),
      nfo("capturableAmount", show(engine, state.capturableAmount), addrHref(P.ESCROW)),
      nfo("refundableAmount", show(engine, state.refundableAmount), addrHref(P.ESCROW)),
    ];
  };

  const voidPayment = async (engine, ctx, s) => {
    const before = await readPaymentState(ctx.hash);
    const payerBefore = await tokenBalance(ctx.token, ctx.account);
    const data = P.encode.void(ctx.info);
    await preflight(ctx, P.ESCROW, data, "void");
    const tx = await send(engine, ctx, [{ to: P.ESCROW, data }], "Void authorization");
    const event = P.escrowEvent(tx.receipt, "PaymentVoided", ctx.hash);
    if (event.amount !== before.capturableAmount) throw new Error("PaymentVoided did not return the full capturable amount");
    const state = await expectState(ctx, 0n, before.refundableAmount);
    await expectBalance(ctx, ctx.account, payerBefore + event.amount, "Payer");
    applyState(engine, ctx, s, state);
    // A later capture must now fail; confirm it with a read-only eth_call.
    let check = nfo("capture after void", "could not be checked");
    try {
      await ethCall(P.ESCROW, P.encode.capture(ctx.info, 1n, 0n, P.ZERO_ADDRESS), ctx.account);
      check = err("capture after void", "eth_call unexpectedly succeeded");
    } catch (error) {
      const name = error?.rpc ? P.revertName(revertData(error)) : null;
      if (name) check = err(name, "capture after void · Vibenet eth_call");
    }
    return [
      ok("PaymentVoided", `${show(engine, event.amount)} → payer`, txHref(tx.hash)),
      nfo("capturableAmount", show(engine, state.capturableAmount), addrHref(P.ESCROW)),
      check,
    ];
  };

  const fundRefund = async (engine, ctx, whole) => {
    const amount = engine.units(whole);
    const payerBefore = await tokenBalance(ctx.token, ctx.account);
    const mintData = P.encode.mint(ctx.account, amount);
    const approveData = P.encode.approve(P.REFUND_COLLECTOR, amount);
    await preflight(ctx, ctx.token, mintData, "USDV mint");
    await preflight(ctx, ctx.token, approveData, "approve");
    const tx = await send(engine, ctx, [
      { to: ctx.token, data: mintData },
      { to: ctx.token, data: approveData },
    ], "Fund refund liquidity");
    if (P.transferred(tx.receipt, ctx.token, P.ZERO_ADDRESS, ctx.account) !== amount) {
      throw Object.assign(new Error("The USDV mint Transfer was not in the receipt"), { hash: tx.hash });
    }
    await Promise.all([
      expectBalance(ctx, ctx.account, payerBefore + amount, "Operator"),
      expectAllowance(ctx, P.REFUND_COLLECTOR, amount, "OperatorRefundCollector"),
    ]);
    ctx.refundAmount = amount;
    return [
      ok("Transfer", `USDV 0x0 → operator · ${show(engine, amount)} fresh liquidity`, txHref(tx.hash)),
      ok("Approval", `OperatorRefundCollector · ${show(engine, amount)}`, txHref(tx.hash)),
    ];
  };

  const refund = async (engine, ctx, s) => {
    const amount = ctx.refundAmount;
    const before = await readPaymentState(ctx.hash);
    const data = P.encode.refund(ctx.info, amount, P.REFUND_COLLECTOR);
    await preflight(ctx, P.ESCROW, data, "refund");
    const tx = await send(engine, ctx, [{ to: P.ESCROW, data }], "Refund payment");
    const event = P.escrowEvent(tx.receipt, "PaymentRefunded", ctx.hash);
    if (event.amount !== amount || !P.same(event.tokenCollector, P.REFUND_COLLECTOR)) {
      throw new Error("PaymentRefunded did not match the requested amount and collector");
    }
    // Payer and operator are one demo account, so prove both legs from the logs:
    // operator → token store (collector pull) and token store → payer (refund).
    const pulled = P.transferred(tx.receipt, ctx.token, ctx.account, ctx.store);
    const returned = P.transferred(tx.receipt, ctx.token, ctx.store, ctx.account);
    if (pulled !== amount || returned !== amount) throw new Error("Refund Transfer logs did not match the refunded amount");
    const state = await expectState(ctx, before.capturableAmount, before.refundableAmount - amount);
    await expectAllowance(ctx, P.REFUND_COLLECTOR, 0n, "OperatorRefundCollector");
    applyState(engine, ctx, s, state);
    return [
      ok("PaymentRefunded", `${show(engine, event.amount)} · OperatorRefundCollector`, txHref(tx.hash)),
      ok("Transfer", `operator → escrow → payer · ${show(engine, amount)}`, txHref(tx.hash)),
      nfo("refundableAmount", show(engine, state.refundableAmount), addrHref(P.ESCROW)),
    ];
  };

  // USDV, terms, pre-approval, and authorization for flows that start from an
  // escrowed payment. Separate transactions keep payer and operator roles distinct.
  const bootstrapAuthorization = async (engine, ctx, s, whole, authorizationSeconds) => {
    const entries = [
      ...(await mintUsdv(engine, ctx, whole, "Payer")),
      ...(await newPayment(engine, ctx, whole, authorizationSeconds)),
      ...(await preApprove(engine, ctx)),
      ...(await authorize(engine, ctx, s)),
    ];
    await refreshBalances(engine, ctx, s);
    return entries;
  };

  const liveMetrics = (s) => [
    ["Payment hash", s.hash ? M(short(s.hash)) : "Not created"],
    ["Capturable", M(`${(s.capturable || 0).toFixed(2)} ${TOKEN}`)],
    ["Refundable", M(`${(s.refundable || 0).toFixed(2)} ${TOKEN}`)],
  ];
  const DEMO_TOKEN = "Vibenet USDV (not USDC)";
  const ROLES = "Your demo account is payer and operator";

  const LIVE_FLOWS = {
    accept: {
      ...FLOWS.accept, metrics: liveMetrics,
      steps: [
        { stage: "Fund", action: "Mint 5 USDV",
          text: "Mint 5 USDV to your demo account from Vibenet's existing USDV token, whose mint is open to any account.",
          summary: [["Token", DEMO_TOKEN], ["Roles", ROLES], ["Amount", M("5.00 USDV")], ["Network", NETWORK]],
          run: async (engine, ctx, s) => { const entries = await mintUsdv(engine, ctx, 5, "Payer"); await refreshBalances(engine, ctx, s); return { entries }; } },
        { stage: "Approve", action: "Approve $5",
          text: "Fix PaymentInfo with ordered expiries, zero fee bounds, and a fresh salt, read its hash from the escrow, then approve exactly 5 USDV to PreApprovalPaymentCollector and call preApprove as the payer.",
          summary: [["Operation", "approve + preApprove"], ["Collector", "PreApprovalPaymentCollector"], ["Receiver", "New random merchant address"], ["Maximum", M("5.00 USDV")], ["Fee bounds", M("0–0 bps")]],
          run: async (engine, ctx, s) => {
            const entries = [...(await newPayment(engine, ctx, 5)), ...(await preApprove(engine, ctx))];
            s.hash = ctx.hash;
            return { entries, caption: "Pre-approval lets the collector pull funds; it is not settlement yet." };
          } },
        { stage: "Charge", action: "Submit charge",
          text: "The operator calls charge on AuthCaptureEscrow. The collector pulls 5 USDV and the escrow pays the merchant in the same transaction.",
          summary: [["Caller", "Operator"], ["Contract", "AuthCaptureEscrow v1.1"], ["To", "Merchant"], ["Amount", M("5.00 USDV")], ["Fee", M("0.00 USDV")]],
          run: async (engine, ctx, s) => { const entries = await charge(engine, ctx, s); await refreshBalances(engine, ctx, s); return { entries, caption: "PaymentCharged in the receipt, confirmed against paymentState, is the settlement signal." }; } },
      ],
    },
    authorize: {
      ...FLOWS.authorize, metrics: liveMetrics,
      steps: [
        { stage: "Terms", action: "Set terms",
          text: "Mint 25 USDV to your demo account, then bind operator, payer, merchant, maximum, expiries, zero fees, and a fresh salt. The escrow returns the payment hash.",
          summary: [["Token", DEMO_TOKEN], ["Maximum", M("25.00 USDV")], ["Capture window", "7 days"], ["Roles", ROLES]],
          run: async (engine, ctx, s) => {
            const entries = [...(await mintUsdv(engine, ctx, 25, "Payer")), ...(await newPayment(engine, ctx, 25))];
            s.hash = ctx.hash;
            await refreshBalances(engine, ctx, s);
            return { entries };
          } },
        { stage: "Approve", action: "Pre-approve $25",
          text: "As the payer, approve exactly 25 USDV to PreApprovalPaymentCollector and call preApprove for this payment.",
          summary: [["Collector", "PreApprovalPaymentCollector"], ["Signer", "Payer"], ["Maximum", M("25.00 USDV")], ["Settlement", "Not yet"]],
          run: async (engine, ctx) => ({ entries: await preApprove(engine, ctx), caption: "Pre-approval alone does not reserve funds." }) },
        { stage: "Escrow", action: "Authorize $25",
          text: "The operator submits authorize and the collector moves 25 USDV into the operator's token store.",
          summary: [["Caller", "Operator"], ["Amount", M("25.00 USDV")], ["State", "Capturable"], ["Network", NETWORK]],
          run: async (engine, ctx, s) => { const entries = await authorize(engine, ctx, s); await refreshBalances(engine, ctx, s); return { entries, caption: "The confirmed onchain authorization is the funds guarantee." }; } },
      ],
    },
    capture: {
      ...FLOWS.capture, metrics: liveMetrics,
      steps: [
        { stage: "Authorize", action: "Authorize $25",
          text: "Set up this demo's own payment: mint 25 USDV, pre-approve it, and authorize it into escrow with a 3-day capture window.",
          summary: [["Token", DEMO_TOKEN], ["Authorized", M("25.00 USDV")], ["Transactions", "3 on Vibenet"], ["Roles", ROLES]],
          run: async (engine, ctx, s) => ({ entries: await bootstrapAuthorization(engine, ctx, s, 25, 3 * 86_400) }) },
        { stage: "Check", action: "Check state",
          text: "Read paymentState from the escrow and confirm 25 USDV is capturable before authorization expiry.",
          summary: [["Payment hash", "From step 1"], ["Capturable", M("25.00 USDV")], ["Expiry", "In 3 days"]],
          run: async (engine, ctx, s) => {
            const [state, latest] = await Promise.all([readPaymentState(ctx.hash), rpcCall("eth_getBlockByNumber", ["latest", false])]);
            if (state.capturableAmount !== ctx.info.maxAmount) throw new Error("paymentState does not show the full authorization as capturable");
            const secondsLeft = ctx.info.authorizationExpiry - BigInt(latest.timestamp);
            if (secondsLeft <= 0n) throw new Error("The authorization has expired");
            applyState(engine, ctx, s, state);
            return { entries: [nfo("paymentState", `capturable ${show(engine, state.capturableAmount)}`, addrHref(P.ESCROW)), nfo("authorizationExpiry", `open · ${Math.floor(Number(secondsLeft) / 3_600)}h left`)] };
          } },
        { stage: "Capture", action: "Capture $25",
          text: "The operator captures the full amount with a zero fee, within the payer-approved bounds.",
          summary: [["Gross", M("25.00 USDV")], ["Fee", M("0.00 USDV")], ["Receiver", "Merchant"], ["State", "Refundable"]],
          run: async (engine, ctx, s) => { const entries = await capture(engine, ctx, s, engine.units(25)); await refreshBalances(engine, ctx, s); return { entries, caption: "Capture converted capturable value into refundable settled value onchain." }; } },
      ],
    },
    partial: {
      ...FLOWS.partial, metrics: liveMetrics,
      steps: [
        { stage: "Authorize", action: "Authorize max",
          text: "Set up this demo's own payment: mint 100 USDV, pre-approve it, and authorize it into escrow.",
          summary: [["Token", DEMO_TOKEN], ["Authorized", M("100.00 USDV")], ["Transactions", "3 on Vibenet"], ["Roles", ROLES]],
          run: async (engine, ctx, s) => ({ entries: await bootstrapAuthorization(engine, ctx, s, 100) }) },
        { stage: "Finalize", action: "Set total",
          text: "The merchant computes a final fulfilled total of 64 USDV. No new payer approval is needed.",
          summary: [["Authorized", M("100.00 USDV")], ["Final total", M("64.00 USDV")], ["Remainder", M("36.00 USDV")]],
          run: async (engine, ctx, s) => {
            const state = await readPaymentState(ctx.hash);
            if (state.capturableAmount < engine.units(64)) throw new Error("Less than 64 USDV is capturable");
            applyState(engine, ctx, s, state);
            return { entries: [nfo("order total", `64.00 ${TOKEN} of ${show(engine, state.capturableAmount)} capturable`, addrHref(P.ESCROW))] };
          } },
        { stage: "Capture", action: "Capture $64",
          text: "Capture 64 USDV and leave 36 USDV in escrow to capture later or void.",
          summary: [["Captured", M("64.00 USDV")], ["Capturable", M("36.00 USDV")], ["Refundable", M("64.00 USDV")]],
          run: async (engine, ctx, s) => { const entries = await capture(engine, ctx, s, engine.units(64)); await refreshBalances(engine, ctx, s); return { entries, caption: "The escrow tracks the 36 USDV remainder onchain." }; } },
      ],
    },
    void: {
      ...FLOWS.void, metrics: liveMetrics,
      steps: [
        { stage: "Authorize", action: "Authorize $25",
          text: "Set up this demo's own payment: mint 25 USDV, pre-approve it, and authorize it into escrow. Then treat the order as canceled.",
          summary: [["Token", DEMO_TOKEN], ["Authorized", M("25.00 USDV")], ["Transactions", "3 on Vibenet"], ["Roles", ROLES]],
          run: async (engine, ctx, s) => ({ entries: await bootstrapAuthorization(engine, ctx, s, 25) }) },
        { stage: "Void", action: "Return $25",
          text: "The operator calls void and the token store returns the full capturable amount to the payer.",
          summary: [["Caller", "Operator"], ["Recipient", "Payer"], ["Returned", M("25.00 USDV")], ["Capturable", M("0.00 USDV")]],
          run: async (engine, ctx, s) => { const entries = await voidPayment(engine, ctx, s); await refreshBalances(engine, ctx, s); return { entries, caption: "If the operator is inactive, the payer can reclaim after expiry instead." }; } },
      ],
    },
    refund: {
      ...FLOWS.refund, metrics: liveMetrics,
      steps: [
        { stage: "Charge", action: "Charge $5",
          text: "Set up this demo's own settled payment: mint 5 USDV, pre-approve it, and charge it to the merchant.",
          summary: [["Token", DEMO_TOKEN], ["Charged", M("5.00 USDV")], ["Transactions", "3 on Vibenet"], ["Roles", ROLES]],
          run: async (engine, ctx, s) => {
            const entries = [
              ...(await mintUsdv(engine, ctx, 5, "Payer")),
              ...(await newPayment(engine, ctx, 5)),
              ...(await preApprove(engine, ctx)),
              ...(await charge(engine, ctx, s)),
            ];
            await refreshBalances(engine, ctx, s);
            return { entries };
          } },
        { stage: "Fund", action: "Approve $2",
          text: "Refund accounting is not liquidity. Mint 2 USDV of fresh liquidity to the operator and approve OperatorRefundCollector for exactly that amount.",
          summary: [["Liquidity source", "Operator (fresh USDV mint)"], ["Collector", "OperatorRefundCollector"], ["Amount", M("2.00 USDV")]],
          run: async (engine, ctx, s) => { const entries = await fundRefund(engine, ctx, 2); await refreshBalances(engine, ctx, s); return { entries }; } },
        { stage: "Refund", action: "Refund $2",
          text: "The operator calls refund. The collector pulls 2 USDV from the operator and the escrow returns it to the original payer.",
          summary: [["Recipient", "Payer"], ["Amount", M("2.00 USDV")], ["Remaining", M("3.00 USDV")]],
          run: async (engine, ctx, s) => { const entries = await refund(engine, ctx, s); await refreshBalances(engine, ctx, s); return { entries, caption: "Payer and operator share one demo account here, so its balance is unchanged: 2 USDV left as liquidity and came back as the refund." }; } },
      ],
    },
  };

  const [active, setActive] = useState(pinned || "accept");
  const [sim, setSim] = useState(freshSim);
  const [results, setResults] = useState([]);
  const [liveState, setLiveState] = useState("probing");
  const [probeInfo, setProbeInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [aborted, setAborted] = useState(false);
  const [notice, setNotice] = useState(null);
  const [accountAddress, setAccountAddress] = useState(null);
  const [pendingTx, setPendingTx] = useState(null);
  const liveContext = useRef(null);
  const mounted = useRef(true);
  const leaseSlot = useRef(null);
  if (!leaseSlot.current) leaseSlot.current = createLeaseSlot();

  useEffect(() => {
    let cancelled = false;
    mounted.current = true;
    leaseSlot.current.mount();
    probePayments()
      .then((info) => {
        if (cancelled) return;
        setProbeInfo(info);
        setLiveState(info.live ? "live" : "offline");
      })
      .catch(() => {
        if (cancelled) return;
        setProbeInfo({ live: false, reason: "Vibenet did not respond" });
        setLiveState("offline");
      });
    // StrictMode runs this cleanup once before remounting; no lease is held yet
    // because leases are only acquired by a click.
    return () => { cancelled = true; mounted.current = false; leaseSlot.current.unmount(); };
  }, []);

  // mode: "live" | "probing" | "offline" (live flow, network unavailable) | "mock" (no live version)
  const liveCapable = Boolean(LIVE_FLOWS[active]);
  const mode = !liveCapable ? "mock" : liveState;
  const f = mode === "live" || mode === "probing" ? LIVE_FLOWS[active] : (FLOWS[active] || FLOWS.accept);
  const stepIndex = results.length;
  const done = stepIndex >= f.steps.length;
  const cur = done ? f.steps[f.steps.length - 1] : f.steps[stepIndex];

  const clearRun = () => {
    setSim(freshSim());
    setResults([]);
    setActionError(null);
    setAborted(false);
    liveContext.current = null;
    leaseSlot.current.release();
  };
  // A pending submission pins the lease, so reset and flow switching wait for it.
  const select = (k) => { if (busy || pendingTx) return; setActive(k); clearRun(); };
  const reset = () => { if (busy || pendingTx) return; clearRun(); };
  // Pins the lease for a submission whose outcome is unknown and reconciles it
  // in the background. This keeps running after unmount; the lease is released
  // only by a receipt or a verified Vibenet reset.
  const holdPendingSubmission = (hash, genesisHash) => {
    const reconciliation = leaseSlot.current.pin(reconcileSubmission({
      hash,
      genesisHash,
      readReceipt: (txHash) => rpcCall("eth_getTransactionReceipt", [txHash]),
      readGenesis: genesisHashOf,
      wait: sleep,
    }));
    if (mounted.current) setPendingTx({ hash });
    reconciliation.then(({ outcome }) => {
      if (!mounted.current) return;
      setPendingTx(null);
      setActionError({
        message: outcome === "success"
          ? "The pending transaction was confirmed onchain after the demo stopped waiting. This step's results were not verified, so the flow stays stopped. Reset to start a new payment."
          : outcome === "reverted"
            ? "The pending transaction reverted onchain. The flow stays stopped. Reset to start a new payment."
            : "Vibenet was reset, so the pending transaction and this flow's balances no longer exist. Reset to start a new payment.",
        href: hash ? txHref(hash) : null,
      });
    });
  };
  const runMockStep = () => {
    if (done) return;
    const s = { ...sim, balances: { ...sim.balances } };
    const out = f.steps[stepIndex].run(s) || { entries: [] };
    setSim(s);
    setResults((r) => [...r, { entries: [], ...out, at: Date.now() }]);
  };
  const runLiveStep = async () => {
    setBusy(true);
    setActionError(null);
    let engine = null;
    leaseSlot.current.begin();
    let ctx = liveContext.current;
    try {
      engine = await loadVibenetEngine();
      if (!ctx) {
        // Fresh read-only checks: chain, Commerce Payments contracts, and the live
        // USDV address. B20 activation is not required because USDV is an ordinary
        // ERC-20 on Vibenet.
        const caps = await probePayments();
        if (!caps.live) throw Object.assign(new Error(caps.reason || "Vibenet is unavailable"), { unavailable: true });
        // The demo account is the browser-local secp256k1 EOA for this genesis.
        const [shared, genesis] = await Promise.all([engine.getSharedAccount(), genesisHashOf()]);
        if (shared.genesisHash !== genesis || caps.genesisHash !== genesis) throw new Error("Vibenet changed while the demo account loaded.");
        const next = { genesisHash: genesis, account: shared.account.address, receiver: engine.randomAddress(), token: caps.usdv, info: null, hash: null, store: null, isMounted: () => mounted.current };
        // The exclusive lease is taken before this run's first write and held
        // across its steps until completion, reset, abort, or unmount.
        const lease = await acquireRunLease(typeof navigator === "undefined" ? null : navigator.locks, runLeaseKey(next));
        leaseSlot.current.hold(lease);
        next.leaseHeld = lease.held;
        ctx = next;
        liveContext.current = ctx;
        setAccountAddress(ctx.account);
      } else {
        await guard(engine, ctx);
      }
      ctx.stepWrote = false;
      const s = { ...sim, balances: { ...sim.balances } };
      const out = await f.steps[stepIndex].run(engine, ctx, s);
      setSim(s);
      setResults((r) => [...r, { entries: [], ...out, at: Date.now() }]);
      if (stepIndex + 1 >= f.steps.length) leaseSlot.current.release();
    } catch (error) {
      // A submission that may have reached Vibenet pins the lease before any
      // other handling, including unmount, so no other run can race it.
      const pending = Boolean(error?.pending && ctx);
      if (pending) holdPendingSubmission(error.hash || null, ctx.genesisHash);
      // Unmounted: no retry probe and no UI update; beforeWrite already kept
      // any further transaction from being sent.
      if (!mounted.current) return;
      const message = (error?.message || String(error)).replace(/\.$/, "");
      const wrote = Boolean(ctx?.stepWrote);
      const href = error?.hash ? txHref(error.hash) : wrote && ctx?.account ? addrHref(ctx.account) : null;
      if (error?.lease) {
        // No lease was granted, so this run has no context and sent nothing.
        setActionError({ message: `${message}.`, href: null });
        return;
      }
      if (!wrote && !error?.abort && results.length === 0) {
        // Nothing has been sent by this flow. If Vibenet itself is gone, switch
        // to the labeled mock and say so; never after a transaction attempt.
        let latest;
        try {
          latest = error?.unavailable ? { live: false, reason: message } : await probePayments();
        } catch {
          latest = { live: false, reason: "Vibenet did not respond" };
        }
        if (!latest.live) {
          liveContext.current = null;
          leaseSlot.current.release();
          setProbeInfo(latest);
          setLiveState("offline");
          setNotice(`Vibenet became unavailable before any transaction was sent (${latest.reason}). This demo is now an offline mock; nothing runs onchain.`);
          return;
        }
      }
      if (pending) {
        setAborted(true);
        setActionError({
          message: error.hash
            ? `${message}. Transaction ${short(error.hash)} may still be pending on Vibenet. This demo keeps its exclusive lease and checks for a receipt, less often over time, until the transaction is final or Vibenet resets. Reset is unavailable until then.`
            : `${message}. A transaction may have reached Vibenet, but its hash is unknown. This demo keeps its exclusive lease until Vibenet resets or you close this tab, so no other run can race it. Check the demo account on the explorer.`,
          href,
        });
      } else if (wrote || error?.abort) {
        setAborted(true);
        leaseSlot.current.release();
        setActionError({
          message: wrote
            ? `${message}. A transaction was attempted in this step, so the live flow stopped without showing success. Check the demo account on the explorer, then reset to start a new payment.`
            : `${message}.`,
          href,
        });
      } else {
        setActionError({ message: /Nothing was sent/.test(message) ? `${message}. You can retry.` : `${message}. Nothing was sent for this step. You can retry.`, href });
      }
    } finally {
      if (mounted.current) setBusy(false);
      // After an unmount, this releases the lease only once the in-flight step
      // (including any transaction the engine was still settling) has finished.
      leaseSlot.current.end();
    }
  };
  const runStep = () => {
    if (done || busy || aborted) return;
    if (mode === "live") return runLiveStep();
    if (mode === "probing") return;
    runMockStep();
  };
  const back = () => {
    if (mode === "live" || mode === "probing") return;
    const n = results.length - 1;
    if (n < 0) return;
    let s = freshSim();
    for (let i = 0; i < n; i++) f.steps[i].run(s);
    setSim(s);
    setResults((r) => r.slice(0, -1));
  };

  // ---- event log (flatten results + pending, wall-clock timestamps) ----
  const pad = (n) => String(n).padStart(2, "0");
  const ts = (at) => { if (!at) return "--:--:--"; const d = new Date(at); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
  const logRows = [];
  results.forEach((res) => {
    (res.entries || []).forEach((e) => {
      logRows.push({ t: ts(res.at), level: e.kind === "err" ? "ERROR" : e.kind === "info" ? "INFO" : "EVENT", name: e.name, detail: e.detail, kind: e.kind, href: e.href });
    });
  });
  f.steps.slice(stepIndex).forEach((st) => { logRows.push({ t: ts(null), level: "PENDING", name: st.action, detail: "", kind: "pending" }); });

  const holders = Object.keys(sim.balances);

  // ---- small building blocks ----
  const StatusTag = ({ state }) => {
    const map = { done: [C.success, "Complete"], now: [C.blue, "In progress"], future: [C.sub, "Pending"] };
    const [col, txt] = map[state];
    return <span className="wf-t-footnote" style={{ color: col }}>{txt}</span>;
  };

  const levelColor = { EVENT: C.blue, INFO: C.sec, ERROR: C.error, PENDING: C.sub };
  const badge = mode === "live"
    ? { text: accountAddress ? `Live · ${short(accountAddress)}` : "Live · Vibenet", color: C.success, border: C.success, title: accountAddress ? `Vibenet demo account ${accountAddress}` : NETWORK }
    : mode === "probing"
      ? { text: "Checking Vibenet", color: C.sub, border: C.border, title: NETWORK }
      : mode === "offline"
        ? { text: "Offline mock", color: C.warn, border: C.warn, title: probeInfo?.reason || "Vibenet is unavailable" }
        : { text: "Mock", color: C.sub, border: C.border, title: "Scripted illustration; no transactions are sent" };
  const footerMode = mode === "live"
    ? "Real Vibenet transactions · Vibenet USDV, not USDC"
    : mode === "probing"
      ? "Network check"
      : mode === "offline"
        ? "Offline mock · no transactions"
        : "Mock only · no transactions";
  const doneText = mode === "live"
    ? "every step ran on Base Vibenet and was checked against escrow events and state. Open a log line to see its transaction."
    : mode === "offline"
      ? "the offline mock completed; nothing ran onchain."
      : "every step completed in the mock simulation above; nothing ran onchain.";

  if (invalidFlow) {
    return <div style={{ margin: "22px 0", padding: 16, border: `1px solid ${C.error}`, borderRadius: 8, color: C.error }}>Unknown payment demo flow: {flow}</div>;
  }

  return (
    <div className="wf" style={{ margin: "22px 0", maxWidth: 760, borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, overflow: "hidden", boxShadow: "var(--wf-shadow)" }}>
      <style>{`
        /* ---- Base design system: color tokens (light) ---- */
        .wf {
          --wf-sans: 'Base Sans','Inter Tight',Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
          --wf-sans-text: 'Base Sans Text','Inter',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
          --wf-mono: 'Base Mono','Roboto Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace;
          --wf-blue: #0000ff; --wf-on-blue: #ffffff; --wf-cerulean: #3c8aff;
          --wf-ink: #0a0b0d; --wf-body: #32353d; --wf-sec: #5b616e; --wf-sub: #717886; --wf-muted: #787878;
          --wf-border: #dee1e7; --wf-panel: #eef0f3; --wf-surface: #ffffff;
          --wf-success: #66c800; --wf-lime: #b6f569; --wf-error: #fc401f; --wf-warn: #ffd12f;
          --wf-blue-soft: rgba(0,0,255,.06); --wf-success-soft: rgba(102,200,0,.12); --wf-error-soft: rgba(252,64,31,.10);
          --wf-shadow: 0 1px 2px rgba(10,11,13,.04);
        }
        /* ---- Dark theme: system preference ---- */
        @media (prefers-color-scheme: dark) {
          .wf {
            --wf-blue: #4d6bff; --wf-on-blue: #ffffff; --wf-cerulean: #6ea8ff;
            --wf-ink: #ffffff; --wf-body: #dee1e7; --wf-sec: #b1b7c3; --wf-sub: #8a91a0; --wf-muted: #787878;
            --wf-border: #2b2f36; --wf-panel: #17181b; --wf-surface: #0f1012;
            --wf-success: #7cd442; --wf-lime: #b6f569; --wf-error: #ff6a4d; --wf-warn: #ffd12f;
            --wf-blue-soft: rgba(77,107,255,.16); --wf-success-soft: rgba(124,212,66,.16); --wf-error-soft: rgba(255,106,77,.16);
            --wf-shadow: 0 1px 2px rgba(0,0,0,.4);
          }
        }
        /* ---- Dark theme: docs explicit toggle wins over system ---- */
        html.dark .wf, :root[data-theme="dark"] .wf, [data-theme="dark"] .wf {
          --wf-blue: #4d6bff; --wf-on-blue: #ffffff; --wf-cerulean: #6ea8ff;
          --wf-ink: #ffffff; --wf-body: #dee1e7; --wf-sec: #b1b7c3; --wf-sub: #8a91a0; --wf-muted: #787878;
          --wf-border: #2b2f36; --wf-panel: #17181b; --wf-surface: #0f1012;
          --wf-success: #7cd442; --wf-lime: #b6f569; --wf-error: #ff6a4d; --wf-warn: #ffd12f;
          --wf-blue-soft: rgba(77,107,255,.16); --wf-success-soft: rgba(124,212,66,.16); --wf-error-soft: rgba(255,106,77,.16);
          --wf-shadow: 0 1px 2px rgba(0,0,0,.4);
        }
        /* ---- Light theme: docs explicit toggle wins over system dark ---- */
        html.light .wf, :root[data-theme="light"] .wf, [data-theme="light"] .wf {
          --wf-blue: #0000ff; --wf-on-blue: #ffffff; --wf-cerulean: #3c8aff;
          --wf-ink: #0a0b0d; --wf-body: #32353d; --wf-sec: #5b616e; --wf-sub: #717886; --wf-muted: #787878;
          --wf-border: #dee1e7; --wf-panel: #eef0f3; --wf-surface: #ffffff;
          --wf-success: #66c800; --wf-lime: #b6f569; --wf-error: #fc401f; --wf-warn: #ffd12f;
          --wf-blue-soft: rgba(0,0,255,.06); --wf-success-soft: rgba(102,200,0,.12); --wf-error-soft: rgba(252,64,31,.10);
          --wf-shadow: 0 1px 2px rgba(10,11,13,.04);
        }

        .wf, .wf * { box-sizing: border-box; }

        /* ---- Base design system: text variants (mobile → md 768px) ---- */
        .wf-t-title2 { font-family: var(--wf-sans); font-weight: 400; letter-spacing: -0.02em; font-size: 20px; line-height: 28px; }
        .wf-t-title3 { font-family: var(--wf-sans); font-weight: 400; letter-spacing: -0.02em; font-size: 18px; line-height: 26px; }
        .wf-t-headline { font-family: var(--wf-sans); font-weight: 400; letter-spacing: -0.02em; font-size: 16px; line-height: 24px; }
        .wf-t-body { font-family: var(--wf-sans-text); font-weight: 400; letter-spacing: 0; font-size: 15px; line-height: 1.4; }
        .wf-t-caption { font-family: var(--wf-sans); font-weight: 500; letter-spacing: 0; text-transform: uppercase; font-size: 11px; line-height: 14px; }
        .wf-t-button { font-family: var(--wf-sans); font-weight: 400; letter-spacing: -0.01em; font-size: 15px; line-height: 1.4; }
        .wf-t-footnote { font-family: var(--wf-sans); font-weight: 400; letter-spacing: 0; font-size: 11px; line-height: 14px; }
        .wf-t-mono { font-family: var(--wf-mono); font-weight: 400; font-size: 11.5px; line-height: 1.5; }
        @media (min-width: 768px) {
          .wf-t-title2 { font-size: 24px; line-height: 32px; }
          .wf-t-title3 { font-size: 20px; line-height: 28px; }
          .wf-t-headline { font-size: 18px; line-height: 28px; }
          .wf-t-body { font-size: 16px; line-height: 1.4; }
          .wf-t-caption { font-size: 12px; line-height: 16px; }
          .wf-t-button { font-size: 16px; line-height: 1.4; }
          .wf-t-footnote { font-size: 12px; line-height: 16px; }
        }

        .wf-nav { display: flex; gap: 20px; }
        .wf-split { display: grid; grid-template-columns: 43% 57%; }
        .wf-rail { border-right: 1px solid ${C.border}; }
        @keyframes wf-in { from { opacity: 0; transform: translateY(3px);} to { opacity: 1; transform: none; } }
        .wf-anim { animation: wf-in .26s ease both; }
        .wf-btn { font-family: ${sans}; font-size: 13px; font-weight: 600; border-radius: 6px; padding: 10px 14px; cursor: pointer; transition: filter .15s ease; border: 1px solid ${C.blue}; background: ${C.blue}; color: ${C.onBlue}; width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 7px; }
        .wf-btn:hover { filter: brightness(1.1); }
        .wf-btn:disabled { background: ${C.panel}; border-color: ${C.border}; color: ${C.sub}; cursor: default; filter: none; }
        a.wf-btn, a.wf-btn:visited { color: ${C.onBlue}; }
        .wf-btn2 { font-family: ${sans}; font-size: 13px; font-weight: 600; border-radius: 6px; padding: 10px 14px; cursor: pointer; background: ${C.white}; border: 1px solid ${C.border}; color: ${C.body}; width: 100%; transition: background .15s ease; }
        .wf-btn2:hover { background: ${C.panel}; }
        .wf-pill { font-family: ${sans}; font-size: 12px; font-weight: 500; border-radius: 6px; padding: 5px 10px; cursor: pointer; white-space: nowrap; color: ${C.sec}; background: ${C.white}; border: 1px solid ${C.border}; transition: all .12s ease; }
        .wf-pill:not(.wf-pill-on):hover { color: ${C.ink}; border-color: ${C.sub}; }
        .wf-pill-on { color: ${C.onBlue}; background: ${C.blue}; border-color: ${C.blue}; }
        .wf-stage { font-family: ${sans}; font-size: 12.5px; white-space: nowrap; padding: 11px 2px; border-bottom: 2px solid transparent; display: inline-flex; align-items: center; gap: 7px; }
        @media (max-width: 640px) {
          .wf-split { grid-template-columns: 1fr; }
          .wf-rail { border-right: none; border-bottom: 1px solid ${C.border}; }
          .wf-nav { display: none; }
          .wf-stages { overflow-x: auto; }
        }
        @media (prefers-reduced-motion: reduce) { .wf-anim { animation: none !important; } }
      `}</style>

      {/* Scenario selector (only when not pinned) */}
      {!pinned && (
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, padding: "10px 16px", borderBottom: `1px solid ${C.border}`, background: C.panel }}>
          <span className="wf-t-caption" style={{ color: C.sub, marginRight: 4 }}>Scenario</span>
          {order.map((k) => (
            <button key={k} className={k === active ? "wf-pill wf-pill-on" : "wf-pill"} onClick={() => select(k)}>{FLOWS[k].label}</button>
          ))}
        </div>
      )}

      {/* Stage navigation + demo tag + reset */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px", borderBottom: `1px solid ${C.border}`, background: C.white }}>
        <div className="wf-stages" style={{ display: "flex", gap: 22, flex: 1, minWidth: 0, overflowX: "auto" }}>
          {f.steps.map((st, i) => {
            const state = i < stepIndex ? "done" : i === stepIndex ? "now" : "future";
            const col = state === "future" ? C.sub : state === "now" ? C.blue : C.ink;
            return (
              <span key={i} className="wf-stage" style={{ color: col, borderBottomColor: state === "now" ? C.blue : "transparent", fontWeight: state === "now" ? 600 : 500 }}>
                <span style={{ fontFamily: mono, fontSize: 11, opacity: .7 }}>{i + 1}</span>{st.stage}
                {state === "done" && <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke={C.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
              </span>
            );
          })}
        </div>
        <span className="wf-t-caption" title={badge.title} style={{ color: badge.color, border: `1px solid ${badge.border}`, borderRadius: 5, padding: "2px 6px", flexShrink: 0, whiteSpace: "nowrap" }}>{badge.text}</span>
        {(results.length > 0 || actionError || aborted) && !busy && !pendingTx && (
          <button onClick={reset} title="Reset" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 24, borderRadius: 6, background: "transparent", border: `1px solid ${C.border}`, cursor: "pointer", color: C.sec, flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
          </button>
        )}
      </div>

      {/* Split workspace */}
      <div className="wf-split">
        {/* Left progress rail */}
        <div className="wf-rail" style={{ padding: "16px 16px 14px", background: C.white }}>
          {f.steps.map((st, i) => {
            const state = i < stepIndex ? "done" : i === stepIndex ? "now" : "future";
            const last = i === f.steps.length - 1;
            return (
              <div key={i} style={{ display: "flex", gap: 11 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 24, flexShrink: 0 }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontFamily: sans, fontSize: 11.5, fontWeight: 600,
                    color: state === "future" ? C.sub : C.onBlue,
                    background: state === "done" ? C.success : state === "now" ? C.blue : "transparent",
                    border: `1.5px solid ${state === "done" ? C.success : state === "future" ? C.border : C.blue}`,
                  }}>
                    {state === "done" ? <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke={C.onBlue} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg> : i + 1}
                  </span>
                  {!last && <div style={{ flex: 1, width: 2, minHeight: 22, marginTop: 4, marginBottom: 2, background: i < stepIndex ? C.blue : C.border }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: last ? 0 : 14, minWidth: 0 }}>
                  <div className="wf-t-body" style={{ fontWeight: state === "future" ? 400 : 500, color: state === "future" ? C.sub : C.ink }}>{st.action}</div>
                  <div style={{ marginTop: 2 }}><StatusTag state={state} /></div>
                </div>
              </div>
            );
          })}

          {/* USDC balances readout */}
          {f.readout && holders.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              <div className="wf-t-caption" style={{ color: C.sub, marginBottom: 8 }}>{mode === "live" ? `${TOKEN} balances · onchain` : "USDC balances · mock"}</div>
              <div style={{ display: "grid", gap: 6 }}>
                {holders.map((a) => (
                  <div key={a} className="wf-t-body" style={{ display: "flex", alignItems: "center", gap: 8, color: C.body }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot[a] || C.sub, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{a}</span>
                    {sim.blocked === a && <span className="wf-t-caption" style={{ color: C.error, border: `1px solid ${C.error}`, borderRadius: 4, padding: "0 4px" }}>Blocked</span>}
                    <span style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 600, color: C.ink }}>{fmt(sim.balances[a] || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {f.metrics && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              <div className="wf-t-caption" style={{ color: C.sub, marginBottom: 8 }}>Flow state</div>
              <div style={{ display: "grid", gap: 6 }}>
                {f.metrics(sim).map(([name, value]) => {
                  const isM = value && typeof value === "object" && value.mono;
                  return (
                    <div key={name} className="wf-t-body" style={{ display: "flex", justifyContent: "space-between", gap: 8, color: C.body }}>
                      <span>{name}</span>
                      <span style={{ fontFamily: isM ? mono : sans, fontSize: 12.5, fontWeight: 600, color: C.ink }}>{isM ? value.v : value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right inspector */}
        <div style={{ padding: "16px 18px", background: C.white, minWidth: 0 }}>
          {done ? (
            <div className="wf-anim">
              <div className="wf-t-footnote" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontWeight: 600, color: C.success, background: C.successSoft, borderRadius: 6, padding: "5px 10px" }}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke={C.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                Flow complete
              </div>
              <div className="wf-t-body" style={{ color: C.body, margin: "12px 0 16px" }}>{f.title} — {doneText}</div>
              <button className="wf-btn2" onClick={reset}>Run again</button>
              <a className="wf-btn" href={f.href || "https://github.com/base/commerce-payments"} style={{ textDecoration: "none", color: C.onBlue, marginTop: 8, display: "flex", boxSizing: "border-box" }}>See technical details →</a>
            </div>
          ) : (
            <div className="wf-anim" key={stepIndex}>
              {notice && <div className="wf-t-footnote" role="status" style={{ color: C.body, border: `1px solid ${C.warn}`, borderRadius: 6, padding: "8px 10px", marginBottom: 12 }}>{notice}</div>}
              <div className="wf-t-headline" style={{ color: C.ink }}>{cur.action}</div>
              <div className="wf-t-body" style={{ color: C.sec, marginTop: 5 }}>{cur.text}</div>

              <div style={{ marginTop: 14, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
                {cur.summary.map(([k, val], i) => {
                  const isM = val && typeof val === "object" && val.mono;
                  const v = isM ? val.v : val;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "9px 12px", borderTop: i ? `1px solid ${C.border}` : "none" }}>
                      <span className="wf-t-footnote" style={{ color: C.sec }}>{k}</span>
                      <span style={{ fontFamily: isM ? "var(--wf-mono)" : "var(--wf-sans)", fontSize: isM ? 12 : 12.5, fontWeight: isM ? 500 : 600, color: C.ink, textAlign: "right", wordBreak: "break-word" }}>
                        {k === "Network" && <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: C.cerulean, marginRight: 6 }} />}
                        {v}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
                <button className="wf-btn" onClick={runStep} disabled={busy || aborted || mode === "probing"}>
                  {mode === "probing" ? "Checking Vibenet…" : busy ? "Submitting on Vibenet…" : cur.action}
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </button>
                {actionError && (
                  <div className="wf-t-footnote" role="alert" style={{ color: C.error, background: C.errorSoft, borderRadius: 6, padding: "8px 10px", wordBreak: "break-word" }}>
                    {actionError.message}
                    {actionError.href && <> <a href={actionError.href} target="_blank" rel="noreferrer" style={{ color: C.error }}>Open in explorer ↗</a></>}
                  </div>
                )}
                {aborted && pendingTx && <div className="wf-t-footnote" role="status" style={{ color: C.sec }}>Waiting for a final outcome on Vibenet{pendingTx.hash ? ` for ${short(pendingTx.hash)}` : ""}. Reset is unavailable until then.</div>}
                {aborted && !pendingTx && <button className="wf-btn2" onClick={reset}>Reset and start a new payment</button>}
                {results.length > 0 && mode !== "live" && mode !== "probing" && <button className="wf-btn2" onClick={back}>Back</button>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Event log */}
      <div style={{ borderTop: `1px solid ${C.border}`, background: C.white }}>
        <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", borderBottom: `1px solid ${C.border}` }}>
          <span className="wf-t-headline" style={{ fontSize: 13, color: C.ink }}>{mode === "live" ? "Transaction event log" : "Activity log"}</span>
        </div>
        <div style={{ maxHeight: 168, overflowY: "auto", padding: "6px 0" }}>
          {logRows.map((r, i) => (
            <div key={i} className={r.kind === "pending" ? "" : "wf-anim"} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 16px", opacity: r.kind === "pending" ? 0.5 : 1 }}>
              <span style={{ fontFamily: mono, fontSize: 11, color: C.sub, flexShrink: 0 }}>{r.t}</span>
              <span style={{ fontFamily: mono, fontSize: 10.5, fontWeight: 600, color: levelColor[r.level], flexShrink: 0, width: 58 }}>[{r.level}]</span>
              {r.href ? (
                <a href={r.href} target="_blank" rel="noreferrer" style={{ fontFamily: mono, fontSize: 11.5, color: r.kind === "err" ? C.error : C.body, flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
                  <span style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.name}{r.detail ? <span style={{ color: C.sub }}> · {r.detail}</span> : null}
                  </span>
                  <span aria-hidden="true" style={{ color: C.sub, flexShrink: 0 }}>↗</span>
                </a>
              ) : (
                <span style={{ fontFamily: mono, fontSize: 11.5, color: r.kind === "err" ? C.error : C.body, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.name}{r.detail ? <span style={{ color: C.sub }}> · {r.detail}</span> : null}
                </span>
              )}
              <span style={{ flexShrink: 0, width: 14, display: "inline-flex", justifyContent: "center" }}>
                {r.kind === "err" ? <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke={C.error} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  : r.kind === "pending" ? <span style={{ width: 9, height: 9, borderRadius: "50%", border: `1.5px solid ${C.border}` }} />
                  : <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke={C.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 16px", background: C.panel, borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <span className="wf-t-footnote" style={{ color: C.sub, flex: 1 }}>{(mode === "live" || mode === "probing") ? "Vibenet USDV, not USDC. The payer pre-approves a payment-specific allowance; the operator drives the escrow flow." : f.erc20}</span>
        <span className="wf-t-footnote" style={{ color: mode === "offline" ? C.warn : C.sub, whiteSpace: "nowrap" }}>{footerMode}</span>
      </div>
    </div>
  );
};
