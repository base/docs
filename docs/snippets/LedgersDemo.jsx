export const LedgersDemo = ({ flow }) => {
  // No imports allowed in Mintlify snippets: useState is injected globally.
  const sans = "'Base Sans','Inter Tight',Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  const mono = "'Base Mono','Roboto Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace";

  const c = {
    bg: "var(--ld-bg)", panel: "var(--ld-panel)", border: "var(--ld-border)", console: "var(--ld-console)",
    text: "var(--ld-text)", body: "var(--ld-body)", muted: "var(--ld-muted)", dim: "var(--ld-dim)",
    accent: "var(--ld-accent)", accentContrast: "var(--ld-accent-contrast)", accentSoft: "var(--ld-accent-soft)",
    success: "var(--ld-success)", successSoft: "var(--ld-success-soft)", error: "var(--ld-error)",
  };

  // ---- result-line helpers ----
  const ok = (name, detail) => ({ kind: "ok", name, detail: detail || "" });
  const err = (name, detail) => ({ kind: "err", name, detail: detail || "" });
  const nfo = (name, detail) => ({ kind: "info", name, detail: detail || "" });

  // ---- per-flow line icons (stroke uses currentColor) ----
  const glyph = {
    deposit: <><rect x="4" y="12" width="16" height="8" rx="2" /><path d="M12 3v7M9 7l3 3 3-3" /></>,
    transact: <><path d="M4 8h13l-3-3M20 16H7l3 3" /></>,
    withdraw: <><rect x="4" y="12" width="16" height="8" rx="2" /><path d="M12 10V3M9 6l3-3 3 3" /></>,
  };
  const Icon = ({ k, size }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{glyph[k]}</svg>
  );

  const freshSim = () => ({});

  // ======================================================================
  // Scripted flows. Each step returns log lines; `privacy` drives the readout.
  // ======================================================================
  const FLOWS = {
    deposit: {
      label: "Deposit", title: "Deposit into a ledger",
      contrast: "Without a private ledger, the receiving account is visible to everyone onchain.",
      privacy: [
        { label: "Asset", state: "public" }, { label: "Amount", state: "public" },
        { label: "Sender", state: "public" }, { label: "Recipient", state: "hidden" },
      ],
      steps: [
        { text: "Encrypt the recipient so deposits to one account can't be linked.", action: "Encrypt recipient",
          run: () => ({ entries: [ok("encryptRecipient", "recipient → 0x9f…enc")], caption: "Only the operator can decrypt it." }) },
        { text: "Send funds through the Portal contract on Base.", action: "deposit()",
          run: () => ({ entries: [ok("Portal.deposit", "100 USDC · enc-recipient"), ok("Deposit", "asset, amount public · recipient hidden")] }) },
        { text: "The ledger decrypts the recipient and credits the account privately.", action: "Credit ledger",
          run: () => ({ entries: [ok("ingress.credit", "recipient +100")], caption: "Observers see a deposit landed — never who received it." }) },
      ],
    },
    transact: {
      label: "Transact", title: "Move funds inside the ledger, privately",
      contrast: "On the public chain, every transfer exposes sender, recipient, and amount.",
      privacy: [
        { label: "Sender", state: "hidden" }, { label: "Recipient", state: "hidden" },
        { label: "Amount", state: "hidden" }, { label: "Activity", state: "hidden" },
      ],
      steps: [
        { text: "Transfer between accounts inside the ledger.", action: "Transfer 40",
          run: () => ({ entries: [ok("ledger.transfer", "A → B · 40")], caption: "Balances and transfers stay off public block explorers." }) },
        { text: "Nothing about the transfer lands on the public chain.", action: "Check Base",
          run: () => ({ entries: [nfo("basescan", "no transfer visible")], caption: "Only deposits and withdrawals touch Base." }) },
      ],
    },
    withdraw: {
      label: "Withdraw", title: "Withdraw back to Base",
      contrast: "The ledger reveals the asset and amount, but never the account behind them.",
      privacy: [
        { label: "Asset", state: "public" }, { label: "Amount", state: "public" },
        { label: "Sender", state: "hidden" }, { label: "Recipient", state: "public" },
      ],
      steps: [
        { text: "Request an operator-signed withdrawal authorization.", action: "Authorize",
          run: () => ({ entries: [ok("operator.sign", "auth 0x4c…7b")], caption: "You choose how the Portal validates it — a signature or a full proof." }) },
        { text: "Debit the account inside the ledger.", action: "Debit account",
          run: () => ({ entries: [ok("ledger.debit", "account −100")] }) },
        { text: "Submit the authorization; the Portal releases funds on Base.", action: "withdraw()",
          run: () => ({ entries: [ok("Portal.withdraw", "100 USDC → recipient"), ok("Withdraw", "sender hidden · recipient public")], caption: "Deposits and withdrawals stay unlinkable." }) },
      ],
    },
  };

  const order = ["deposit", "transact", "withdraw"];
  const pinned = flow && FLOWS[flow] ? flow : null;

  const [active, setActive] = useState(pinned || "deposit");
  const [results, setResults] = useState([]);

  const f = FLOWS[active] || FLOWS.deposit;
  const stepIndex = results.length;
  const done = stepIndex >= f.steps.length;
  const pct = Math.round((stepIndex / f.steps.length) * 100);

  const select = (k) => { setActive(k); setResults([]); };
  const reset = () => setResults([]);
  const runStep = () => {
    if (done) return;
    const out = f.steps[stepIndex].run() || { entries: [] };
    setResults((r) => [...r, out]);
  };

  return (
    <div className="ld-card" style={{ margin: "22px 0", borderRadius: 14, border: `1px solid ${c.border}`, background: c.bg, overflow: "hidden", boxShadow: "var(--ld-shadow)" }}>
      <style>{`
        .ld-card{
          --ld-bg:#ffffff; --ld-panel:#f5f6f8; --ld-console:#f7f8fa; --ld-border:#e2e5ea;
          --ld-text:#0a0b0d; --ld-body:#32353d; --ld-muted:#5b616e; --ld-dim:#8a909c;
          --ld-accent:#0000ff; --ld-accent-contrast:#ffffff; --ld-accent-soft:rgba(0,0,255,.08);
          --ld-success:#1a9d37; --ld-success-soft:rgba(26,157,55,.12); --ld-error:#e5402a;
          --ld-shadow:0 1px 2px rgba(10,11,13,.05), 0 14px 34px -20px rgba(10,11,13,.28);
        }
        html.dark .ld-card, [data-theme="dark"] .ld-card{
          --ld-bg:#0d0e11; --ld-panel:rgba(255,255,255,.045); --ld-console:rgba(255,255,255,.03); --ld-border:#2b2e36;
          --ld-text:#ffffff; --ld-body:#dee1e7; --ld-muted:#b1b7c3; --ld-dim:#7b828f;
          --ld-accent:#578BFA; --ld-accent-contrast:#0a0b0d; --ld-accent-soft:rgba(87,139,250,.16);
          --ld-success:#66c800; --ld-success-soft:rgba(102,200,0,.16); --ld-error:#fc655a;
          --ld-shadow:0 1px 2px rgba(0,0,0,.4), 0 18px 40px -22px rgba(0,0,0,.7);
        }
        @keyframes ld-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
        .ld-res{animation:ld-in .28s ease both}
        .ld-line{animation:ld-in .28s ease both}
        .ld-prog{transition:width .35s cubic-bezier(.4,0,.2,1)}
        .ld-pill{font-family:${sans};font-size:12px;font-weight:500;border-radius:999px;padding:5px 11px 5px 9px;cursor:pointer;transition:all .15s ease;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;color:var(--ld-muted);background:transparent;border:1px solid var(--ld-border)}
        .ld-pill:hover{color:var(--ld-text);border-color:var(--ld-dim)}
        .ld-pill-on{color:var(--ld-accent-contrast);background:var(--ld-accent);border-color:var(--ld-accent)}
        .ld-btn{font-family:${sans};font-size:12.5px;font-weight:600;border-radius:8px;padding:7px 13px;cursor:pointer;transition:all .15s ease;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;color:var(--ld-accent-contrast);background:var(--ld-accent);border:1px solid var(--ld-accent);box-shadow:0 1px 2px rgba(0,0,0,.12)}
        .ld-btn:hover{filter:brightness(1.12);transform:translateY(-1px)}
        .ld-btn:disabled{color:var(--ld-dim);background:transparent;border:1px dashed var(--ld-border);cursor:default;filter:none;transform:none;box-shadow:none;font-weight:500}
        .ld-reset{font-family:${sans};font-size:11px;color:var(--ld-dim);background:transparent;border:none;cursor:pointer;padding:2px 6px;border-radius:6px}
        .ld-reset:hover{color:var(--ld-body);background:var(--ld-panel)}
      `}</style>

      {/* Progress bar */}
      <div style={{ height: 3, background: c.border }}>
        <div className="ld-prog" style={{ height: "100%", width: `${pct}%`, background: done ? c.success : c.accent }} />
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
        {results.length > 0 && <button className="ld-reset" onClick={reset}>reset</button>}
      </div>

      {/* Flow selector (only when not pinned to one flow) */}
      {!pinned && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "11px 16px", borderBottom: `1px solid ${c.border}` }}>
          {order.map((k) => (
            <button key={k} className={k === active ? "ld-pill ld-pill-on" : "ld-pill"} onClick={() => select(k)}>
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
                  color: state === "future" ? c.dim : c.accentContrast,
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
                    <button className="ld-btn" onClick={state === "now" ? runStep : undefined} disabled={state !== "now"}>
                      {step.action}
                      {state === "now" && <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>}
                    </button>
                  )}
                </div>
                {res && (
                  <div className="ld-res" style={{ marginTop: 9, background: c.console, border: `1px solid ${c.border}`, borderRadius: 8, padding: "8px 10px", display: "grid", gap: 4 }}>
                    {res.entries.map((e, j) => (
                      <div key={j} className="ld-line" style={{ display: "flex", alignItems: "flex-start", gap: 7, animationDelay: `${j * 60}ms` }}>
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

        {/* Privacy readout — what's exposed onchain for this flow */}
        {results.length > 0 && f.privacy && (
          <div style={{ marginTop: 4, marginBottom: 10, padding: "9px 12px", background: c.panel, border: `1px solid ${c.border}`, borderRadius: 10 }}>
            <div style={{ fontFamily: sans, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.9px", color: c.dim, textTransform: "uppercase", marginBottom: 6 }}>What's exposed onchain</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {f.privacy.map((p) => {
                const hidden = p.state === "hidden";
                return (
                  <span key={p.label} style={{ fontFamily: sans, fontSize: 11.5, color: c.body, display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 9px", borderRadius: 999, background: c.bg, border: `1px solid ${c.border}` }}>
                    {hidden ? (
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" style={{ stroke: c.accent }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" style={{ stroke: c.dim }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                    {p.label}
                    <span style={{ fontFamily: sans, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.4px", textTransform: "uppercase", color: hidden ? c.accent : c.dim, border: `1px solid ${hidden ? c.accent : c.border}`, borderRadius: 5, padding: "0px 5px" }}>{hidden ? "hidden" : "public"}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 16px", background: c.panel, borderTop: `1px solid ${c.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: sans, fontSize: 11, color: c.dim, lineHeight: 1.4 }}>{f.contrast}</span>
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
