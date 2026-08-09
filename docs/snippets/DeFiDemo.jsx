export const DeFiDemo = ({ flow }) => {
  // No imports allowed in Mintlify snippets: useState is injected globally.
  const sans = "'Base Sans','Inter Tight',Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  const mono = "'Base Mono','Roboto Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace";

  const c = {
    bg: "var(--dd-bg)", panel: "var(--dd-panel)", border: "var(--dd-border)", console: "var(--dd-console)",
    text: "var(--dd-text)", body: "var(--dd-body)", muted: "var(--dd-muted)", dim: "var(--dd-dim)",
    accent: "var(--dd-accent)", accentContrast: "var(--dd-accent-contrast)", accentSoft: "var(--dd-accent-soft)",
    success: "var(--dd-success)", successSoft: "var(--dd-success-soft)", error: "var(--dd-error)",
  };
  // ---- result-line helpers ----
  const ok = (name, detail) => ({ kind: "ok", name, detail: detail || "" });
  const err = (name, detail) => ({ kind: "err", name, detail: detail || "" });
  const nfo = (name, detail) => ({ kind: "info", name, detail: detail || "" });

  // ---- per-flow line icons (stroke uses currentColor) ----
  const glyph = {
    lend: <path d="M12 19V5M5 12l7-7 7 7" />,
    borrow: <><path d="M4 8h16M4 16h16" /><path d="M8 4v16M16 4v16" /></>,
    earn: <><path d="M4 18h16M6 15V9m4 6V5m4 10v-3m4 3V7" /><path d="M17 4v4m-2-2h4" /></>,
  };
  const Icon = ({ k, size }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{glyph[k]}</svg>
  );

  const freshSim = () => ({ metrics: [] });

  // ======================================================================
  // Scripted flows. Each step mutates a cloned sim and returns log lines.
  // ======================================================================
  const FLOWS = {
    lend: {
      label: "Lend", title: "Supply assets to a lending market",
      footer: "Illustrative only · rates and liquidity vary by market.",
      steps: [
        { text: "A user has 1,000 USDC available in their wallet.", action: "Load wallet",
          run: (s) => { s.metrics = [{ label: "Wallet", value: "1,000 USDC" }, { label: "Supplied", value: "0 USDC" }]; return { entries: [nfo("wallet balance", "1,000 USDC")] }; } },
        { text: "Approve the market and supply the USDC from the user's wallet.", action: "Supply USDC",
          run: (s) => { s.metrics = [{ label: "Wallet", value: "0 USDC" }, { label: "Supplied", value: "1,000 USDC" }, { label: "Supply APY", value: "4.2% variable" }]; return { entries: [ok("approve", "1,000 USDC"), ok("supply", "1,000 USDC")], caption: "The wallet now owns a direct protocol position." }; } },
        { text: "The supplied position accrues illustrative variable interest.", action: "Accrue 30 days",
          run: (s) => { s.metrics = [{ label: "Wallet", value: "0 USDC" }, { label: "Supplied", value: "1,003.45 USDC" }, { label: "Supply APY", value: "4.2% variable" }]; return { entries: [ok("position updated", "+3.45 USDC")], caption: "Actual rates change with market utilization." }; } },
        { text: "Withdraw the available position back to the user's wallet.", action: "Withdraw",
          run: (s) => { s.metrics = [{ label: "Wallet", value: "1,003.45 USDC" }, { label: "Supplied", value: "0 USDC" }]; return { entries: [ok("withdraw", "1,003.45 USDC")], caption: "Withdrawals depend on available market liquidity." }; } },
      ],
    },
    borrow: {
      label: "Borrow", title: "Borrow against supplied collateral",
      footer: "Illustrative only · liquidation parameters differ by protocol and market.",
      steps: [
        { text: "A user supplies 2 WETH as collateral at an illustrative $2,500 price.", action: "Supply collateral",
          run: (s) => { s.metrics = [{ label: "Collateral", value: "2 WETH · $5,000" }, { label: "Debt", value: "0 USDC" }, { label: "Health factor", value: "—" }]; return { entries: [ok("supply collateral", "2 WETH"), ok("collateral enabled", "WETH")], caption: "The collateral remains exposed to market price changes." }; } },
        { text: "Borrow 2,000 USDC against the collateral.", action: "Borrow USDC",
          run: (s) => { s.metrics = [{ label: "Collateral", value: "2 WETH · $5,000" }, { label: "Debt", value: "2,000 USDC" }, { label: "Health factor", value: "2.00", tone: "ok" }]; return { entries: [ok("borrow", "2,000 USDC"), nfo("health factor", "2.00")], caption: "A higher health factor provides more room before liquidation." }; } },
        { text: "WETH falls to an illustrative $1,500 while the debt remains unchanged.", action: "Simulate price drop",
          run: (s) => { s.metrics = [{ label: "Collateral", value: "2 WETH · $3,000" }, { label: "Debt", value: "2,000 USDC" }, { label: "Health factor", value: "1.20", tone: "warn" }]; return { entries: [err("risk increased", "health factor 2.00 → 1.20")], caption: "At or below the protocol's liquidation threshold, collateral can be sold to repay debt." }; } },
      ],
    },
    earn: {
      label: "Earn", title: "Embed a vault-based earn product",
      footer: "Illustrative only · vault yield is variable and not guaranteed.",
      steps: [
        { text: "A user has 1,000 USDC and chooses a curated vault in your app.", action: "Select vault",
          run: (s) => { s.metrics = [{ label: "Wallet", value: "1,000 USDC" }, { label: "Vault shares", value: "0" }, { label: "Redeemable", value: "0 USDC" }]; return { entries: [nfo("vault selected", "USDC · variable yield")], caption: "The vault abstracts the underlying market allocation." }; } },
        { text: "Deposit once and receive shares that represent the vault position.", action: "Deposit USDC",
          run: (s) => { s.metrics = [{ label: "Wallet", value: "0 USDC" }, { label: "Vault shares", value: "1,000" }, { label: "Share price", value: "$1.00" }, { label: "Redeemable", value: "1,000 USDC" }]; return { entries: [ok("approve", "1,000 USDC"), ok("deposit", "1,000 USDC → 1,000 shares")], caption: "The user holds vault shares instead of managing each market position." }; } },
        { text: "As the vault earns, each share becomes redeemable for more USDC.", action: "Accrue value",
          run: (s) => { s.metrics = [{ label: "Wallet", value: "0 USDC" }, { label: "Vault shares", value: "1,000" }, { label: "Share price", value: "$1.01" }, { label: "Redeemable", value: "1,010 USDC", tone: "ok" }]; return { entries: [ok("share value updated", "$1.00 → $1.01"), nfo("redeemable assets", "1,010 USDC")], caption: "Actual vault performance can rise or fall and depends on its strategy." }; } },
      ],
    },
  };

  const order = ["lend", "borrow", "earn"];
  const pinned = flow ? (FLOWS[flow] ? flow : order[0]) : null;

  const [active, setActive] = useState(pinned || "lend");
  const [sim, setSim] = useState(freshSim);
  const [results, setResults] = useState([]);

  const f = FLOWS[active] || FLOWS.lend;
  const stepIndex = results.length;
  const done = stepIndex >= f.steps.length;
  const pct = Math.round((stepIndex / f.steps.length) * 100);

  const select = (k) => { setActive(k); setSim(freshSim()); setResults([]); };
  const reset = () => { setSim(freshSim()); setResults([]); };
  const runStep = () => {
    if (done) return;
    const s = { metrics: sim.metrics.map((metric) => ({ ...metric })) };
    const out = f.steps[stepIndex].run(s) || { entries: [] };
    setSim(s);
    setResults((r) => [...r, out]);
  };
  return (
    <div className="dd-card" style={{ margin: "22px 0", borderRadius: 14, border: `1px solid ${c.border}`, background: c.bg, overflow: "hidden", boxShadow: "var(--dd-shadow)" }}>
      <style>{`
        .dd-card{
          --dd-bg:#ffffff; --dd-panel:#f5f6f8; --dd-console:#f7f8fa; --dd-border:#e2e5ea;
          --dd-text:#0a0b0d; --dd-body:#32353d; --dd-muted:#5b616e; --dd-dim:#8a909c;
          --dd-accent:#0000ff; --dd-accent-contrast:#ffffff; --dd-accent-soft:rgba(0,0,255,.08);
          --dd-success:#1a9d37; --dd-success-soft:rgba(26,157,55,.12); --dd-error:#e5402a;
          --dd-shadow:0 1px 2px rgba(10,11,13,.05), 0 14px 34px -20px rgba(10,11,13,.28);
        }
        html.dark .dd-card, [data-theme="dark"] .dd-card{
          --dd-bg:#0d0e11; --dd-panel:rgba(255,255,255,.045); --dd-console:rgba(255,255,255,.03); --dd-border:#2b2e36;
          --dd-text:#ffffff; --dd-body:#dee1e7; --dd-muted:#b1b7c3; --dd-dim:#7b828f;
          --dd-accent:#578BFA; --dd-accent-contrast:#0a0b0d; --dd-accent-soft:rgba(87,139,250,.16);
          --dd-success:#66c800; --dd-success-soft:rgba(102,200,0,.16); --dd-error:#fc655a;
          --dd-shadow:0 1px 2px rgba(0,0,0,.4), 0 18px 40px -22px rgba(0,0,0,.7);
        }
        @keyframes dd-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
        .dd-res{animation:dd-in .28s ease both}
        .dd-line{animation:dd-in .28s ease both}
        .dd-prog{transition:width .35s cubic-bezier(.4,0,.2,1)}
        .dd-pill{font-family:${sans};font-size:12px;font-weight:500;border-radius:999px;padding:5px 11px 5px 9px;cursor:pointer;transition:all .15s ease;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;color:var(--dd-muted);background:transparent;border:1px solid var(--dd-border)}
        .dd-pill:hover{color:var(--dd-text);border-color:var(--dd-dim)}
        .dd-pill-on{color:var(--dd-accent-contrast);background:var(--dd-accent);border-color:var(--dd-accent)}
        .dd-btn{font-family:${sans};font-size:12.5px;font-weight:600;border-radius:8px;padding:7px 13px;cursor:pointer;transition:all .15s ease;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;color:var(--dd-accent-contrast);background:var(--dd-accent);border:1px solid var(--dd-accent);box-shadow:0 1px 2px rgba(0,0,0,.12)}
        .dd-btn:hover{filter:brightness(1.12);transform:translateY(-1px)}
        .dd-btn:disabled{color:var(--dd-dim);background:transparent;border:1px dashed var(--dd-border);cursor:default;filter:none;transform:none;box-shadow:none;font-weight:500}
        .dd-reset{font-family:${sans};font-size:11px;color:var(--dd-dim);background:transparent;border:none;cursor:pointer;padding:2px 6px;border-radius:6px}
        .dd-reset:hover{color:var(--dd-body);background:var(--dd-panel)}
        @media (prefers-reduced-motion:reduce){.dd-card *{animation:none!important;transition:none!important}}
      `}</style>

      {/* Progress bar */}
      <div style={{ height: 3, background: c.border }}>
        <div className="dd-prog" style={{ height: "100%", width: `${pct}%`, background: done ? c.success : c.accent }} />
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 16px", background: c.panel, borderBottom: `1px solid ${c.border}` }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", color: c.accent, background: c.accentSoft }}>
          <Icon k={active} size={16} />
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
          <span style={{ fontFamily: sans, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.9px", color: c.dim, textTransform: "uppercase" }}>Interactive demo · illustrative simulation</span>
          <span style={{ fontFamily: sans, fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.01em", color: c.text }}>{f.title}</span>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: mono, fontSize: 10.5, color: c.dim, whiteSpace: "nowrap" }}>{Math.min(stepIndex, f.steps.length)}/{f.steps.length}</span>
        {results.length > 0 && <button className="dd-reset" onClick={reset}>reset</button>}
      </div>

      {/* Flow selector (only when not pinned to one flow) */}
      {!pinned && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "11px 16px", borderBottom: `1px solid ${c.border}` }}>
          {order.map((k) => (
            <button key={k} className={k === active ? "dd-pill dd-pill-on" : "dd-pill"} onClick={() => select(k)}>
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
                    <button className="dd-btn" onClick={state === "now" ? runStep : undefined} disabled={state !== "now"}>
                      {step.action}
                      {state === "now" && <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>}
                    </button>
                  )}
                </div>
                {res && (
                  <div className="dd-res" style={{ marginTop: 9, background: c.console, border: `1px solid ${c.border}`, borderRadius: 8, padding: "8px 10px", display: "grid", gap: 4 }}>
                    {res.entries.map((e, j) => (
                      <div key={j} className="dd-line" style={{ display: "flex", alignItems: "flex-start", gap: 7, animationDelay: `${j * 60}ms` }}>
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

        {/* Position readout */}
        {sim.metrics.length > 0 && (
          <div style={{ marginTop: 4, marginBottom: 10, padding: "9px 12px", background: c.panel, border: `1px solid ${c.border}`, borderRadius: 10 }}>
            <div style={{ fontFamily: sans, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.9px", color: c.dim, textTransform: "uppercase", marginBottom: 6 }}>Illustrative position</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {sim.metrics.map((metric) => (
                <span key={metric.label} style={{ fontFamily: sans, fontSize: 11.5, color: c.body, display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 9px", borderRadius: 999, background: c.bg, border: `1px solid ${metric.tone === "warn" ? c.error : c.border}` }}>
                  {metric.label}<span style={{ fontFamily: mono, color: metric.tone === "warn" ? c.error : metric.tone === "ok" ? c.success : c.text, fontWeight: 600 }}>{metric.value}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 16px", background: c.panel, borderTop: `1px solid ${c.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: sans, fontSize: 11, color: c.dim, lineHeight: 1.4 }}>{f.footer}</span>
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
