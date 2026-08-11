export const StablecoinDemo = ({ flow }) => {
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
  const dot = { Issuer: C.blue, Alice: "#66c800", Bob: "#ffd12f", Merchant: "#3c8aff" };

  const TOKEN = "aUSD";
  const NETWORK = "Base Vibenet";

  // ---- result-line helpers ----
  const ok = (name, detail) => ({ kind: "ok", name, detail: detail || "" });
  const err = (name, detail) => ({ kind: "err", name, detail: detail || "" });
  const nfo = (name, detail) => ({ kind: "info", name, detail: detail || "" });
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const M = (v) => ({ v, mono: true });

  const freshSim = () => ({ balances: {}, blocked: null });

  // ======================================================================
  // Scripted flows. Each step mutates a cloned sim and returns log lines.
  // ======================================================================
  const FLOWS = {
    issue: {
      label: "Issue", title: "Issue a stablecoin in one call", readout: false,
      erc20: "On plain ERC-20 you write, deploy, and audit a token contract.",
      steps: [
        { stage: "Create", action: "Create token",
          text: "Create a fiat-backed token. Name, currency, and admin are set at creation.",
          summary: [["Operation", "Create token"], ["Token", TOKEN], ["Standard", "B20"], ["Network", NETWORK]],
          run: () => ({ entries: [ok("createB20", "stablecoin · aUSD · 0xB20…a1c9"), nfo("initCalls", "grantRole(MINT_ROLE, Issuer)")], caption: "One factory call, with no contract to write or audit." }) },
        { stage: "Confirm", action: "Confirm",
          text: "It's live and fully ERC-20 compatible.",
          summary: [["currency()", M('"USD"')], ["decimals()", M("6")], ["Network", NETWORK]],
          run: () => ({ entries: [nfo("currency()", '"USD"'), nfo("decimals()", "6")], caption: "Every wallet and exchange that speaks ERC-20 works with it unchanged." }) },
      ],
    },
    mint: {
      label: "Mint", title: "Mint as reserves grow", readout: true,
      erc20: "On plain ERC-20, mint permissions and supply caps are custom code.",
      steps: [
        { stage: "Mint", action: "Mint 1,000",
          text: "1,000 in fiat lands in reserves. Mint matching supply.",
          summary: [["Operation", "Mint"], ["To", "Alice"], ["Amount", M("1,000 aUSD")], ["Network", NETWORK]],
          run: (s) => { s.balances.Alice = (s.balances.Alice || 0) + 1000; return { entries: [ok("Transfer", "0x0 → Alice · 1,000")] }; } },
        { stage: "Cap", action: "Cap at 1,200",
          text: "Cap supply so circulation can't exceed reserves.",
          summary: [["Operation", "Set supply cap"], ["Cap", M("1,200 aUSD")], ["Network", NETWORK]],
          run: () => ({ entries: [ok("SupplyCapUpdated", "cap 1,200")] }) },
        { stage: "Enforce", action: "Try minting 500",
          text: "A mint past the cap is rejected by the protocol.",
          summary: [["Operation", "Mint"], ["Amount", M("500 aUSD")], ["Guard", "Supply cap 1,200"], ["Network", NETWORK]],
          run: () => ({ entries: [err("SupplyCapExceeded", "cap 1,200 · supply 1,000")], caption: "Supply can never exceed the cap you set." }) },
      ],
    },
    burn: {
      label: "Burn", title: "Burn on redemption", readout: true,
      erc20: "On plain ERC-20, redemption bookkeeping is custom code.",
      steps: [
        { stage: "Fund", action: "Fund Alice",
          text: "Alice holds 1,000 aUSD.",
          summary: [["Operation", "Mint"], ["To", "Alice"], ["Amount", M("1,000 aUSD")]],
          run: (s) => { s.balances.Alice = 1000; return { entries: [ok("Transfer", "0x0 → Alice · 1,000")] }; } },
        { stage: "Return", action: "Return 400",
          text: "Alice redeems 400 for fiat and returns the tokens.",
          summary: [["Operation", "Transfer"], ["From", "Alice"], ["To", "Issuer"], ["Amount", M("400 aUSD")]],
          run: (s) => { s.balances.Alice -= 400; s.balances.Issuer = (s.balances.Issuer || 0) + 400; return { entries: [ok("Transfer", "Alice → Issuer · 400")] }; } },
        { stage: "Burn", action: "Burn 400",
          text: "Retire the returned tokens so supply matches reserves.",
          summary: [["Operation", "Burn"], ["From", "Issuer"], ["Amount", M("400 aUSD")], ["Memo", M('"redeem-8842"')]],
          run: (s) => { s.balances.Issuer -= 400; return { entries: [ok("Transfer", "Issuer → 0x0 · 400"), ok("Memo", '"redeem-8842"')], caption: "The burned tokens leave circulation for good." }; } },
      ],
    },
    restrict: {
      label: "Restrict", title: "Only approved accounts can hold it", readout: true,
      erc20: "On plain ERC-20, KYC gating is a custom transfer hook you build and audit.",
      steps: [
        { stage: "Enable", action: "Enable allowlist",
          text: "Turn on your KYC allowlist. Approve Alice and your merchant.",
          summary: [["Operation", "Enable allowlist"], ["Policy", "#2 · ALLOWLIST"], ["Approved", "Alice, Merchant"], ["Network", NETWORK]],
          run: () => ({ entries: [ok("PolicyCreated", "#2 · ALLOWLIST"), ok("updateAllowlist", "allow Alice, Merchant"), ok("PolicyUpdated", "TRANSFER_SENDER, TRANSFER_RECEIVER → #2")], caption: "Every account is denied until you approve it." }) },
        { stage: "Transact", action: "Alice pays merchant",
          text: "Approved accounts transact normally.",
          summary: [["Operation", "Transfer"], ["From", "Alice"], ["To", "Merchant"], ["Amount", M("40 aUSD")]],
          run: (s) => { s.balances.Alice = 100 - 40; s.balances.Merchant = 40; return { entries: [ok("Transfer", "0x0 → Alice · 100"), ok("Transfer", "Alice → Merchant · 40")] }; } },
        { stage: "Enforce", action: "Try paying Bob",
          text: "An account you haven't approved is turned away.",
          summary: [["Operation", "Transfer"], ["To", "Bob"], ["Policy", "Allowlist #2"], ["Status", "Denied"]],
          run: () => ({ entries: [err("PolicyForbids", "TRANSFER_RECEIVER · Bob")], caption: "Bob isn't on the allowlist, so the transfer can't land." }) },
      ],
    },
    block: {
      label: "Block", title: "Block one address, leave everyone else", readout: true,
      erc20: "On plain ERC-20, a blocklist is custom contract code.",
      steps: [
        { stage: "Fund", action: "Mint to Bob",
          text: "Bob holds 50 aUSD.",
          summary: [["Operation", "Mint"], ["To", "Bob"], ["Amount", M("50 aUSD")]],
          run: (s) => { s.balances.Bob = 50; return { entries: [ok("Transfer", "0x0 → Bob · 50")] }; } },
        { stage: "Block", action: "Block address",
          text: "A compliance hold comes in for Bob's address.",
          summary: [["Operation", "Block"], ["Account", "Bob"], ["Policy", "Blocklist"], ["Network", NETWORK]],
          run: (s) => { s.blocked = "Bob"; return { entries: [ok("updateBlocklist", "add Bob"), ok("PolicyUpdated", "TRANSFER_SENDER → blocklist")], caption: "Only Bob is affected. The token keeps trading for everyone else." }; } },
        { stage: "Enforce", action: "Bob tries to pay",
          text: "Bob can no longer move funds.",
          summary: [["Operation", "Transfer"], ["From", "Bob"], ["Policy", "Blocklist"], ["Status", "Denied"]],
          run: () => ({ entries: [err("PolicyForbids", "TRANSFER_SENDER · Bob")], caption: "Blocked by the protocol, not by custom contract code." }) },
        { stage: "Unblock", action: "Unblock",
          text: "When the hold clears, unblock the address.",
          summary: [["Operation", "Unblock"], ["Account", "Bob"], ["Policy", "Blocklist"]],
          run: (s) => { s.blocked = null; return { entries: [ok("updateBlocklist", "remove Bob")], caption: "Bob can transact again." }; } },
      ],
    },
    recover: {
      label: "Recover", title: "Recover funds from a blocked account", readout: true,
      erc20: "On plain ERC-20, there's no safe recovery path without custom code.",
      steps: [
        { stage: "Setup", action: "Set up",
          text: "Bob's address is blocked and holds 50 aUSD.",
          summary: [["Operation", "Block + fund"], ["Account", "Bob"], ["Amount", M("50 aUSD")]],
          run: (s) => { s.balances.Bob = 50; s.blocked = "Bob"; return { entries: [ok("Transfer", "0x0 → Bob · 50"), ok("updateBlocklist", "add Bob")] }; } },
        { stage: "Reclaim", action: "Reclaim funds",
          text: "A holder lost their keys. Reclaim the balance.",
          summary: [["Operation", "Recover"], ["From", "Bob (blocked)"], ["Amount", M("50 aUSD")]],
          run: (s) => { s.balances.Bob = 0; return { entries: [ok("Transfer", "Bob → 0x0 · 50 (recovered)")], caption: "Recovery only works on an account that's already blocked." }; } },
        { stage: "Reissue", action: "Reissue",
          text: "Reissue to the holder's new address.",
          summary: [["Operation", "Mint"], ["To", "Alice"], ["Amount", M("50 aUSD")]],
          run: (s) => { s.balances.Alice = (s.balances.Alice || 0) + 50; return { entries: [ok("Transfer", "0x0 → Alice · 50")], caption: "Circulating supply is unchanged: reclaimed, then reissued." }; } },
      ],
    },
    pause: {
      label: "Pause", title: "Halt activity in an incident", readout: true,
      erc20: "On plain ERC-20, a pause switch is custom code, usually all-or-nothing.",
      steps: [
        { stage: "Fund", action: "Fund Alice",
          text: "Alice holds 100 aUSD. Everything is running normally.",
          summary: [["Operation", "Mint"], ["To", "Alice"], ["Amount", M("100 aUSD")]],
          run: (s) => { s.balances.Alice = 100; return { entries: [ok("Transfer", "0x0 → Alice · 100")] }; } },
        { stage: "Pause", action: "Pause transfers",
          text: "An incident hits. Halt transfers instantly.",
          summary: [["Operation", "Pause"], ["Scope", "TRANSFER"], ["Network", NETWORK]],
          run: () => ({ entries: [ok("Paused", "TRANSFER")], caption: "Only transfers stop. Pausing is granular." }) },
        { stage: "Enforce", action: "Try a transfer",
          text: "No one can move funds while transfers are paused.",
          summary: [["Operation", "Transfer"], ["Scope", "TRANSFER (paused)"], ["Status", "Blocked"]],
          run: () => ({ entries: [err("EnforcedPause", "TRANSFER is paused")] }) },
        { stage: "Resume", action: "Resume",
          text: "Resume once the incident is resolved.",
          summary: [["Operation", "Unpause"], ["Scope", "TRANSFER"]],
          run: () => ({ entries: [ok("Unpaused", "TRANSFER")], caption: "Transfers work again." }) },
      ],
    },
    reconcile: {
      label: "Reconcile", title: "Match a payment to an order", readout: false,
      erc20: "On plain ERC-20, transfers carry no reference, so you run a deposit address per customer.",
      steps: [
        { stage: "Pay", action: "Pay with memo",
          text: "Alice pays your processor 25 aUSD, tagged with the invoice.",
          summary: [["Operation", "Transfer"], ["From", "Alice"], ["To", "Merchant"], ["Amount", M("25 aUSD")], ["Memo", M('"invoice-8842"')]],
          run: () => ({ entries: [ok("Transfer", "Alice → Merchant · 25"), ok("Memo", '"invoice-8842"')], caption: "One transaction carries both the payment and the reference." }) },
        { stage: "Match", action: "Match payment",
          text: "The back office matches the payment to the order.",
          summary: [["Operation", "Reconcile"], ["Query", M("(txHash, logIndex−1)")], ["Matched", "invoice-8842 → 25 aUSD"]],
          run: () => ({ entries: [nfo("query", "Transfer at (txHash, Memo.logIndex − 1)"), nfo("matched", '"invoice-8842" → 25 aUSD ✓')], caption: "Reconciliation is one log query, not a deposit address per customer." }) },
      ],
    },
  };

  const order = ["issue", "mint", "burn", "restrict", "block", "recover", "pause", "reconcile"];
  const pinned = flow && FLOWS[flow] ? flow : null;

  const [active, setActive] = useState(pinned || "issue");
  const [sim, setSim] = useState(freshSim);
  const [results, setResults] = useState([]);

  const f = FLOWS[active] || FLOWS.issue;
  const stepIndex = results.length;
  const done = stepIndex >= f.steps.length;
  const cur = done ? f.steps[f.steps.length - 1] : f.steps[stepIndex];

  const select = (k) => { setActive(k); setSim(freshSim()); setResults([]); };
  const reset = () => { setSim(freshSim()); setResults([]); };
  const runStep = () => {
    if (done) return;
    const s = { balances: { ...sim.balances }, blocked: sim.blocked };
    const out = f.steps[stepIndex].run(s) || { entries: [] };
    setSim(s);
    setResults((r) => [...r, out]);
  };
  const back = () => {
    const n = results.length - 1;
    if (n < 0) return;
    let s = freshSim();
    for (let i = 0; i < n; i++) f.steps[i].run(s);
    setSim(s);
    setResults((r) => r.slice(0, -1));
  };

  // ---- event log (flatten results + pending, deterministic timestamps) ----
  const pad = (n) => String(n).padStart(2, "0");
  const ts = (n) => { const t = (42 * 60 + 11) + n; return `10:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}`; };
  const logRows = [];
  let sec = 0;
  results.forEach((res) => {
    (res.entries || []).forEach((e) => {
      logRows.push({ t: ts(sec++), level: e.kind === "err" ? "ERROR" : e.kind === "info" ? "INFO" : "EVENT", name: e.name, detail: e.detail, kind: e.kind });
    });
  });
  f.steps.slice(stepIndex).forEach((st) => { logRows.push({ t: ts(sec++), level: "PENDING", name: st.action, detail: "", kind: "pending" }); });

  const holders = Object.keys(sim.balances);

  // ---- small building blocks ----
  const StatusTag = ({ state }) => {
    const map = { done: [C.success, "Complete"], now: [C.blue, "In progress"], future: [C.sub, "Pending"] };
    const [col, txt] = map[state];
    return <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, color: col }}>{txt}</span>;
  };

  const levelColor = { EVENT: C.blue, INFO: C.sec, ERROR: C.error, PENDING: C.sub };

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
                </div>
              </div>
            );
          })}

          {/* Balances readout */}
          {f.readout && holders.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: sans, fontSize: 10, fontWeight: 600, letterSpacing: ".6px", textTransform: "uppercase", color: C.sub, marginBottom: 8 }}>Balances</div>
              <div style={{ display: "grid", gap: 6 }}>
                {holders.map((a) => (
                  <div key={a} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: sans, fontSize: 12.5, color: C.body }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot[a] || C.sub, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{a}</span>
                    {sim.blocked === a && <span style={{ fontFamily: sans, fontSize: 9.5, fontWeight: 600, letterSpacing: ".3px", textTransform: "uppercase", color: C.error, border: `1px solid ${C.error}`, borderRadius: 4, padding: "0 4px" }}>blocked</span>}
                    <span style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 600, color: C.ink }}>{fmt(sim.balances[a] || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
