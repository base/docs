export const AssetDemo = ({ flow }) => {
  // No imports allowed in Mintlify snippets: useState is injected globally.
  const sans = "'Base Sans','Inter Tight',Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  const mono = "'Base Mono','Roboto Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace";

  const c = {
    bg: "var(--sd-bg)", panel: "var(--sd-panel)", border: "var(--sd-border)", console: "var(--sd-console)",
    text: "var(--sd-text)", body: "var(--sd-body)", muted: "var(--sd-muted)", dim: "var(--sd-dim)",
    accent: "var(--sd-accent)", accentContrast: "var(--sd-accent-contrast)", accentSoft: "var(--sd-accent-soft)",
    success: "var(--sd-success)", successSoft: "var(--sd-success-soft)", error: "var(--sd-error)",
  };
  const dot = { Issuer: "var(--sd-accent)", Alice: "#66c800", Bob: "#ffd12f", Carol: "#fc655a" };

  // ---- result-line helpers ----
  const ok = (name, detail) => ({ kind: "ok", name, detail: detail || "" });
  const err = (name, detail) => ({ kind: "err", name, detail: detail || "" });
  const nfo = (name, detail) => ({ kind: "info", name, detail: detail || "" });
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // ---- per-flow line icons (stroke uses currentColor) ----
  const glyph = {
    create: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>,
    issue: <path d="M4 18h16M6 15V9m4 6V5m4 10v-3m4 3V7" />,
    restrict: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
    cancel: <><circle cx="12" cy="12" r="9" /><path d="M7 12h10" /></>,
    dividend: <><path d="M4 18h16M6 15V9m4 6V5m4 10v-3m4 3V7" /><path d="M17 4v4m-2-2h4" /></>,
    split: <><path d="M8 4v16M16 4v16" /><path d="M4 8h16M4 16h16" /></>,
    pause: <><rect x="7" y="6" width="3.4" height="12" rx="1.2" /><rect x="13.6" y="6" width="3.4" height="12" rx="1.2" /></>,
  };
  const Icon = ({ k, size }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{glyph[k]}</svg>
  );

  const freshSim = () => ({ balances: {}, blocked: null, multiplier: 1, paused: false });

  // ======================================================================
  // Scripted flows. Each step mutates a cloned sim and returns log lines.
  // ======================================================================
  const FLOWS = {
    create: {
      label: "Create", title: "Create a stock token", readout: false,
      erc20: "B20 supplies a shared Asset standard instead of a custom token contract.",
      steps: [
        { text: "Define Example Corp Class A with six-decimal share precision.", action: "Create EXM",
          run: () => ({ entries: [ok("createB20", "ASSET · EXM · 0xB200…e7a1"), nfo("decimals()", "6")], caption: "The factory creates an ERC-20-compatible B20 Asset token." }) },
        { text: "Set issuer roles and a technical issuance ceiling in the same transaction.", action: "Apply controls",
          run: () => ({ entries: [ok("grantRole", "MINT_ROLE, OPERATOR_ROLE → Issuer"), ok("SupplyCapUpdated", "1,000,000 EXM")], caption: "The ceiling limits token supply; it does not define legally authorized shares." }) },
        { text: "Attach an issuer-defined identifier for integrations and records.", action: "Add identifier",
          run: () => ({ entries: [ok("ExtraMetadataUpdated", 'security-id → "EXAMPLE-CLASS-A"')], caption: "B20 stores the issuer-defined value without validating an external registry." }) },
      ],
    },
    issue: {
      label: "Issue", title: "Issue shares to approved holders", readout: true,
      erc20: "The Asset variant batches a cap-table distribution into one transaction.",
      steps: [
        { text: "Alice and Bob are approved to hold Example Corp shares.", action: "Approve holders",
          run: () => ({ entries: [ok("updateAllowlist", "allow Alice, Bob")], caption: "The same holder policy can govern issuance and transfers." }) },
        { text: "Distribute 600 shares to Alice and 400 to Bob.", action: "Issue 1,000",
          run: (s) => { s.balances.Alice = 600; s.balances.Bob = 400; return { entries: [ok("batchMint", "2 recipients · 1,000 EXM"), ok("Transfer", "0x0 → Alice · 600"), ok("Transfer", "0x0 → Bob · 400")], caption: "One batch records the initial distribution." }; } },
      ],
    },
    restrict: {
      label: "Restrict", title: "Keep shares with eligible holders", readout: true,
      erc20: "The shared Policy Registry gates issuance and transfers without a custom hook.",
      steps: [
        { text: "Approve Alice and Bob, then bind the policy to mint and transfer scopes.", action: "Enable policy",
          run: () => ({ entries: [ok("PolicyCreated", "#2 · ALLOWLIST"), ok("PolicyUpdated", "MINT_RECEIVER, TRANSFER_SENDER, TRANSFER_RECEIVER → #2")], caption: "Accounts are denied until the policy admin approves them." }) },
        { text: "Issue shares to approved holder Alice.", action: "Issue 100",
          run: (s) => { s.balances.Alice = 100; return { entries: [ok("Transfer", "0x0 → Alice · 100 EXM")] }; } },
        { text: "Alice tries to transfer shares to unapproved holder Carol.", action: "Try transfer",
          run: () => ({ entries: [err("PolicyForbids", "TRANSFER_RECEIVER · Carol")], caption: "Carol cannot receive shares until the policy admin approves her." }) },
      ],
    },
    cancel: {
      label: "Cancel", title: "Cancel shares from a blocked holder", readout: true,
      erc20: "B20 exposes a dedicated burn path for a holder denied by the sender policy.",
      steps: [
        { text: "Bob holds 100 EXM and is currently eligible.", action: "Set position",
          run: (s) => { s.balances.Bob = 100; return { entries: [ok("Transfer", "0x0 → Bob · 100 EXM")] }; } },
        { text: "Remove Bob from the holder allowlist before cancellation.", action: "Block Bob",
          run: (s) => { s.blocked = "Bob"; return { entries: [ok("updateAllowlist", "remove Bob"), err("PolicyForbids", "TRANSFER_SENDER · Bob")], caption: "Bob is denied by the token's sender policy." }; } },
        { text: "Cancel the blocked shares; they do not move to the issuer.", action: "Cancel 100",
          run: (s) => { s.balances.Bob = 0; return { entries: [ok("burnBlocked", "Bob · 100 EXM"), ok("Transfer", "Bob → 0x0 · 100 EXM")], caption: "The shares are burned, reducing total supply." }; } },
      ],
    },
    dividend: {
      label: "Dividend", title: "Announce a stock dividend", readout: true,
      erc20: "B20 brackets the share distribution with an onchain description and URI.",
      steps: [
        { text: "Alice holds 600 shares and Bob holds 400.", action: "Load holders",
          run: (s) => { s.balances.Alice = 600; s.balances.Bob = 400; return { entries: [nfo("record date", "Alice 600 · Bob 400")], caption: "The example distributes a five-percent stock dividend." }; } },
        { text: "Publish the action details and distribute 30 shares to Alice and 20 to Bob.", action: "Announce & issue",
          run: (s) => { s.balances.Alice += 30; s.balances.Bob += 20; return { entries: [ok("Announcement", "id 2026-01 · stock dividend"), ok("batchMint", "Alice 30 · Bob 20"), ok("EndAnnouncement", "id 2026-01")], caption: "This issues additional shares; it does not pay a cash dividend." }; } },
      ],
    },
    split: {
      label: "Split", title: "Run a 2-for-1 stock split", readout: true,
      erc20: "The Asset multiplier changes displayed balances without migrating holders.",
      steps: [
        { text: "Alice holds 100 raw shares and Bob holds 50.", action: "Load balances",
          run: (s) => { s.balances.Alice = 100; s.balances.Bob = 50; return { entries: [nfo("multiplier()", "1.0 WAD")], caption: "Raw balances and displayed balances currently match." }; } },
        { text: "Apply the board-approved 2-for-1 split.", action: "Run split",
          run: (s) => { s.multiplier = 2; return { entries: [ok("MultiplierUpdated", "1.0 → 2.0 WAD"), nfo("scaledBalanceOf(Alice)", "200 EXM")], caption: "Displayed balances double while raw balances remain unchanged." }; } },
      ],
    },
    pause: {
      label: "Pause", title: "Pause transfers without stopping issuance", readout: true,
      erc20: "B20 separates transfer, mint, and burn pause controls.",
      steps: [
        { text: "Alice holds 100 EXM before an incident begins.", action: "Load balance",
          run: (s) => { s.balances.Alice = 100; return { entries: [ok("Transfer", "0x0 → Alice · 100 EXM")] }; } },
        { text: "Pause transfers while the issuer investigates.", action: "Pause transfers",
          run: (s) => { s.paused = true; return { entries: [ok("Paused", "TRANSFER")], caption: "Mint and burn remain available." }; } },
        { text: "Alice tries to transfer 10 shares to Bob.", action: "Try transfer",
          run: () => ({ entries: [err("EnforcedPause", "TRANSFER")], caption: "The transfer is rejected by the paused feature." }) },
        { text: "The issuer can still issue 25 shares to approved holder Bob.", action: "Issue 25",
          run: (s) => { s.balances.Bob = 25; return { entries: [ok("Transfer", "0x0 → Bob · 25 EXM")], caption: "Granular pause leaves unpaused operations available." }; } },
      ],
    },
  };

  const order = ["create", "issue", "restrict", "cancel", "dividend", "split", "pause"];
  const pinned = flow ? (FLOWS[flow] ? flow : order[0]) : null;

  const [active, setActive] = useState(pinned || "create");
  const [sim, setSim] = useState(freshSim);
  const [results, setResults] = useState([]);

  const f = FLOWS[active] || FLOWS.create;
  const stepIndex = results.length;
  const done = stepIndex >= f.steps.length;
  const pct = Math.round((stepIndex / f.steps.length) * 100);

  const select = (k) => { setActive(k); setSim(freshSim()); setResults([]); };
  const reset = () => { setSim(freshSim()); setResults([]); };
  const runStep = () => {
    if (done) return;
    const s = { balances: { ...sim.balances }, blocked: sim.blocked, multiplier: sim.multiplier, paused: sim.paused };
    const out = f.steps[stepIndex].run(s) || { entries: [] };
    setSim(s);
    setResults((r) => [...r, out]);
  };

  const holders = Object.keys(sim.balances);

  return (
    <div className="sd-card" style={{ margin: "22px 0", borderRadius: 14, border: `1px solid ${c.border}`, background: c.bg, overflow: "hidden", boxShadow: "var(--sd-shadow)" }}>
      <style>{`
        .sd-card{
          --sd-bg:#ffffff; --sd-panel:#f5f6f8; --sd-console:#f7f8fa; --sd-border:#e2e5ea;
          --sd-text:#0a0b0d; --sd-body:#32353d; --sd-muted:#5b616e; --sd-dim:#8a909c;
          --sd-accent:#0000ff; --sd-accent-contrast:#ffffff; --sd-accent-soft:rgba(0,0,255,.08);
          --sd-success:#1a9d37; --sd-success-soft:rgba(26,157,55,.12); --sd-error:#e5402a;
          --sd-shadow:0 1px 2px rgba(10,11,13,.05), 0 14px 34px -20px rgba(10,11,13,.28);
        }
        html.dark .sd-card, [data-theme="dark"] .sd-card{
          --sd-bg:#0d0e11; --sd-panel:rgba(255,255,255,.045); --sd-console:rgba(255,255,255,.03); --sd-border:#2b2e36;
          --sd-text:#ffffff; --sd-body:#dee1e7; --sd-muted:#b1b7c3; --sd-dim:#7b828f;
          --sd-accent:#578BFA; --sd-accent-contrast:#0a0b0d; --sd-accent-soft:rgba(87,139,250,.16);
          --sd-success:#66c800; --sd-success-soft:rgba(102,200,0,.16); --sd-error:#fc655a;
          --sd-shadow:0 1px 2px rgba(0,0,0,.4), 0 18px 40px -22px rgba(0,0,0,.7);
        }
        @keyframes sd-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
        .sd-res{animation:sd-in .28s ease both}
        .sd-line{animation:sd-in .28s ease both}
        .sd-prog{transition:width .35s cubic-bezier(.4,0,.2,1)}
        .sd-pill{font-family:${sans};font-size:12px;font-weight:500;border-radius:999px;padding:5px 11px 5px 9px;cursor:pointer;transition:all .15s ease;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;color:var(--sd-muted);background:transparent;border:1px solid var(--sd-border)}
        .sd-pill:hover{color:var(--sd-text);border-color:var(--sd-dim)}
        .sd-pill-on{color:var(--sd-accent-contrast);background:var(--sd-accent);border-color:var(--sd-accent)}
        .sd-btn{font-family:${sans};font-size:12.5px;font-weight:600;border-radius:8px;padding:7px 13px;cursor:pointer;transition:all .15s ease;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;color:var(--sd-accent-contrast);background:var(--sd-accent);border:1px solid var(--sd-accent);box-shadow:0 1px 2px rgba(0,0,0,.12)}
        .sd-btn:hover{filter:brightness(1.12);transform:translateY(-1px)}
        .sd-btn:disabled{color:var(--sd-dim);background:transparent;border:1px dashed var(--sd-border);cursor:default;filter:none;transform:none;box-shadow:none;font-weight:500}
        .sd-reset{font-family:${sans};font-size:11px;color:var(--sd-dim);background:transparent;border:none;cursor:pointer;padding:2px 6px;border-radius:6px}
        .sd-reset:hover{color:var(--sd-body);background:var(--sd-panel)}
        @media (prefers-reduced-motion:reduce){.sd-card *{animation:none!important;transition:none!important}}
      `}</style>

      {/* Progress bar */}
      <div style={{ height: 3, background: c.border }}>
        <div className="sd-prog" style={{ height: "100%", width: `${pct}%`, background: done ? c.success : c.accent }} />
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
        {results.length > 0 && <button className="sd-reset" onClick={reset}>reset</button>}
      </div>

      {/* Flow selector (only when not pinned to one flow) */}
      {!pinned && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "11px 16px", borderBottom: `1px solid ${c.border}` }}>
          {order.map((k) => (
            <button key={k} className={k === active ? "sd-pill sd-pill-on" : "sd-pill"} onClick={() => select(k)}>
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
                    <button className="sd-btn" onClick={state === "now" ? runStep : undefined} disabled={state !== "now"}>
                      {step.action}
                      {state === "now" && <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>}
                    </button>
                  )}
                </div>
                {res && (
                  <div className="sd-res" style={{ marginTop: 9, background: c.console, border: `1px solid ${c.border}`, borderRadius: 8, padding: "8px 10px", display: "grid", gap: 4 }}>
                    {res.entries.map((e, j) => (
                      <div key={j} className="sd-line" style={{ display: "flex", alignItems: "flex-start", gap: 7, animationDelay: `${j * 60}ms` }}>
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
            <div style={{ fontFamily: sans, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.9px", color: c.dim, textTransform: "uppercase", marginBottom: 6 }}>{sim.multiplier === 1 ? "Balances" : "Raw → displayed balances"}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {holders.map((a) => (
                <span key={a} style={{ fontFamily: sans, fontSize: 11.5, color: c.body, display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 9px", borderRadius: 999, background: c.bg, border: `1px solid ${c.border}` }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot[a] || c.dim, display: "inline-block" }} />
                  {a}<span style={{ fontFamily: mono, color: c.text, fontWeight: 600 }}>{fmt(sim.balances[a] || 0)}{sim.multiplier !== 1 && ` → ${fmt((sim.balances[a] || 0) * sim.multiplier)}`}</span>
                  {sim.blocked === a && (
                    <span style={{ fontFamily: sans, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.4px", textTransform: "uppercase", color: c.error, border: `1px solid ${c.error}`, borderRadius: 5, padding: "0px 5px" }}>blocked</span>
                  )}
                  {sim.paused && a === "Alice" && (
                    <span style={{ fontFamily: sans, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.4px", textTransform: "uppercase", color: c.error, border: `1px solid ${c.error}`, borderRadius: 5, padding: "0px 5px" }}>transfers paused</span>
                  )}
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
