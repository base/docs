import { useState, useEffect, useRef } from "react";

export const DataFetchingDemo = () => {
  const mono = "ui-monospace,'Cascadia Code','Source Code Pro',Menlo,Monaco,Consolas,monospace";
  const col = { dim: "#3f3f46", muted: "#52525b", active: "#60a5fa", success: "#34d399", code: "#d4d4d8" };

  const flows = {
    wallets: [
      { delay: 450,
        left:  [{ t: "> Show me my wallets", c: "active" }, { t: "  ← get_wallets()", c: "muted" }],
        right: [{ t: "── get_wallets ─────────────────────", c: "dim" }, { t: "  (no params required)", c: "muted" }] },
      { delay: 700,
        left:  [{ t: "  Base Account: 0x4a3f...b7c1  ✓", c: "success" }, { t: "  Agent Wallet: 0x9c2d...e4f8  (not in session)", c: "muted" }],
        right: [{ t: "", c: "dim" }, { t: '  { type: "base-account",', c: "code" }, { t: '    address: "0x4a3f...b7c1",', c: "code" }, { t: '    inSession: true }', c: "code" }] },
      { delay: 500,
        left:  [{ t: "", c: "dim" }, { t: "  2 wallets found", c: "success" }],
        right: [{ t: "", c: "dim" }, { t: '  { type: "agent-wallet",', c: "code" }, { t: '    address: "0x9c2d...e4f8",', c: "code" }, { t: '    inSession: false }', c: "code" }] },
    ],
    portfolio: [
      { delay: 450,
        left:  [{ t: "> What's my balance on Base?", c: "active" }, { t: "  ← get_portfolio(chain=base)", c: "muted" }],
        right: [{ t: "── get_portfolio ────────────────────", c: "dim" }, { t: "  chain: base", c: "muted" }] },
      { delay: 700,
        left:  [{ t: "  USDC    245.80   $245.80", c: "success" }, { t: "  ETH     0.0412   $148.33", c: "success" }],
        right: [{ t: "", c: "dim" }, { t: "  totalValue:  $430.15", c: "success" }, { t: "  assetCount:  3", c: "code" }] },
      { delay: 500,
        left:  [{ t: "  WETH    0.0100    $36.02", c: "success" }, { t: "  Total:  $430.15 on Base  ✓", c: "success" }],
        right: [{ t: "", c: "dim" }, { t: '  { symbol: "WETH",', c: "code" }, { t: '    balance: "0.0100",', c: "code" }, { t: '    usdValue: "$36.02" }', c: "code" }] },
    ],
    history: [
      { delay: 450,
        left:  [{ t: "> Show my recent USDC sends", c: "active" }, { t: "  ← get_transaction_history(asset=USDC, limit=4)", c: "muted" }],
        right: [{ t: "── get_transaction_history ─────────", c: "dim" }, { t: "  asset: USDC  limit: 4", c: "muted" }] },
      { delay: 700,
        left:  [{ t: "  send   -10.00 USDC   alice.base.eth", c: "code" }, { t: "  recv   +50.00 USDC   coinbase.com  ", c: "success" }],
        right: [{ t: "", c: "dim" }, { t: "  hasMore: true", c: "muted" }, { t: '  nextCursor: "cur_abc..."', c: "muted" }] },
      { delay: 500,
        left:  [{ t: "  send    -5.00 USDC   bob.eth       ", c: "code" }, { t: "  recv  +100.00 USDC   0x9f3a...2e01 ", c: "success" }],
        right: [{ t: "", c: "dim" }, { t: "  4 USDC transactions returned", c: "success" }, { t: "  More pages available", c: "muted" }] },
    ],
  };

  const [choice, setChoice]   = useState(null);
  const [leftLines, setLeft]  = useState([{ t: "> Try a read tool:", c: "muted" }]);
  const [rightLines, setRight]= useState([]);
  const [running, setRunning] = useState(false);
  const [done, setDone]       = useState(false);
  const [blink, setBlink]     = useState(true);
  const leftRef  = useRef(null);
  const rightRef = useRef(null);

  useEffect(() => { const t = setInterval(() => setBlink(b => !b), 530); return () => clearInterval(t); }, []);
  useEffect(() => { if (leftRef.current)  leftRef.current.scrollTop  = leftRef.current.scrollHeight; }, [leftLines]);
  useEffect(() => { if (rightRef.current) rightRef.current.scrollTop = rightRef.current.scrollHeight; }, [rightLines]);

  const reset = () => { setChoice(null); setLeft([{ t: "> Try a read tool:", c: "muted" }]); setRight([]); setRunning(false); setDone(false); };

  const pick = (key) => {
    if (choice) return;
    const labels = { wallets: "get_wallets", portfolio: "get_portfolio", history: "get_transaction_history" };
    setChoice(key);
    setLeft(p => [...p, { t: "  [" + labels[key] + "]", c: "active" }]);
    const steps = flows[key];
    setRunning(true);
    let i = 0;
    const next = () => {
      if (i >= steps.length) { setRunning(false); setDone(true); return; }
      const s = steps[i];
      setTimeout(() => {
        if (s.left)  setLeft(p  => [...p,  ...s.left]);
        if (s.right) setRight(p => [...p, ...s.right]);
        i++; next();
      }, s.delay);
    };
    setTimeout(next, 200);
  };

  const renderLine = (item, i) => {
    if (!item.t) return <div key={i} style={{ height: 5 }} />;
    return <div key={i} style={{ fontFamily: mono, fontSize: 12, lineHeight: "20px", color: col[item.c] || col.code, whiteSpace: "pre" }}>{item.t}</div>;
  };
  const btnBase = { fontFamily: mono, fontSize: 12, color: "#60a5fa", background: "transparent", border: "1px solid #27272a", borderRadius: 4, cursor: "pointer", padding: "2px 8px", marginRight: 6, lineHeight: "20px" };
  const onEnter = (e) => { e.currentTarget.style.color = "#e4e4e7"; e.currentTarget.style.background = "#1c1c1e"; e.currentTarget.style.borderColor = "#3f3f46"; };
  const onLeave = (e) => { e.currentTarget.style.color = "#60a5fa"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#27272a"; };

  return (
    <div style={{ margin: "28px 0", borderRadius: 12, overflow: "hidden", border: "1px solid #27272a", background: "#09090b" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", background: "#111113", borderBottom: "1px solid #27272a" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 24, borderRadius: 6, background: "#1e1e20", border: "1px solid #27272a", marginRight: 10, flexShrink: 0 }}>
          <span style={{ fontFamily: mono, fontSize: 11, color: "#71717a", userSelect: "none" }}>{">"}_</span>
        </div>
        <span style={{ fontFamily: mono, fontSize: 12, color: "#52525b" }}>Read Tools</span>
        <div style={{ flex: 1 }} />
        <button onClick={reset} title="Reset" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 24, borderRadius: 6, background: "transparent", border: "1px solid transparent", cursor: "pointer", color: "#3f3f46", fontSize: 15, lineHeight: 1 }}
          onMouseEnter={e => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.background = "#1e1e20"; e.currentTarget.style.borderColor = "#27272a"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#3f3f46"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>{"↺"}</button>
      </div>
      <div style={{ height: 260, borderBottom: "1px solid #27272a", overflow: "hidden", display: "flex" }}>
        <div style={{ flex: 1, borderRight: "1px solid #27272a", display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ padding: "7px 16px 5px", borderBottom: "1px solid #1c1c1e" }}><span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#3f3f46" }}>Agent</span></div>
          <div ref={leftRef} style={{ flex: 1, overflowY: "hidden", padding: "12px 16px" }}>
            {leftLines.map(renderLine)}
            {!choice && (
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                <button style={btnBase} onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={() => pick("wallets")}>get_wallets</button>
                <button style={btnBase} onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={() => pick("portfolio")}>get_portfolio</button>
                <button style={btnBase} onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={() => pick("history")}>get_transaction_history</button>
              </div>
            )}
            {running && <div style={{ fontFamily: mono, fontSize: 12, lineHeight: "20px", color: "#60a5fa", opacity: blink ? 1 : 0 }}>{"▋"}</div>}
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ padding: "7px 16px 5px", borderBottom: "1px solid #1c1c1e" }}><span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#3f3f46" }}>MCP Response</span></div>
          <div ref={rightRef} style={{ flex: 1, overflowY: "hidden", padding: "12px 16px" }}>{rightLines.map(renderLine)}</div>
        </div>
      </div>
      <div style={{ padding: "8px 16px", display: "flex", justifyContent: "center", minHeight: 37, alignItems: "center" }}>
        {done && <button onClick={reset} style={{ fontFamily: mono, fontSize: 11, color: "#52525b", background: "none", border: "none", cursor: "pointer", padding: "4px 10px", borderRadius: 4 }} onMouseEnter={e => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.background = "#18181b"; }} onMouseLeave={e => { e.currentTarget.style.color = "#52525b"; e.currentTarget.style.background = "none"; }}>{"↺"} Play again</button>}
      </div>
    </div>
  );
};
