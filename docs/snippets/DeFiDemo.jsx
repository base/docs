export const DeFiDemo = ({ flow }) => {
  // No imports allowed in Mintlify snippets: useState/useEffect/useRef are injected globally.
  const sans = "'Base Sans','Inter Tight',Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  const mono = "'Base Mono','Roboto Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace";

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

  const NETWORK = "Base Vibenet";

  // ---- result-line helpers ----
  const ok = (name, detail) => ({ kind: "ok", name, detail: detail || "" });
  const err = (name, detail) => ({ kind: "err", name, detail: detail || "" });
  const nfo = (name, detail) => ({ kind: "info", name, detail: detail || "" });
  const M = (v) => ({ v, mono: true });

  const freshSim = () => ({ metrics: [] });

  // ======================================================================
  // Scripted flows. Each step mutates a cloned sim and returns log lines.
  // ======================================================================
  const FLOWS = {
    lend: {
      label: "Lend", title: "Supply assets to a lending market", readout: true, href: "/build-on-base/integrate-defi/integrate-lending",
      footer: "Illustrative only · rates and liquidity vary by market.",
      steps: [
        { stage: "Load", action: "Load wallet",
          text: "A user has 1,000 USDC available in their wallet.",
          summary: [["Operation", "Load wallet"], ["Asset", M("USDC")], ["Amount", M("1,000 USDC")], ["Network", NETWORK]],
          run: (s) => { s.metrics = [{ label: "Wallet", value: "1,000 USDC" }, { label: "Supplied", value: "0 USDC" }]; return { entries: [nfo("wallet balance", "1,000 USDC")] }; } },
        { stage: "Supply", action: "Supply USDC",
          text: "Approve the market and supply the USDC from the user's wallet.",
          summary: [["Operation", "Supply"], ["Market", "USDC lending"], ["Amount", M("1,000 USDC")], ["Supply APY", M("4.2%")], ["Network", NETWORK]],
          run: (s) => { s.metrics = [{ label: "Wallet", value: "0 USDC" }, { label: "Supplied", value: "1,000 USDC" }, { label: "Supply APY", value: "4.2% variable" }]; return { entries: [ok("approve", "1,000 USDC"), ok("supply", "1,000 USDC")], caption: "The wallet now owns a direct protocol position." }; } },
        { stage: "Accrue", action: "Accrue 30 days",
          text: "The supplied position accrues illustrative variable interest.",
          summary: [["Operation", "Accrue interest"], ["Period", "30 days"], ["Supply APY", M("4.2%")], ["Balance", M("1,003.45 USDC")]],
          run: (s) => { s.metrics = [{ label: "Wallet", value: "0 USDC" }, { label: "Supplied", value: "1,003.45 USDC" }, { label: "Supply APY", value: "4.2% variable" }]; return { entries: [ok("position updated", "+3.45 USDC")], caption: "Actual rates change with market utilization." }; } },
        { stage: "Withdraw", action: "Withdraw",
          text: "Withdraw the available position back to the user's wallet.",
          summary: [["Operation", "Withdraw"], ["Amount", M("1,003.45 USDC")], ["To", "Wallet"], ["Network", NETWORK]],
          run: (s) => { s.metrics = [{ label: "Wallet", value: "1,003.45 USDC" }, { label: "Supplied", value: "0 USDC" }]; return { entries: [ok("withdraw", "1,003.45 USDC")], caption: "Withdrawals depend on available market liquidity." }; } },
      ],
    },
    borrow: {
      label: "Borrow", title: "Borrow against supplied collateral", readout: true, href: "/build-on-base/integrate-defi/integrate-borrowing",
      footer: "Illustrative only · liquidation parameters differ by protocol and market.",
      steps: [
        { stage: "Collateral", action: "Supply collateral",
          text: "A user supplies 2 WETH as collateral at an illustrative $2,500 price.",
          summary: [["Operation", "Supply collateral"], ["Collateral", M("2 WETH")], ["Value", M("$5,000")], ["Network", NETWORK]],
          run: (s) => { s.metrics = [{ label: "Collateral", value: "2 WETH · $5,000" }, { label: "Debt", value: "0 USDC" }, { label: "Health factor", value: "—" }]; return { entries: [ok("supply collateral", "2 WETH"), ok("collateral enabled", "WETH")], caption: "The collateral remains exposed to market price changes." }; } },
        { stage: "Borrow", action: "Borrow USDC",
          text: "Borrow 2,000 USDC against the collateral.",
          summary: [["Operation", "Borrow"], ["Asset", M("USDC")], ["Amount", M("2,000 USDC")], ["Health factor", M("2.00")], ["Network", NETWORK]],
          run: (s) => { s.metrics = [{ label: "Collateral", value: "2 WETH · $5,000" }, { label: "Debt", value: "2,000 USDC" }, { label: "Health factor", value: "2.00", tone: "ok" }]; return { entries: [ok("borrow", "2,000 USDC"), nfo("health factor", "2.00")], caption: "A higher health factor provides more room before liquidation." }; } },
        { stage: "Price drop", action: "Simulate price drop",
          text: "WETH falls to an illustrative $1,500 while the debt remains unchanged.",
          summary: [["Operation", "Price update"], ["Collateral", M("2 WETH · $3,000")], ["Debt", M("2,000 USDC")], ["Health factor", M("1.20")]],
          run: (s) => { s.metrics = [{ label: "Collateral", value: "2 WETH · $3,000" }, { label: "Debt", value: "2,000 USDC" }, { label: "Health factor", value: "1.20", tone: "warn" }]; return { entries: [err("risk increased", "health factor 2.00 → 1.20")], caption: "At or below the protocol's liquidation threshold, collateral can be sold to repay debt." }; } },
      ],
    },
    earn: {
      label: "Earn", title: "Embed a vault-based earn product", readout: true, href: "/build-on-base/integrate-defi/integrate-earn-product",
      footer: "Illustrative only · vault yield is variable and not guaranteed.",
      steps: [
        { stage: "Select", action: "Select vault",
          text: "A user has 1,000 USDC and chooses a curated vault in your app.",
          summary: [["Operation", "Select vault"], ["Vault", "USDC yield"], ["Asset", M("USDC")], ["Network", NETWORK]],
          run: (s) => { s.metrics = [{ label: "Wallet", value: "1,000 USDC" }, { label: "Vault shares", value: "0" }, { label: "Redeemable", value: "0 USDC" }]; return { entries: [nfo("vault selected", "USDC · variable yield")], caption: "The vault abstracts the underlying market allocation." }; } },
        { stage: "Deposit", action: "Deposit USDC",
          text: "Deposit once and receive shares that represent the vault position.",
          summary: [["Operation", "Deposit"], ["Amount", M("1,000 USDC")], ["Vault shares", M("1,000")], ["Share price", M("$1.00")], ["Network", NETWORK]],
          run: (s) => { s.metrics = [{ label: "Wallet", value: "0 USDC" }, { label: "Vault shares", value: "1,000" }, { label: "Share price", value: "$1.00" }, { label: "Redeemable", value: "1,000 USDC" }]; return { entries: [ok("approve", "1,000 USDC"), ok("deposit", "1,000 USDC → 1,000 shares")], caption: "The user holds vault shares instead of managing each market position." }; } },
        { stage: "Accrue", action: "Accrue value",
          text: "As the vault earns, each share becomes redeemable for more USDC.",
          summary: [["Operation", "Accrue yield"], ["Vault shares", M("1,000")], ["Share price", M("$1.01")], ["Redeemable", M("1,010 USDC")]],
          run: (s) => { s.metrics = [{ label: "Wallet", value: "0 USDC" }, { label: "Vault shares", value: "1,000" }, { label: "Share price", value: "$1.01" }, { label: "Redeemable", value: "1,010 USDC", tone: "ok" }]; return { entries: [ok("share value updated", "$1.00 → $1.01"), nfo("redeemable assets", "1,010 USDC")], caption: "Actual vault performance can rise or fall and depends on its strategy." }; } },
      ],
    },
    trade: {
      label: "Trade", title: "Swap tokens through an aggregated route", readout: true, href: "/build-on-base/integrate-defi/integrate-trading",
      footer: "Illustrative only · quotes, routes, and minimum output can change.",
      steps: [
        { stage: "Quote", action: "Request quote",
          text: "Request a firm 0x quote to swap 1,000 USDC for WETH on Base.",
          summary: [["Operation", "Swap"], ["Sell", M("1,000 USDC")], ["Buy", M("WETH")], ["Slippage", M("0.5%")], ["Network", NETWORK]],
          run: (s) => { s.metrics = [{ label: "Sell", value: "1,000 USDC" }, { label: "Quoted output", value: "0.397 WETH" }, { label: "Minimum output", value: "0.395 WETH" }]; return { entries: [nfo("route quoted", "0x · 0.397 WETH"), nfo("minimum output", "0.395 WETH")], caption: "Show the user the minimum output, fees, and route before approval." }; } },
        { stage: "Simulate", action: "Simulate swap",
          text: "Fetch a fresh quote, then simulate its transaction data against the user's current wallet state.",
          summary: [["Operation", "Simulate"], ["Expected", M("0.397 WETH")], ["Minimum", M("0.395 WETH")], ["Result", "No revert"], ["Network", NETWORK]],
          run: (s) => { s.metrics = [{ label: "Sell", value: "1,000 USDC" }, { label: "Quoted output", value: "0.397 WETH" }, { label: "Minimum output", value: "0.395 WETH", tone: "ok" }]; return { entries: [ok("simulation", "transaction succeeds"), nfo("quote refreshed", "allowance satisfied")], caption: "Do not submit stale calldata after balances, allowances, or market prices change." }; } },
        { stage: "Swap", action: "Approve and submit swap",
          text: "Approve only the AllowanceHolder address returned by the quote for the exact sell amount, then ask the wallet to sign the prepared transaction and wait for its receipt.",
          summary: [["Operation", "Approve and execute swap"], ["Sell", M("1,000 USDC")], ["Receive", M("0.397 WETH")], ["Minimum", M("0.395 WETH")], ["Spender", "0x AllowanceHolder"], ["Network", NETWORK]],
          run: (s) => { s.metrics = [{ label: "USDC spent", value: "1,000 USDC" }, { label: "WETH received", value: "0.397 WETH", tone: "ok" }, { label: "Status", value: "Confirmed", tone: "ok" }]; return { entries: [ok("approve", "1,000 USDC · AllowanceHolder"), ok("swap submitted", "0x route"), ok("swap confirmed", "0.397 WETH received")], caption: "Never approve the 0x Settler contract; use the spender returned by the API. Refresh balances from Base after the receipt confirms." }; } },
      ],
    },
  };

  const order = ["trade", "lend", "borrow", "earn"];
  const pinned = flow ? (FLOWS[flow] ? flow : order[0]) : null;

  const [active, setActive] = useState(pinned || "lend");
  const [sim, setSim] = useState(freshSim);
  const [results, setResults] = useState([]);

  const f = FLOWS[active] || FLOWS.lend;
  const stepIndex = results.length;
  const done = stepIndex >= f.steps.length;
  const cur = done ? f.steps[f.steps.length - 1] : f.steps[stepIndex];

  const select = (k) => { setActive(k); setSim(freshSim()); setResults([]); };
  const reset = () => { setSim(freshSim()); setResults([]); };
  const runStep = () => {
    if (done) return;
    const s = { metrics: sim.metrics.map((metric) => ({ ...metric })) };
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

  // ---- small building blocks ----
  const StatusTag = ({ state }) => {
    const map = { done: [C.success, "Complete"], now: [C.blue, "In progress"], future: [C.sub, "Pending"] };
    const [col, txt] = map[state];
    return <span className="wf-t-footnote" style={{ color: col }}>{txt}</span>;
  };

  const levelColor = { EVENT: C.blue, INFO: C.sec, ERROR: C.error, PENDING: C.sub };

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
        <span className="wf-t-caption" style={{ color: C.sub, border: `1px solid ${C.border}`, borderRadius: 5, padding: "2px 6px", flexShrink: 0 }}>Demo</span>
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
                  <div className="wf-t-body" style={{ fontWeight: state === "future" ? 400 : 500, color: state === "future" ? C.sub : C.ink }}>{st.action}</div>
                  <div style={{ marginTop: 2 }}><StatusTag state={state} /></div>
                </div>
              </div>
            );
          })}

          {/* Illustrative position readout */}
          {f.readout && sim.metrics.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              <div className="wf-t-caption" style={{ color: C.sub, marginBottom: 8 }}>Illustrative position</div>
              <div style={{ display: "grid", gap: 6 }}>
                {sim.metrics.map((m) => (
                  <div key={m.label} className="wf-t-body" style={{ display: "flex", alignItems: "center", gap: 8, color: C.body }}>
                    <span style={{ flex: 1 }}>{m.label}</span>
                    <span style={{ fontFamily: "var(--wf-mono)", fontSize: 12.5, fontWeight: 600, color: m.tone === "warn" ? C.error : m.tone === "ok" ? C.success : C.ink }}>{m.value}</span>
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
              <div className="wf-t-footnote" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontWeight: 600, color: C.success, background: C.successSoft, borderRadius: 6, padding: "5px 10px" }}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke={C.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                Flow complete
              </div>
              <div className="wf-t-body" style={{ color: C.body, margin: "12px 0 16px" }}>{f.title} — every step ran onchain in the simulation above.</div>
              <button className="wf-btn2" onClick={reset}>Run again</button>
              <a className="wf-btn" href={f.href} style={{ textDecoration: "none", color: C.onBlue, marginTop: 8, display: "flex", boxSizing: "border-box" }}>See technical details →</a>
            </div>
          ) : (
            <div className="wf-anim" key={stepIndex}>
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
          <span className="wf-t-headline" style={{ fontSize: 13, color: C.ink }}>Transaction event log</span>
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
        <span className="wf-t-footnote" style={{ color: C.sub }}>{f.footer}</span>
      </div>
    </div>
  );
};
