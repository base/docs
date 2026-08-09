export const PaymentsDemo = ({ flow }) => {
  // No imports allowed in Mintlify snippets: useState is injected globally.
  const sans = "'Base Sans','Inter Tight',Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  const mono = "'Base Mono','Roboto Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace";

  const c = {
    bg: "var(--pd-bg)", panel: "var(--pd-panel)", border: "var(--pd-border)", console: "var(--pd-console)",
    text: "var(--pd-text)", body: "var(--pd-body)", muted: "var(--pd-muted)", dim: "var(--pd-dim)",
    accent: "var(--pd-accent)", accentContrast: "var(--pd-accent-contrast)", accentSoft: "var(--pd-accent-soft)",
    success: "var(--pd-success)", successSoft: "var(--pd-success-soft)", error: "var(--pd-error)",
  };
  const dot = { Merchant: "var(--pd-accent)", Alice: "#66c800", Agent: "#3c8aff" };

  // ---- result-line helpers ----
  const ok = (name, detail) => ({ kind: "ok", name, detail: detail || "" });
  const err = (name, detail) => ({ kind: "err", name, detail: detail || "" });
  const nfo = (name, detail) => ({ kind: "info", name, detail: detail || "" });
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // ---- per-flow line icons (stroke uses currentColor) ----
  const glyph = {
    accept: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /></>,
    verify: <><path d="M12 3l7 3v6c0 4-3 6-7 8-4-2-7-4-7-8V6z" /><path d="M9 12l2 2 4-4" /></>,
    info: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 8l9 6 9-6" /></>,
    subscribe: <><path d="M4 12a8 8 0 0 1 13-6.2M20 5v4h-4" /><path d="M20 12a8 8 0 0 1-13 6.2M4 19v-4h4" /></>,
    b20: <><path d="M7 3h10v18l-2.5-1.6L12 21l-2.5-1.6L7 21z" /><path d="M10 8h4M10 12h4" /></>,
    x402: <path d="M13 3 4 14h7l-1 7 9-11h-7z" />,
  };
  const Icon = ({ k, size }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{glyph[k]}</svg>
  );

  const freshSim = () => ({ balances: {}, blocked: null });

  // ======================================================================
  // Scripted flows. Each step mutates a cloned sim and returns log lines.
  // ======================================================================
  const FLOWS = {
    accept: {
      label: "Accept", title: "Accept a USDC payment in one call", readout: true,
      erc20: "On card rails you wire a processor, pay fees, and wait days to settle.",
      steps: [
        { text: "A customer checks out. Charge 5 USDC to your address.", action: "Charge $5",
          run: () => ({ entries: [ok("pay", "5.00 USDC → Merchant"), nfo("network", "Base")], caption: "One call. The customer approves in their Base Account — no card, no redirect." }) },
        { text: "The payment settles on Base in under two seconds.", action: "Settle",
          run: (s) => { s.balances.Alice = 5; s.balances.Merchant = (s.balances.Merchant || 0) + 5; s.balances.Alice = 0; return { entries: [ok("Transfer", "Alice → Merchant · 5.00"), nfo("status", "completed")], caption: "Funds land in seconds for pennies in gas — no chargebacks, no FX fees." }; } },
      ],
    },
    verify: {
      label: "Verify", title: "Confirm a payment before you ship", readout: false,
      erc20: "Never trust the browser — confirm settlement server-side before fulfilling.",
      steps: [
        { text: "Your frontend sends the payment id to your backend.", action: "Send id",
          run: () => ({ entries: [nfo("POST", "/orders/confirm"), nfo("id", "0x9f…c2")] }) },
        { text: "Confirm it on-chain with getPaymentStatus.", action: "Check status",
          run: () => ({ entries: [ok("getPaymentStatus", "completed"), nfo("sender", "Alice"), nfo("amount", "5.00")], caption: "Match sender and amount to the order before fulfilling." }) },
        { text: "A replayed or mismatched id is turned away.", action: "Replay id",
          run: () => ({ entries: [err("rejected", "id already processed")], caption: "Track processed ids to stop replay and impersonation." }) },
      ],
    },
    info: {
      label: "Payer info", title: "Collect email or shipping at checkout", readout: false,
      erc20: "Ask for exactly what you need, verified the moment the customer pays.",
      steps: [
        { text: "Request an email and shipping address alongside the payment.", action: "Request info",
          run: () => ({ entries: [nfo("payerInfo", "email · physicalAddress")], caption: "The customer sees the request in the same approval popup." }) },
        { text: "Your callback validates the data before any charge.", action: "Validate",
          run: () => ({ entries: [ok("email", "ok"), err("physicalAddress", "ships to US/CA/GB only")], caption: "Return errors and the user is prompted to fix them — before funds move." }) },
        { text: "Corrected, the payment and details arrive together.", action: "Retry",
          run: () => ({ entries: [ok("pay", "25.00 USDC → Merchant"), nfo("email", "alice@acme.co"), nfo("address", "San Francisco, CA")], caption: "One step captures the payment and the checkout details." }) },
      ],
    },
    subscribe: {
      label: "Subscribe", title: "Charge a subscription every period", readout: true,
      erc20: "Recurring USDC with no processor and no per-transaction fees.",
      steps: [
        { text: "A customer approves $29.99 / month, once.", action: "Subscribe",
          run: () => ({ entries: [ok("subscribe", "29.99 · 30 days"), nfo("id", "sub_0x4a…")], caption: "One approval via spend permissions. The customer can cancel anytime." }) },
        { text: "Your backend charges when payment is due.", action: "Charge period 1",
          run: (s) => { s.balances.Merchant = (s.balances.Merchant || 0) + 29.99; return { entries: [ok("charge", "29.99 USDC"), nfo("gas", "sponsored")] }; } },
        { text: "Next period, charge again — no user action.", action: "Charge period 2",
          run: (s) => { s.balances.Merchant = (s.balances.Merchant || 0) + 29.99; return { entries: [ok("charge", "29.99 USDC")], caption: "The limit resets each period; unused amounts don't roll over." }; } },
        { text: "The customer cancels; further charges stop.", action: "Revoke",
          run: () => ({ entries: [ok("revoke", "sub_0x4a…"), err("charge", "subscription cancelled")], caption: "Users stay in control the whole time." }) },
      ],
    },
    b20: {
      label: "B20", title: "Accept and reconcile a B20 payment", readout: false,
      erc20: "A B20 memo ties the payment to your order without assigning a deposit address per customer.",
      steps: [
        { text: "Alice pays 25 EXM and includes the order reference in the same transaction.", action: "Pay order",
          run: () => ({ entries: [ok("Transfer", "Alice → Merchant · 25 EXM"), ok("Memo", '"order-8842"')], caption: "transferWithMemo emits the standard transfer and its bytes32 reference together." }) },
        { text: "Your backend reads the receipt and matches the payment to the order.", action: "Reconcile",
          run: () => ({ entries: [nfo("parseEventLogs", "Transfer + Memo"), ok("matched", 'order-8842 · 25 EXM · Alice')], caption: "The payment can still be rejected by the token's holder policy or transfer pause." }) },
      ],
    },
    x402: {
      label: "Agent pays", title: "Let an agent pay per API call", readout: false,
      erc20: "Agents pay for data and services autonomously, one request at a time.",
      steps: [
        { text: "Your agent calls a paid API. It returns 402 Payment Required.", action: "Call API",
          run: () => ({ entries: [nfo("GET", "/v1/market-report"), err("402", "Payment Required · 0.02 USDC")] }) },
        { text: "The x402 client pays and retries automatically.", action: "Pay & retry",
          run: () => ({ entries: [ok("x402", "paid 0.02 USDC on Base"), ok("200", "report delivered")], caption: "A wrapped fetch turns a 402 into a paid, completed request." }) },
        { text: "You cap spend so an agent never overpays.", action: "Enforce cap",
          run: () => ({ entries: [err("blocked", "0.50 > maxValue 0.10")], caption: "Set a per-request cap; anything above it is refused." }) },
      ],
    },
  };

  const order = ["accept", "verify", "info", "subscribe", "b20", "x402"];
  const pinned = flow ? (FLOWS[flow] ? flow : order[0]) : null;

  const [active, setActive] = useState(pinned || "accept");
  const [sim, setSim] = useState(freshSim);
  const [results, setResults] = useState([]);

  const f = FLOWS[active] || FLOWS.accept;
  const stepIndex = results.length;
  const done = stepIndex >= f.steps.length;
  const pct = Math.round((stepIndex / f.steps.length) * 100);

  const select = (k) => { setActive(k); setSim(freshSim()); setResults([]); };
  const reset = () => { setSim(freshSim()); setResults([]); };
  const runStep = () => {
    if (done) return;
    const s = { balances: { ...sim.balances }, blocked: sim.blocked };
    const out = f.steps[stepIndex].run(s) || { entries: [] };
    setSim(s);
    setResults((r) => [...r, out]);
  };

  const holders = Object.keys(sim.balances);

  return (
    <div className="pd-card" style={{ margin: "22px 0", borderRadius: 14, border: `1px solid ${c.border}`, background: c.bg, overflow: "hidden", boxShadow: "var(--pd-shadow)" }}>
      <style>{`
        .pd-card{
          --pd-bg:#ffffff; --pd-panel:#f5f6f8; --pd-console:#f7f8fa; --pd-border:#e2e5ea;
          --pd-text:#0a0b0d; --pd-body:#32353d; --pd-muted:#5b616e; --pd-dim:#8a909c;
          --pd-accent:#0000ff; --pd-accent-contrast:#ffffff; --pd-accent-soft:rgba(0,0,255,.08);
          --pd-success:#1a9d37; --pd-success-soft:rgba(26,157,55,.12); --pd-error:#e5402a;
          --pd-shadow:0 1px 2px rgba(10,11,13,.05), 0 14px 34px -20px rgba(10,11,13,.28);
        }
        html.dark .pd-card, [data-theme="dark"] .pd-card{
          --pd-bg:#0d0e11; --pd-panel:rgba(255,255,255,.045); --pd-console:rgba(255,255,255,.03); --pd-border:#2b2e36;
          --pd-text:#ffffff; --pd-body:#dee1e7; --pd-muted:#b1b7c3; --pd-dim:#7b828f;
          --pd-accent:#578BFA; --pd-accent-contrast:#0a0b0d; --pd-accent-soft:rgba(87,139,250,.16);
          --pd-success:#66c800; --pd-success-soft:rgba(102,200,0,.16); --pd-error:#fc655a;
          --pd-shadow:0 1px 2px rgba(0,0,0,.4), 0 18px 40px -22px rgba(0,0,0,.7);
        }
        @keyframes pd-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
        .pd-res{animation:pd-in .28s ease both}
        .pd-line{animation:pd-in .28s ease both}
        .pd-prog{transition:width .35s cubic-bezier(.4,0,.2,1)}
        .pd-pill{font-family:${sans};font-size:12px;font-weight:500;border-radius:999px;padding:5px 11px 5px 9px;cursor:pointer;transition:all .15s ease;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;color:var(--pd-muted);background:transparent;border:1px solid var(--pd-border)}
        .pd-pill:hover{color:var(--pd-text);border-color:var(--pd-dim)}
        .pd-pill-on{color:var(--pd-accent-contrast);background:var(--pd-accent);border-color:var(--pd-accent)}
        .pd-btn{font-family:${sans};font-size:12.5px;font-weight:600;border-radius:8px;padding:7px 13px;cursor:pointer;transition:all .15s ease;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;color:var(--pd-accent-contrast);background:var(--pd-accent);border:1px solid var(--pd-accent);box-shadow:0 1px 2px rgba(0,0,0,.12)}
        .pd-btn:hover{filter:brightness(1.12);transform:translateY(-1px)}
        .pd-btn:disabled{color:var(--pd-dim);background:transparent;border:1px dashed var(--pd-border);cursor:default;filter:none;transform:none;box-shadow:none;font-weight:500}
        .pd-reset{font-family:${sans};font-size:11px;color:var(--pd-dim);background:transparent;border:none;cursor:pointer;padding:2px 6px;border-radius:6px}
        .pd-reset:hover{color:var(--pd-body);background:var(--pd-panel)}
        @media (prefers-reduced-motion:reduce){.pd-card *{animation:none!important;transition:none!important}}
      `}</style>

      {/* Progress bar */}
      <div style={{ height: 3, background: c.border }}>
        <div className="pd-prog" style={{ height: "100%", width: `${pct}%`, background: done ? c.success : c.accent }} />
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 16px", background: c.panel, borderBottom: `1px solid ${c.border}` }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", color: c.accent, background: c.accentSoft }}>
          <Icon k={active} size={16} />
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
          <span style={{ fontFamily: sans, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.9px", color: c.dim, textTransform: "uppercase" }}>Interactive demo · simulated</span>
          <span style={{ fontFamily: sans, fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.01em", color: c.text }}>{f.title}</span>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: mono, fontSize: 10.5, color: c.dim, whiteSpace: "nowrap" }}>{Math.min(stepIndex, f.steps.length)}/{f.steps.length}</span>
        {results.length > 0 && <button className="pd-reset" onClick={reset}>reset</button>}
      </div>

      {/* Flow selector (only when not pinned to one flow) */}
      {!pinned && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "11px 16px", borderBottom: `1px solid ${c.border}` }}>
          {order.map((k) => (
            <button key={k} className={k === active ? "pd-pill pd-pill-on" : "pd-pill"} onClick={() => select(k)}>
              <Icon k={k} size={13} />{FLOWS[k].label}
            </button>
          ))}
        </div>
      )}

      {/* Steps timeline */}
      <div style={{ padding: "14px 16px 6px" }}>
        {f.steps.map((step, i) => {
          const state = i < stepIndex ? "done" : i === stepIndex ? "now" : "future";
          const res = results[i];
          const last = i === f.steps.length - 1;
          return (
            <div key={i} style={{ display: "flex", gap: 12 }}>
              {/* marker + connector column */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 22, flexShrink: 0 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontFamily: sans, fontSize: 11, fontWeight: 600,
                  color: state === "done" ? c.accentContrast : state === "now" ? c.accentContrast : c.dim,
                  border: `1.5px solid ${state === "future" ? c.border : c.accent}`,
                  background: state === "done" ? c.success : state === "now" ? c.accent : "transparent",
                  borderColor: state === "done" ? c.success : state === "future" ? c.border : c.accent,
                  transition: "all .2s ease",
                }}>
                  {state === "done" ? (
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke={c.accentContrast} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  ) : i + 1}
                </span>
                {!last && <div style={{ flex: 1, width: 2, minHeight: 16, marginTop: 4, background: i < stepIndex ? c.accent : c.border, transition: "background .3s ease" }} />}
              </div>

              {/* content column */}
              <div style={{ flex: 1, paddingBottom: last ? 8 : 16, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 22 }}>
                  <span style={{ flex: 1, fontFamily: sans, fontSize: 13, lineHeight: 1.45, color: state === "future" ? c.dim : state === "now" ? c.text : c.body, fontWeight: state === "now" ? 600 : 400 }}>{step.text}</span>
                  {state !== "done" && (
                    <button className="pd-btn" onClick={state === "now" ? runStep : undefined} disabled={state !== "now"}>
                      {step.action}
                      {state === "now" && <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>}
                    </button>
                  )}
                </div>
                {res && (
                  <div className="pd-res" style={{ marginTop: 9, background: c.console, border: `1px solid ${c.border}`, borderRadius: 8, padding: "8px 10px", display: "grid", gap: 4 }}>
                    {res.entries.map((e, j) => (
                      <div key={j} className="pd-line" style={{ display: "flex", alignItems: "flex-start", gap: 7, animationDelay: `${j * 60}ms` }}>
                        <span style={{ flexShrink: 0, width: 12, marginTop: 2 }}>
                          {e.kind === "ok" && <svg viewBox="0 0 24 24" width="11" height="11" fill="none" style={{ stroke: c.success }} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                          {e.kind === "err" && <svg viewBox="0 0 24 24" width="11" height="11" fill="none" style={{ stroke: c.error }} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>}
                          {e.kind === "info" && <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: c.dim, marginLeft: 3, marginTop: 3 }} />}
                        </span>
                        <span style={{ fontFamily: mono, fontSize: 11, lineHeight: 1.5 }}>
                          <span style={{ color: e.kind === "err" ? c.error : e.kind === "info" ? c.muted : c.body, fontWeight: e.kind === "info" ? 400 : 600 }}>{e.name}</span>
                          {e.detail && <span style={{ color: c.dim }}> · {e.detail}</span>}
                        </span>
                      </div>
                    ))}
                    {res.caption && (
                      <div style={{ fontFamily: sans, fontSize: 11.5, color: c.muted, lineHeight: 1.45, marginTop: 3, borderLeft: `2px solid ${c.accent}`, paddingLeft: 8 }}>{res.caption}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Live balances readout */}
        {f.readout && holders.length > 0 && (
          <div style={{ marginTop: 4, marginBottom: 10, padding: "9px 12px", background: c.panel, border: `1px solid ${c.border}`, borderRadius: 10 }}>
            <div style={{ fontFamily: sans, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.9px", color: c.dim, textTransform: "uppercase", marginBottom: 6 }}>USDC balances</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {holders.map((a) => (
                <span key={a} style={{ fontFamily: sans, fontSize: 11.5, color: c.body, display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 9px", borderRadius: 999, background: c.bg, border: `1px solid ${c.border}` }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot[a] || c.dim, display: "inline-block" }} />
                  {a}<span style={{ fontFamily: mono, color: c.text, fontWeight: 600 }}>{fmt(sim.balances[a] || 0)}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 16px", background: c.panel, borderTop: `1px solid ${c.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: sans, fontSize: 11, color: c.dim, lineHeight: 1.4 }}>{f.erc20}</span>
        <div style={{ flex: 1 }} />
        {done && (
          <span style={{ fontFamily: sans, fontSize: 10.5, fontWeight: 600, color: c.success, background: c.successSoft, borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 5 }}>
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke={c.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            Flow complete
          </span>
        )}
      </div>
    </div>
  );
};
