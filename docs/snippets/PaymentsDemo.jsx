export const PaymentsDemo = ({ flow }) => {
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
  const dot = { Merchant: C.blue, Alice: "#66c800", Agent: "#3c8aff" };

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
    accept: {
      label: "Accept", title: "Accept a USDC payment in one call", readout: true,
      erc20: "On card rails you wire a processor, pay fees, and wait days to settle.",
      steps: [
        { stage: "Charge", action: "Charge $5",
          text: "A customer checks out. Charge 5 USDC to your address.",
          summary: [["Payment type", "USDC charge"], ["Merchant", "Merchant"], ["Payer", "Alice"], ["Amount", M("5.00 USDC")], ["Network", NETWORK]],
          run: () => ({ entries: [ok("pay", "5.00 USDC → Merchant"), nfo("network", "Base Vibenet")], caption: "One call. The customer approves in their Base Account — no card, no redirect." }) },
        { stage: "Settle", action: "Settle",
          text: "The payment settles on Base in under two seconds.",
          summary: [["Operation", "Settle"], ["From", "Alice"], ["To", "Merchant"], ["Amount", M("5.00 USDC")], ["Verification", "Completed"]],
          run: (s) => { s.balances.Alice = 5; s.balances.Merchant = (s.balances.Merchant || 0) + 5; s.balances.Alice = 0; return { entries: [ok("Transfer", "Alice → Merchant · 5.00"), nfo("status", "completed")], caption: "Funds land in seconds for pennies in gas — no chargebacks, no FX fees." }; } },
      ],
    },
    verify: {
      label: "Verify", title: "Confirm a payment before you ship", readout: false,
      erc20: "Never trust the browser — confirm settlement server-side before fulfilling.",
      steps: [
        { stage: "Send", action: "Send id",
          text: "Your frontend sends the payment id to your backend.",
          summary: [["Operation", "Confirm order"], ["Endpoint", M("POST /orders/confirm")], ["Payment id", M("0x9f…c2")], ["Network", NETWORK]],
          run: () => ({ entries: [nfo("POST", "/orders/confirm"), nfo("id", "0x9f…c2")] }) },
        { stage: "Verify", action: "Check status",
          text: "Confirm it on-chain with getPaymentStatus.",
          summary: [["Verification", "getPaymentStatus"], ["Payer", "Alice"], ["Amount", M("5.00 USDC")], ["State", "Completed"]],
          run: () => ({ entries: [ok("getPaymentStatus", "completed"), nfo("sender", "Alice"), nfo("amount", "5.00")], caption: "Match sender and amount to the order before fulfilling." }) },
        { stage: "Replay", action: "Replay id",
          text: "A replayed or mismatched id is turned away.",
          summary: [["Operation", "Replay check"], ["Payment id", M("0x9f…c2")], ["Verification", "Already processed"], ["Result", "Rejected"]],
          run: () => ({ entries: [err("rejected", "id already processed")], caption: "Track processed ids to stop replay and impersonation." }) },
      ],
    },
    info: {
      label: "Payer info", title: "Collect email or shipping at checkout", readout: false,
      erc20: "Ask for exactly what you need, verified the moment the customer pays.",
      steps: [
        { stage: "Request", action: "Request info",
          text: "Request an email and shipping address alongside the payment.",
          summary: [["Operation", "Request payer info"], ["Fields", M("email · physicalAddress")], ["Payer", "Alice"], ["Network", NETWORK]],
          run: () => ({ entries: [nfo("payerInfo", "email · physicalAddress")], caption: "The customer sees the request in the same approval popup." }) },
        { stage: "Enter", action: "Pay",
          text: "The customer's details come pre-filled in the approval popup — they review them and tap Pay.",
          summary: [["Operation", "Confirm & pay"], ["email", M("alice@acme.co")], ["physicalAddress", M("Berlin, DE")], ["Amount", M("25.00 USDC")], ["Network", NETWORK]],
          run: () => ({ entries: [nfo("payerInfo", "email · physicalAddress submitted"), nfo("submit", "25.00 USDC · pending validation")], caption: "The details ride along with the payment; nothing is charged until your callback approves." }) },
        { stage: "Validate", action: "Validate",
          text: "Your callback validates the data before any charge.",
          summary: [["Operation", "Validate"], ["email", "ok"], ["physicalAddress", "US/CA/GB only"], ["Verification", "Needs fix"]],
          run: () => ({ entries: [ok("email", "ok"), err("physicalAddress", "ships to US/CA/GB only")], caption: "Return errors and the user is prompted to fix them — before funds move." }) },
        { stage: "Retry", action: "Retry",
          text: "Corrected, the payment and details arrive together.",
          summary: [["Payment type", "USDC charge"], ["Payer", "Alice"], ["Amount", M("25.00 USDC")], ["email", M("alice@acme.co")], ["Network", NETWORK]],
          run: () => ({ entries: [ok("pay", "25.00 USDC → Merchant"), nfo("email", "alice@acme.co"), nfo("address", "San Francisco, CA")], caption: "One step captures the payment and the checkout details." }) },
      ],
    },
    subscribe: {
      label: "Subscribe", title: "Charge a subscription every period", readout: true,
      erc20: "Recurring USDC with no processor and no per-transaction fees.",
      steps: [
        { stage: "Subscribe", action: "Subscribe",
          text: "A customer approves $29.99 / month, once.",
          summary: [["Payment type", "Subscription"], ["Payer", "Alice"], ["Amount", M("29.99 USDC / 30 days")], ["Sub id", M("sub_0x4a…")], ["Network", NETWORK]],
          run: () => ({ entries: [ok("subscribe", "29.99 · 30 days"), nfo("id", "sub_0x4a…")], caption: "One approval via spend permissions. The customer can cancel anytime." }) },
        { stage: "Period 1", action: "Charge period 1",
          text: "Your backend charges when payment is due.",
          summary: [["Operation", "Charge"], ["Payer", "Alice"], ["Amount", M("29.99 USDC")], ["Gas", "Sponsored"]],
          run: (s) => { s.balances.Merchant = (s.balances.Merchant || 0) + 29.99; return { entries: [ok("charge", "29.99 USDC"), nfo("gas", "sponsored")] }; } },
        { stage: "Period 2", action: "Charge period 2",
          text: "Next period, charge again — no user action.",
          summary: [["Operation", "Charge"], ["Period", M("2")], ["Amount", M("29.99 USDC")], ["Network", NETWORK]],
          run: (s) => { s.balances.Merchant = (s.balances.Merchant || 0) + 29.99; return { entries: [ok("charge", "29.99 USDC")], caption: "The limit resets each period; unused amounts don't roll over." }; } },
        { stage: "Cancel", action: "Revoke",
          text: "The customer cancels; further charges stop.",
          summary: [["Operation", "Revoke"], ["Sub id", M("sub_0x4a…")], ["Verification", "Cancelled"]],
          run: () => ({ entries: [ok("revoke", "sub_0x4a…"), err("charge", "subscription cancelled")], caption: "Users stay in control the whole time." }) },
      ],
    },
    b20: {
      label: "B20", title: "Accept and reconcile a B20 payment", readout: false,
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
  };

  const order = ["accept", "verify", "info", "subscribe", "b20", "x402"];
  const pinned = flow && FLOWS[flow] ? flow : null;

  const [active, setActive] = useState(pinned || "accept");
  const [sim, setSim] = useState(freshSim);
  const [results, setResults] = useState([]);

  const f = FLOWS[active] || FLOWS.accept;
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

          {/* USDC balances readout */}
          {f.readout && holders.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: sans, fontSize: 10, fontWeight: 600, letterSpacing: ".6px", textTransform: "uppercase", color: C.sub, marginBottom: 8 }}>USDC balances</div>
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
