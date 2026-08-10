export const AssetDemo = ({ flow }) => {
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
  const dot = { Issuer: C.blue, Alice: "#66c800", Bob: "#ffd12f", Carol: "#fc401f" };

  const TOKEN = "EXM";
  const NETWORK = "Base Mainnet";

  // ---- result-line helpers ----
  const ok = (name, detail) => ({ kind: "ok", name, detail: detail || "" });
  const err = (name, detail) => ({ kind: "err", name, detail: detail || "" });
  const nfo = (name, detail) => ({ kind: "info", name, detail: detail || "" });
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const M = (v) => ({ v, mono: true });

  const freshSim = () => ({ balances: {}, blocked: null, multiplier: 1, paused: false });

  // ======================================================================
  // Scripted flows. Each step mutates a cloned sim and returns log lines.
  // ======================================================================
  const FLOWS = {
    create: {
      label: "Create", title: "Create a stock token", readout: false,
      erc20: "B20 supplies a shared Asset standard instead of a custom token contract.",
      steps: [
        { stage: "Create", action: "Create EXM",
          text: "Define Example Corp Class A with six-decimal share precision.",
          summary: [["Operation", "Create token"], ["Symbol", TOKEN], ["Standard", "B20 Asset"], ["Network", NETWORK]],
          run: () => ({ entries: [ok("createB20", "ASSET · EXM · 0xB200…e7a1"), nfo("decimals()", "6")], caption: "The factory creates an ERC-20-compatible B20 Asset token." }) },
        { stage: "Controls", action: "Apply controls",
          text: "Set issuer roles and a technical issuance ceiling in the same transaction.",
          summary: [["Operation", "Apply controls"], ["Roles", "MINT, OPERATOR"], ["Supply cap", M("1,000,000 EXM")], ["Network", NETWORK]],
          run: () => ({ entries: [ok("grantRole", "MINT_ROLE, OPERATOR_ROLE → Issuer"), ok("SupplyCapUpdated", "1,000,000 EXM")], caption: "The ceiling limits token supply; it does not define legally authorized shares." }) },
        { stage: "Identify", action: "Add identifier",
          text: "Attach an issuer-defined identifier for integrations and records.",
          summary: [["Operation", "Set metadata"], ["Field", M("security-id")], ["Value", M('"EXAMPLE-CLASS-A"')], ["Network", NETWORK]],
          run: () => ({ entries: [ok("ExtraMetadataUpdated", 'security-id → "EXAMPLE-CLASS-A"')], caption: "B20 stores the issuer-defined value without validating an external registry." }) },
      ],
    },
    issue: {
      label: "Issue", title: "Issue shares to approved holders", readout: true,
      erc20: "The Asset variant batches a cap-table distribution into one transaction.",
      steps: [
        { stage: "Approve", action: "Approve holders",
          text: "Alice and Bob are approved to hold Example Corp shares.",
          summary: [["Operation", "Update allowlist"], ["Approved", "Alice, Bob"], ["Symbol", TOKEN], ["Network", NETWORK]],
          run: () => ({ entries: [ok("updateAllowlist", "allow Alice, Bob")], caption: "The same holder policy can govern issuance and transfers." }) },
        { stage: "Issue", action: "Issue 1,000",
          text: "Distribute 600 shares to Alice and 400 to Bob.",
          summary: [["Operation", "Batch mint"], ["Recipients", "Alice, Bob"], ["Share amount", M("1,000 EXM")], ["Network", NETWORK]],
          run: (s) => { s.balances.Alice = 600; s.balances.Bob = 400; return { entries: [ok("batchMint", "2 recipients · 1,000 EXM"), ok("Transfer", "0x0 → Alice · 600"), ok("Transfer", "0x0 → Bob · 400")], caption: "One batch records the initial distribution." }; } },
      ],
    },
    restrict: {
      label: "Restrict", title: "Keep shares with eligible holders", readout: true,
      erc20: "The shared Policy Registry gates issuance and transfers without a custom hook.",
      steps: [
        { stage: "Policy", action: "Enable policy",
          text: "Approve Alice and Bob, then bind the policy to mint and transfer scopes.",
          summary: [["Operation", "Enable policy"], ["Policy", "#2 · ALLOWLIST"], ["Scopes", "MINT, TRANSFER"], ["Approved", "Alice, Bob"]],
          run: () => ({ entries: [ok("PolicyCreated", "#2 · ALLOWLIST"), ok("PolicyUpdated", "MINT_RECEIVER, TRANSFER_SENDER, TRANSFER_RECEIVER → #2")], caption: "Accounts are denied until the policy admin approves them." }) },
        { stage: "Issue", action: "Issue 100",
          text: "Issue shares to approved holder Alice.",
          summary: [["Operation", "Mint"], ["Recipient", "Alice"], ["Share amount", M("100 EXM")], ["Network", NETWORK]],
          run: (s) => { s.balances.Alice = 100; return { entries: [ok("Transfer", "0x0 → Alice · 100 EXM")] }; } },
        { stage: "Enforce", action: "Try transfer",
          text: "Alice tries to transfer shares to unapproved holder Carol.",
          summary: [["Operation", "Transfer"], ["To", "Carol"], ["Policy", "Allowlist #2"], ["Status", "Denied"]],
          run: () => ({ entries: [err("PolicyForbids", "TRANSFER_RECEIVER · Carol")], caption: "Carol cannot receive shares until the policy admin approves her." }) },
      ],
    },
    cancel: {
      label: "Cancel", title: "Cancel shares from a blocked holder", readout: true,
      erc20: "B20 exposes a dedicated burn path for a holder denied by the sender policy.",
      steps: [
        { stage: "Fund", action: "Set position",
          text: "Bob holds 100 EXM and is currently eligible.",
          summary: [["Operation", "Mint"], ["Holder", "Bob"], ["Share amount", M("100 EXM")]],
          run: (s) => { s.balances.Bob = 100; return { entries: [ok("Transfer", "0x0 → Bob · 100 EXM")] }; } },
        { stage: "Block", action: "Block Bob",
          text: "Remove Bob from the holder allowlist before cancellation.",
          summary: [["Operation", "Block holder"], ["Holder", "Bob"], ["Policy", "Allowlist"], ["Status", "Denied"]],
          run: (s) => { s.blocked = "Bob"; return { entries: [ok("updateAllowlist", "remove Bob"), err("PolicyForbids", "TRANSFER_SENDER · Bob")], caption: "Bob is denied by the token's sender policy." }; } },
        { stage: "Cancel", action: "Cancel 100",
          text: "Cancel the blocked shares; they do not move to the issuer.",
          summary: [["Operation", "Burn blocked"], ["Holder", "Bob"], ["Share amount", M("100 EXM")]],
          run: (s) => { s.balances.Bob = 0; return { entries: [ok("burnBlocked", "Bob · 100 EXM"), ok("Transfer", "Bob → 0x0 · 100 EXM")], caption: "The shares are burned, reducing total supply." }; } },
      ],
    },
    dividend: {
      label: "Dividend", title: "Announce a stock dividend", readout: true,
      erc20: "B20 brackets the share distribution with an onchain description and URI.",
      steps: [
        { stage: "Record", action: "Load holders",
          text: "Alice holds 600 shares and Bob holds 400.",
          summary: [["Operation", "Record date"], ["Holders", "Alice, Bob"], ["Outstanding", M("1,000 EXM")]],
          run: (s) => { s.balances.Alice = 600; s.balances.Bob = 400; return { entries: [nfo("record date", "Alice 600 · Bob 400")], caption: "The example distributes a five-percent stock dividend." }; } },
        { stage: "Announce", action: "Announce & issue",
          text: "Publish the action details and distribute 30 shares to Alice and 20 to Bob.",
          summary: [["Operation", "Stock dividend"], ["Action id", M("2026-01")], ["Distributed", M("50 EXM")], ["Recipients", "Alice, Bob"]],
          run: (s) => { s.balances.Alice += 30; s.balances.Bob += 20; return { entries: [ok("Announcement", "id 2026-01 · stock dividend"), ok("batchMint", "Alice 30 · Bob 20"), ok("EndAnnouncement", "id 2026-01")], caption: "This issues additional shares; it does not pay a cash dividend." }; } },
      ],
    },
    split: {
      label: "Split", title: "Run a 2-for-1 stock split", readout: true,
      erc20: "The Asset multiplier changes displayed balances without migrating holders.",
      steps: [
        { stage: "Load", action: "Load balances",
          text: "Alice holds 100 raw shares and Bob holds 50.",
          summary: [["Operation", "Load balances"], ["Multiplier", M("1.0 WAD")], ["Holders", "Alice, Bob"]],
          run: (s) => { s.balances.Alice = 100; s.balances.Bob = 50; return { entries: [nfo("multiplier()", "1.0 WAD")], caption: "Raw balances and displayed balances currently match." }; } },
        { stage: "Split", action: "Run split",
          text: "Apply the board-approved 2-for-1 split.",
          summary: [["Operation", "2-for-1 split"], ["Multiplier", M("1.0 → 2.0 WAD")], ["Symbol", TOKEN], ["Network", NETWORK]],
          run: (s) => { s.multiplier = 2; return { entries: [ok("MultiplierUpdated", "1.0 → 2.0 WAD"), nfo("scaledBalanceOf(Alice)", "200 EXM")], caption: "Displayed balances double while raw balances remain unchanged." }; } },
      ],
    },
    pause: {
      label: "Pause", title: "Pause transfers without stopping issuance", readout: true,
      erc20: "B20 separates transfer, mint, and burn pause controls.",
      steps: [
        { stage: "Fund", action: "Load balance",
          text: "Alice holds 100 EXM before an incident begins.",
          summary: [["Operation", "Mint"], ["Holder", "Alice"], ["Share amount", M("100 EXM")]],
          run: (s) => { s.balances.Alice = 100; return { entries: [ok("Transfer", "0x0 → Alice · 100 EXM")] }; } },
        { stage: "Pause", action: "Pause transfers",
          text: "Pause transfers while the issuer investigates.",
          summary: [["Operation", "Pause"], ["Scope", "TRANSFER"], ["Symbol", TOKEN], ["Network", NETWORK]],
          run: (s) => { s.paused = true; return { entries: [ok("Paused", "TRANSFER")], caption: "Mint and burn remain available." }; } },
        { stage: "Enforce", action: "Try transfer",
          text: "Alice tries to transfer 10 shares to Bob.",
          summary: [["Operation", "Transfer"], ["Amount", M("10 EXM")], ["Scope", "TRANSFER (paused)"], ["Status", "Blocked"]],
          run: () => ({ entries: [err("EnforcedPause", "TRANSFER")], caption: "The transfer is rejected by the paused feature." }) },
        { stage: "Issue", action: "Issue 25",
          text: "The issuer can still issue 25 shares to approved holder Bob.",
          summary: [["Operation", "Mint"], ["Recipient", "Bob"], ["Share amount", M("25 EXM")], ["Note", "Mint unpaused"]],
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
  const cur = done ? f.steps[f.steps.length - 1] : f.steps[stepIndex];

  const select = (k) => { setActive(k); setSim(freshSim()); setResults([]); };
  const reset = () => { setSim(freshSim()); setResults([]); };
  const runStep = () => {
    if (done) return;
    const s = { balances: { ...sim.balances }, blocked: sim.blocked, multiplier: sim.multiplier, paused: sim.paused };
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

          {/* Holdings readout */}
          {f.readout && holders.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: sans, fontSize: 10, fontWeight: 600, letterSpacing: ".6px", textTransform: "uppercase", color: C.sub, marginBottom: 8 }}>{sim.multiplier === 1 ? "Holdings" : "Raw → displayed holdings"}</div>
              <div style={{ display: "grid", gap: 6 }}>
                {holders.map((a) => (
                  <div key={a} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: sans, fontSize: 12.5, color: C.body }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot[a] || C.sub, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{a}</span>
                    {sim.blocked === a && <span style={{ fontFamily: sans, fontSize: 9.5, fontWeight: 600, letterSpacing: ".3px", textTransform: "uppercase", color: C.error, border: `1px solid ${C.error}`, borderRadius: 4, padding: "0 4px" }}>blocked</span>}
                    {sim.paused && a === "Alice" && <span style={{ fontFamily: sans, fontSize: 9.5, fontWeight: 600, letterSpacing: ".3px", textTransform: "uppercase", color: C.error, border: `1px solid ${C.error}`, borderRadius: 4, padding: "0 4px" }}>paused</span>}
                    <span style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 600, color: C.ink }}>{fmt(sim.balances[a] || 0)}{sim.multiplier !== 1 && ` → ${fmt((sim.balances[a] || 0) * sim.multiplier)}`}</span>
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
