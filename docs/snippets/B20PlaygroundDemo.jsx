
export const B20FlowDemo = ({ flow }) => {
  // No imports allowed in Mintlify snippets: useState/useEffect/useRef are injected globally.
  const sans = "'Base Sans','Inter Tight',Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  const mono = "'Base Mono','Roboto Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace";

  // Locked Base palette — rendered light regardless of host docs theme.
  const C = {
    blue: "#0000ff", onBlue: "#ffffff", cerulean: "#3c8aff",
    ink: "#0a0b0d", body: "#32353d", sec: "#5b616e", sub: "#717886",
    border: "#dee1e7", panel: "#eef0f3", white: "#ffffff",
    success: "#66c800", lime: "#b6f569", error: "#fc401f", warn: "#ffd12f",
    blueSoft: "rgba(0,0,255,.06)", successSoft: "rgba(102,200,0,.12)", errorSoft: "rgba(252,64,31,.10)",
  };
  // Base secondary palette for account markers.
  const dot = { Issuer: C.blue, Processor: "#3c8aff", Alice: "#66c800", Bob: "#ffd12f", Carol: "#fea8cd" };

  const NETWORK = "Base Vibenet";

  // ---- helpers ----
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const M = (v) => ({ v, mono: true });

  // ----- deterministic simulated address -----
  const hashHex = (seed) => {
    let h = 5381;
    for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
    let out = "", x = h;
    for (let i = 0; i < 9; i++) {
      x = (x * 1103515245 + 12345 + i * 7) >>> 0;
      out += ((x >>> ((i % 4) * 8)) & 0xff).toString(16).padStart(2, "0");
    }
    return out;
  };
  const tokenAddress = (variant, symbol) => {
    const vByte = variant === "STABLECOIN" ? "01" : "00";
    const tail = hashHex(symbol);
    return `0xb2000000…${vByte}${tail.slice(0, 4)}…${tail.slice(-4)}`;
  };

  const emit = (name, args, logIndex) => ({ kind: "event", name, args, logIndex });
  const revert = (name, args) => ({ kind: "revert", name, args: args || "", logIndex: null });
  const info = (name, args) => ({ kind: "info", name, args: args || "", logIndex: null });

  // ----- fresh simulation state -----
  const freshSim = () => ({
    token: null, balances: {}, policies: {}, nextPolicyId: 2,
    scopes: { TRANSFER_SENDER: 0, TRANSFER_RECEIVER: 0, TRANSFER_EXECUTOR: 0, MINT_RECEIVER: 0 },
    roles: {}, allowances: {}, nonces: {}, sig: null,
  });
  const cloneSim = (s) => ({
    token: s.token ? { ...s.token, extraMetadata: { ...s.token.extraMetadata } } : null,
    balances: { ...s.balances },
    policies: Object.fromEntries(Object.entries(s.policies).map(([k, v]) => [k, { ...v, members: [...v.members] }])),
    nextPolicyId: s.nextPolicyId,
    scopes: { ...s.scopes },
    roles: Object.fromEntries(Object.entries(s.roles).map(([k, v]) => [k, [...v]])),
    allowances: { ...s.allowances },
    nonces: { ...s.nonces },
    sig: s.sig ? { ...s.sig } : null,
  });

  // Provision a token directly into the snapshot (simulated createB20).
  const createInSim = (s, kind) => {
    const isEquity = kind === "EQUITY";
    s.token = {
      variant: isEquity ? "ASSET" : "STABLECOIN",
      name: isEquity ? "Acme Corp Class A" : "Acme Dollar",
      symbol: isEquity ? "ACME" : "aUSD",
      multiplier: 1.0,
      extraMetadata: isEquity ? { cusip: "38259P508" } : {},
    };
    const roleMap = {};
    ["DEFAULT_ADMIN_ROLE", "MINT_ROLE", "BURN_BLOCKED_ROLE"].forEach(r => { roleMap[r] = ["Issuer"]; });
    if (isEquity) roleMap["OPERATOR_ROLE"] = ["Issuer"];
    s.roles = roleMap;
  };

  // ---------------------------------------------------------------
  // Op interpreter. Mutates the snapshot; validates in spec order;
  // returns log entries for the step's inline result.
  // ---------------------------------------------------------------
  const applyOp = (s, op, me, entries) => {
    const isAuthorized = (policyId, account) => {
      if (!policyId) return true; // ALWAYS_ALLOW = 0, the default on every scope
      const p = s.policies[policyId];
      if (!p) return false;
      if (p.type === "BLOCKLIST") return !p.members.includes(account);
      return p.members.includes(account); // ALLOWLIST
    };
    const roleHas = (r, a) => (s.roles[r] || []).includes(a);

    switch (op.type) {
      case "mint": {
        if (!roleHas("MINT_ROLE", me)) return entries.push(revert("AccessControlUnauthorizedAccount", `${me} lacks MINT_ROLE`));
        if (!isAuthorized(s.scopes.MINT_RECEIVER, op.to)) return entries.push(revert("PolicyForbids", `MINT_RECEIVER · ${op.to}`));
        s.balances[op.to] = (s.balances[op.to] || 0) + op.amt;
        return entries.push(emit("Transfer", `0x0 → ${op.to} · ${op.amt}`, 0));
      }
      case "transfer": {
        const { from, to, amt, memo } = op;
        if (!isAuthorized(s.scopes.TRANSFER_SENDER, from)) return entries.push(revert("PolicyForbids", `TRANSFER_SENDER · ${from}`));
        if (!isAuthorized(s.scopes.TRANSFER_RECEIVER, to)) return entries.push(revert("PolicyForbids", `TRANSFER_RECEIVER · ${to}`));
        if ((s.balances[from] || 0) < amt) return entries.push(revert("ERC20InsufficientBalance", `${from} has ${s.balances[from] || 0}`));
        s.balances[from] -= amt;
        s.balances[to] = (s.balances[to] || 0) + amt;
        entries.push(emit("Transfer", `${from} → ${to} · ${amt}`, 0));
        if (memo !== undefined) entries.push(emit("Memo", `${me} · "${memo}"`, 1));
        return;
      }
      case "transferFrom": {
        const { from, to, amt } = op;
        const key = from + "→" + me;
        if ((s.allowances[key] || 0) < amt) return entries.push(revert("ERC20InsufficientAllowance", `${me} allowance ${s.allowances[key] || 0} < ${amt}`));
        if ((s.balances[from] || 0) < amt) return entries.push(revert("ERC20InsufficientBalance", `${from} has ${s.balances[from] || 0}`));
        s.balances[from] -= amt;
        s.balances[to] = (s.balances[to] || 0) + amt;
        s.allowances[key] -= amt;
        return entries.push(emit("Transfer", `${from} → ${to} · ${amt} (by ${me})`, 0));
      }
      case "burnBlocked": {
        const { target, amt } = op;
        if (!roleHas("BURN_BLOCKED_ROLE", me)) return entries.push(revert("AccessControlUnauthorizedAccount", `${me} lacks BURN_BLOCKED_ROLE`));
        if (isAuthorized(s.scopes.TRANSFER_SENDER, target)) return entries.push(revert("AccountNotBlocked", `${target} not denied by TRANSFER_SENDER`));
        if ((s.balances[target] || 0) < amt) return entries.push(revert("ERC20InsufficientBalance", `${target} has ${s.balances[target] || 0}`));
        s.balances[target] -= amt;
        return entries.push(emit("Transfer", `${target} → 0x0 · ${amt} (seized)`, 0));
      }
      case "freeze": {
        // createPolicy + updateBlocklist + updatePolicy, presented as one action
        const id = s.nextPolicyId;
        s.policies[id] = { type: "BLOCKLIST", members: [op.target] };
        s.nextPolicyId = id + 1;
        s.scopes.TRANSFER_SENDER = id;
        entries.push(emit("PolicyCreated", `#${id} · BLOCKLIST · admin ${me}`, 0));
        entries.push(emit("updateBlocklist", `#${id} · add ${op.target}`, 1));
        entries.push(emit("PolicyUpdated", `TRANSFER_SENDER → #${id}`, 2));
        return;
      }
      case "permit": {
        const { owner, spender, amt, nonce } = op;
        const current = s.nonces[owner] || 0;
        if (nonce !== current) return entries.push(revert("ERC2612InvalidSigner", `stale nonce ${nonce} ≠ ${current}`));
        s.allowances[owner + "→" + spender] = amt;
        s.nonces[owner] = current + 1;
        return entries.push(emit("Approval", `${owner} → ${spender} · ${amt} (permit, relayed by ${me})`, 0));
      }
      case "updateMultiplier": {
        if (!roleHas("OPERATOR_ROLE", me)) return entries.push(revert("AccessControlUnauthorizedAccount", `${me} lacks OPERATOR_ROLE`));
        s.token = { ...s.token, multiplier: op.value };
        return entries.push(emit("MultiplierUpdated", `${op.value}× (WAD)`, 0));
      }
      case "announceBatchMint": {
        const { recipients, amt, id } = op;
        if (!roleHas("OPERATOR_ROLE", me)) return entries.push(revert("AccessControlUnauthorizedAccount", `${me} lacks OPERATOR_ROLE`));
        entries.push(emit("Announcement", `id ${id} · dividend batchMint`, 0));
        recipients.forEach((r, i) => {
          s.balances[r] = (s.balances[r] || 0) + amt;
          entries.push(emit("Transfer", `0x0 → ${r} · ${amt}`, i + 1));
        });
        entries.push(emit("EndAnnouncement", `id ${id}`, recipients.length + 1));
        return;
      }
      default:
        return;
    }
  };

  const runOps = (s, ops) => {
    const entries = [];
    ops.forEach(op => applyOp(s, op, op.as, entries));
    return entries;
  };

  // ======================================================================
  // Flow definitions. Each step: plain-language situation → one action →
  // visible consequence. API names appear in results, never in the ask.
  // Inspector summary rows use B20 domain concepts.
  // ======================================================================
  const FLOWS = {
    seize: {
      label: "Freeze & seize",
      title: "Freeze and seize, as compliance sees it",
      erc20: "On plain ERC-20: you build and audit a custom blocklist token.",
      readout: "balances",
      steps: [
        {
          stage: "Mint",
          action: "Mint to Bob",
          text: "Bob holds 50 aUSD.",
          summary: [["Operation", "Mint"], ["Role", "MINT_ROLE"], ["Token", "aUSD"], ["Account", "Bob"], ["Amount", M("50 aUSD")], ["Network", NETWORK]],
          run: (s) => {
            if (!s.token) createInSim(s, "STABLECOIN");
            return { entries: runOps(s, [{ as: "Issuer", type: "mint", to: "Bob", amt: 50 }]) };
          },
        },
        {
          stage: "Freeze",
          action: "Freeze account",
          text: "A court order arrives. Freeze Bob's account.",
          summary: [["Operation", "Freeze"], ["Role", "DEFAULT_ADMIN_ROLE"], ["Policy", M("#2 · BLOCKLIST")], ["Account", "Bob"], ["Network", NETWORK]],
          run: (s) => ({
            entries: runOps(s, [{ as: "Issuer", type: "freeze", target: "Bob" }]),
            caption: "Bob can no longer send. No one else is affected.",
          }),
        },
        {
          stage: "Attempt",
          action: "Attempt payment",
          text: "Bob tries to pay Alice anyway.",
          summary: [["Operation", "Transfer"], ["Account", "Bob → Alice"], ["Amount", M("10 aUSD")], ["Policy", "TRANSFER_SENDER blocklist"], ["Status", "Denied"]],
          run: (s) => ({
            entries: runOps(s, [{ as: "Bob", type: "transfer", from: "Bob", to: "Alice", amt: 10 }]),
            caption: "Blocked by the protocol, not by custom contract code.",
          }),
        },
        {
          stage: "Seize",
          action: "Seize funds",
          text: "Seize the frozen balance.",
          summary: [["Operation", "burnBlocked"], ["Role", "BURN_BLOCKED_ROLE"], ["Account", "Bob (frozen)"], ["Amount", M("50 aUSD")], ["Network", NETWORK]],
          run: (s) => ({
            entries: runOps(s, [{ as: "Issuer", type: "burnBlocked", target: "Bob", amt: 50 }]),
            caption: "Seizure only works on a frozen account. It can't skip the freeze.",
          }),
        },
      ],
    },

    memo: {
      label: "Invoice memo",
      title: "An invoice paid and matched",
      erc20: "On plain ERC-20: transfers carry no reference, so you run a deposit address per customer.",
      readout: null,
      steps: [
        {
          stage: "Fund",
          action: "Fund Alice",
          text: "Alice has 100 aUSD to spend.",
          summary: [["Operation", "Mint"], ["Role", "MINT_ROLE"], ["Token", "aUSD"], ["Account", "Alice"], ["Amount", M("100 aUSD")], ["Network", NETWORK]],
          run: (s) => {
            if (!s.token) createInSim(s, "STABLECOIN");
            return { entries: runOps(s, [{ as: "Issuer", type: "mint", to: "Alice", amt: 100 }]) };
          },
        },
        {
          stage: "Pay",
          action: "Pay 25 aUSD",
          text: "Alice pays invoice #8842. The reference rides in the payment.",
          summary: [["Operation", "Transfer"], ["Account", "Alice → Processor"], ["Amount", M("25 aUSD")], ["Memo", M('"invoice-8842"')], ["Network", NETWORK]],
          run: (s) => ({
            entries: runOps(s, [{ as: "Alice", type: "transfer", from: "Alice", to: "Processor", amt: 25, memo: "invoice-8842" }]),
            caption: "One transaction: payment and reference.",
          }),
        },
        {
          stage: "Match",
          action: "Match payment",
          text: "The back office matches the payment to the order.",
          summary: [["Operation", "Reconcile"], ["Query", M("(txHash, logIndex−1)")], ["Matched", M('"invoice-8842" → 25 aUSD')]],
          run: () => ({
            entries: [
              info("query", "find Transfer at (txHash, Memo.logIndex − 1)"),
              info("matched", '"invoice-8842" → 25 aUSD from Alice ✓'),
            ],
            caption: "Reconciliation is one log query, not a deposit address per customer.",
          }),
        },
      ],
    },

    permit: {
      label: "Gasless permit",
      title: "A first-time user, zero ETH",
      erc20: "On plain ERC-20: the user buys ETH and sends an onchain approve first.",
      readout: "allowance",
      steps: [
        {
          stage: "Fund",
          action: "Fund with aUSD",
          text: "Alice just signed up. She has aUSD and zero ETH for gas.",
          summary: [["Operation", "Mint"], ["Role", "MINT_ROLE"], ["Token", "aUSD"], ["Account", "Alice"], ["Amount", M("100 aUSD")], ["Network", NETWORK]],
          run: (s) => {
            if (!s.token) createInSim(s, "STABLECOIN");
            return { entries: runOps(s, [{ as: "Issuer", type: "mint", to: "Alice", amt: 100 }]) };
          },
        },
        {
          stage: "Sign",
          action: "Sign approval",
          text: "Alice signs an approval offchain. It costs her nothing.",
          summary: [["Operation", "permit (EIP-712)"], ["Signer", "Alice"], ["Spender", "Processor"], ["Value", M("100 aUSD")], ["Gas", M("0 (offchain)")]],
          run: (s) => {
            s.sig = { nonce: s.nonces["Alice"] || 0 };
            return {
              entries: [
                info("signed payload", `owner Alice · spender Processor · value 100 · nonce ${s.sig.nonce}`),
                info("cost to Alice", "0 gas, nothing sent onchain"),
              ],
            };
          },
        },
        {
          stage: "Relay",
          action: "Relay & collect",
          text: "The platform relays her signature and collects the payment.",
          summary: [["Operation", "permit + transferFrom"], ["Account", "Processor"], ["Amount", M("40 aUSD")], ["Nonce", M("0 → 1")], ["Network", NETWORK]],
          run: (s) => ({
            entries: runOps(s, [
              { as: "Processor", type: "permit", owner: "Alice", spender: "Processor", amt: 100, nonce: s.sig ? s.sig.nonce : 0 },
              { as: "Processor", type: "transferFrom", from: "Alice", to: "Processor", amt: 40 },
            ]),
            caption: "Alice never sent a transaction. The nonce blocks replay.",
          }),
        },
      ],
    },

    equity: {
      label: "Stock split",
      title: "A share of stock, onchain",
      erc20: "On plain ERC-20: a rebasing token is a custom contract, and disclosures live offchain.",
      readout: "scaled",
      steps: [
        {
          stage: "Create",
          action: "Create token",
          text: "ACME lists onchain with its security identifiers.",
          summary: [["Operation", "createB20"], ["Token", "ACME"], ["Variant", "ASSET"], ["Metadata", M("cusip 38259P508")], ["Network", NETWORK]],
          run: (s) => {
            createInSim(s, "EQUITY");
            return {
              entries: [
                info("createB20", `asset · ACME · ${tokenAddress("ASSET", "ACME")}`),
                info("initCalls", 'updateExtraMetadata("cusip", "38259P508")'),
              ],
              caption: "One factory call, with no contract to write or audit.",
            };
          },
        },
        {
          stage: "Distribute",
          action: "Distribute shares",
          text: "Shareholders hold ACME.",
          summary: [["Operation", "Mint ×2"], ["Role", "MINT_ROLE"], ["Token", "ACME"], ["Account", "Alice, Bob"], ["Amount", M("100 / 50 ACME")]],
          run: (s) => ({
            entries: runOps(s, [
              { as: "Issuer", type: "mint", to: "Alice", amt: 100 },
              { as: "Issuer", type: "mint", to: "Bob", amt: 50 },
            ]),
          }),
        },
        {
          stage: "Split",
          action: "Run the split",
          text: "The board declares a 2-for-1 split.",
          summary: [["Operation", "updateMultiplier"], ["Role", "OPERATOR_ROLE"], ["Multiplier", M("2.0×")], ["Network", NETWORK]],
          run: (s) => ({
            entries: runOps(s, [{ as: "Issuer", type: "updateMultiplier", value: 2.0 }]),
            caption: "Every balance doubles in one call, without a migration or a new contract.",
          }),
        },
        {
          stage: "Dividend",
          action: "Announce & distribute",
          text: "A dividend goes out with public disclosure.",
          summary: [["Operation", "announceBatchMint"], ["Role", "OPERATOR_ROLE"], ["Dividend", M("10 ACME each")], ["Announcement", M("id 7")]],
          run: (s) => ({
            entries: runOps(s, [{ as: "Issuer", type: "announceBatchMint", recipients: ["Alice", "Bob"], amt: 10, id: 7 }]),
            caption: "Disclosure and distribution land in the same transaction.",
          }),
        },
      ],
    },
  };

  const order = ["seize", "memo", "permit", "equity"];
  const pinned = flow && FLOWS[flow] ? flow : null;

  // ----- widget state -----
  const [active, setActive] = useState(pinned || "seize");
  const [sim, setSim] = useState(freshSim);
  const [results, setResults] = useState([]); // one entry per completed step

  const f = FLOWS[active] || FLOWS.seize;
  const stepIndex = results.length;
  const done = stepIndex >= f.steps.length;
  const cur = done ? f.steps[f.steps.length - 1] : f.steps[stepIndex];

  const select = (k) => { setActive(k); setSim(freshSim()); setResults([]); };
  const reset = () => { setSim(freshSim()); setResults([]); };
  const runStep = () => {
    if (done) return;
    const s = cloneSim(sim);
    const out = f.steps[stepIndex].run(s) || { entries: [] };
    setSim(s);
    setResults(r => [...r, out]);
  };
  const back = () => {
    const n = results.length - 1;
    if (n < 0) return;
    const s = freshSim();
    for (let i = 0; i < n; i++) f.steps[i].run(s);
    setSim(s);
    setResults(r => r.slice(0, -1));
  };

  // ---- event log (flatten results + pending, deterministic timestamps) ----
  const pad = (n) => String(n).padStart(2, "0");
  const ts = (n) => { const t = (42 * 60 + 11) + n; return `10:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}`; };
  const logRows = [];
  let sec = 0;
  results.forEach((res) => {
    (res.entries || []).forEach((e) => {
      const kind = e.kind === "revert" ? "err" : e.kind === "info" ? "info" : "ok";
      const level = e.kind === "revert" ? "ERROR" : e.kind === "info" ? "INFO" : "EVENT";
      const detail = (e.logIndex !== null && e.logIndex !== undefined ? `[${e.logIndex}] ` : "") + (e.args || "");
      logRows.push({ t: ts(sec++), level, name: e.name, detail: detail.trim(), kind });
    });
  });
  f.steps.slice(stepIndex).forEach((st) => { logRows.push({ t: ts(sec++), level: "PENDING", name: st.action, detail: "", kind: "pending" }); });

  // ---- small building blocks ----
  const StatusTag = ({ state }) => {
    const map = { done: [C.success, "Complete"], now: [C.blue, "In progress"], future: [C.sub, "Pending"] };
    const [col, txt] = map[state];
    return <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, color: col }}>{txt}</span>;
  };

  const levelColor = { EVENT: C.blue, INFO: C.sec, ERROR: C.error, PENDING: C.sub };

  // ---- structured domain readout (roles / balances / allowance / shares) ----
  const holders = Object.keys(sim.balances);
  const frozen = f.readout === "balances" && sim.scopes.TRANSFER_SENDER !== 0;
  const scaled = f.readout === "scaled";

  const renderReadout = () => {
    if (!f.readout || !sim.token) return null;
    if (f.readout === "allowance") {
      const allowanceLabel = "Allowance";
      return (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: sans, fontSize: 10, fontWeight: 600, letterSpacing: ".6px", textTransform: "uppercase", color: C.sub, marginBottom: 8 }}>{allowanceLabel}</div>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: sans, fontSize: 12.5, color: C.body }}>
              <span style={{ flex: 1 }}>allowance(Alice → Processor)</span>
              <span style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 600, color: C.ink }}>{fmt(sim.allowances["Alice→Processor"] || 0)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: sans, fontSize: 12.5, color: C.body }}>
              <span style={{ flex: 1 }}>nonce(Alice)</span>
              <span style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 600, color: C.ink }}>{sim.nonces["Alice"] || 0}</span>
            </div>
          </div>
        </div>
      );
    }
    if (!holders.length) return null;
    const heading = scaled ? "Shares" : "Balances";
    return (
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
          <div style={{ fontFamily: sans, fontSize: 10, fontWeight: 600, letterSpacing: ".6px", textTransform: "uppercase", color: C.sub }}>{heading}</div>
          {scaled && sim.token.multiplier !== 1 && (
            <span style={{ fontFamily: mono, fontSize: 10.5, color: C.sub }}>multiplier() = {sim.token.multiplier}×</span>
          )}
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {holders.map((a) => (
            <div key={a} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: sans, fontSize: 12.5, color: C.body }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot[a] || C.sub, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{a}</span>
              {frozen && a === "Bob" && <span style={{ fontFamily: sans, fontSize: 9.5, fontWeight: 600, letterSpacing: ".3px", textTransform: "uppercase", color: C.error, border: `1px solid ${C.error}`, borderRadius: 4, padding: "0 4px" }}>frozen</span>}
              {scaled && sim.token.multiplier !== 1 && (
                <span style={{ fontFamily: mono, fontSize: 11.5, color: C.blue }}>→ {((sim.balances[a] || 0) * sim.token.multiplier).toFixed(0)}</span>
              )}
              <span style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 600, color: C.ink }}>{fmt(sim.balances[a] || 0)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="wf" style={{ margin: "22px 0", maxWidth: 760, borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, overflow: "hidden", boxShadow: "0 1px 2px rgba(10,11,13,.04)" }}>
      <style>{`
        .wf, .wf * { box-sizing: border-box; }
        .wf-nav { display: flex; gap: 20px; }
        .wf-split { display: grid; grid-template-columns: 43% 57%; }
        .wf-rail { border-right: 1px solid ${C.border}; }
        @keyframes wf-in { from { opacity: 0; transform: translateY(3px);} to { opacity: 1; transform: none; } }
        .wf-anim { animation: wf-in .26s ease both; }
        .wf-btn { font-family: ${sans}; font-size: 13px; font-weight: 600; border-radius: 6px; padding: 10px 14px; cursor: pointer; transition: filter .15s ease; border: 1px solid ${C.blue}; background: ${C.blue}; color: ${C.onBlue}; width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 7px; }
        .wf-btn:hover { filter: brightness(1.1); }
        .wf-btn:disabled { background: ${C.panel}; border-color: ${C.border}; color: ${C.sub}; cursor: default; filter: none; }
        .wf-btn2 { font-family: ${sans}; font-size: 13px; font-weight: 600; border-radius: 6px; padding: 10px 14px; cursor: pointer; background: ${C.white}; border: 1px solid ${C.border}; color: ${C.body}; width: 100%; transition: background .15s ease; }
        .wf-btn2:hover { background: ${C.panel}; }
        .wf-pill { font-family: ${sans}; font-size: 12px; font-weight: 500; border-radius: 6px; padding: 5px 10px; cursor: pointer; white-space: nowrap; color: ${C.sec}; background: ${C.white}; border: 1px solid ${C.border}; transition: all .12s ease; }
        .wf-pill:hover { color: ${C.ink}; border-color: ${C.sub}; }
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
          <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 600, letterSpacing: ".6px", textTransform: "uppercase", color: C.sub, marginRight: 4 }}>Scenario</span>
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
        <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 600, letterSpacing: ".6px", textTransform: "uppercase", color: C.sub, border: `1px solid ${C.border}`, borderRadius: 5, padding: "2px 6px", flexShrink: 0 }}>Demo</span>
        {results.length > 0 && (
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
            const res = results[i];
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
                  <div style={{ fontFamily: sans, fontSize: 13, fontWeight: state === "future" ? 500 : 600, color: state === "future" ? C.sub : C.ink, lineHeight: 1.3 }}>{st.action}</div>
                  <div style={{ marginTop: 2 }}><StatusTag state={state} /></div>
                  {state === "done" && res && res.caption && (
                    <div style={{ fontFamily: sans, fontSize: 11.5, color: C.sec, lineHeight: 1.45, marginTop: 4, borderLeft: `2px solid ${C.border}`, paddingLeft: 8 }}>{res.caption}</div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Domain readout (roles / balances / allowance / shares) */}
          {renderReadout()}
        </div>

        {/* Right inspector */}
        <div style={{ padding: "16px 18px", background: C.white, minWidth: 0 }}>
          {done ? (
            <div className="wf-anim">
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: sans, fontSize: 12.5, fontWeight: 600, color: C.success, background: C.successSoft, borderRadius: 6, padding: "5px 10px" }}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke={C.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                Flow complete
              </div>
              <div style={{ fontFamily: sans, fontSize: 13.5, color: C.body, lineHeight: 1.5, margin: "12px 0 16px" }}>{f.title} — every step ran onchain in the simulation above.</div>
              <button className="wf-btn2" onClick={reset}>Run again</button>
            </div>
          ) : (
            <div className="wf-anim" key={stepIndex}>
              <div style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", color: C.ink }}>{cur.action}</div>
              <div style={{ fontFamily: sans, fontSize: 13, color: C.sec, lineHeight: 1.5, marginTop: 5 }}>{cur.text}</div>

              <div style={{ marginTop: 14, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
                {cur.summary.map(([k, val], i) => {
                  const isM = val && typeof val === "object" && val.mono;
                  const v = isM ? val.v : val;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "9px 12px", borderTop: i ? `1px solid ${C.border}` : "none" }}>
                      <span style={{ fontFamily: sans, fontSize: 12.5, color: C.sec }}>{k}</span>
                      <span style={{ fontFamily: isM ? mono : sans, fontSize: isM ? 12 : 12.5, fontWeight: isM ? 500 : 600, color: C.ink, textAlign: "right", wordBreak: "break-word" }}>
                        {k === "Network" && <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: C.cerulean, marginRight: 6 }} />}
                        {v}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
                <button className="wf-btn" onClick={runStep}>
                  {cur.action}
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </button>
                {results.length > 0 && <button className="wf-btn2" onClick={back}>Back</button>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Event log */}
      <div style={{ borderTop: `1px solid ${C.border}`, background: C.white }}>
        <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontFamily: sans, fontSize: 12.5, fontWeight: 600, color: C.ink }}>Transaction event log</span>
        </div>
        <div style={{ maxHeight: 168, overflowY: "auto", padding: "6px 0" }}>
          {logRows.map((r, i) => (
            <div key={i} className={r.kind === "pending" ? "" : "wf-anim"} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 16px", opacity: r.kind === "pending" ? 0.5 : 1 }}>
              <span style={{ fontFamily: mono, fontSize: 11, color: C.sub, flexShrink: 0 }}>{r.t}</span>
              <span style={{ fontFamily: mono, fontSize: 10.5, fontWeight: 600, color: levelColor[r.level], flexShrink: 0, width: 58 }}>[{r.level}]</span>
              <span style={{ fontFamily: mono, fontSize: 11.5, color: r.kind === "err" ? C.error : C.body, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {r.name}{r.detail ? <span style={{ color: C.sub }}> · {r.detail}</span> : null}
              </span>
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
        <span style={{ fontFamily: sans, fontSize: 11, color: C.sub, lineHeight: 1.4 }}>{f.erc20}</span>
      </div>
    </div>
  );
};
