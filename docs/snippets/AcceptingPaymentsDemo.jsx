import { useState, useEffect, useRef } from "react";

// Morpho plugin orchestration demo — used in plugins/morpho.mdx
export const AcceptingPaymentsDemo = () => {
  const mono = "ui-monospace,'Cascadia Code','Source Code Pro',Menlo,Monaco,Consolas,monospace";
  const col = {
    dim:     "#3f3f46",
    muted:   "#52525b",
    active:  "#60a5fa",
    success: "#34d399",
    code:    "#d4d4d8",
    warn:    "#fb923c",
  };

  const steps = [
    { delay: 400, left: [{ t: "> Find the best USDC vault on Base and deposit 100 USDC", c: "active" }], right: [
      { t: "── morpho_query_vaults ──────────────────", c: "dim" },
      { t: "  asset: USDC", c: "muted" },
      { t: "  sortBy: APY", c: "muted" },
    ]},
    { delay: 700, left: [{ t: "  ← top vault: Morpho Flagship USDC", c: "muted" }], right: [
      { t: "", c: "dim" },
      { t: "  Morpho Flagship USDC", c: "success" },
      { t: "  APY: 8.42%  TVL: $42.1M", c: "success" },
      { t: "  address: 0x8eB6...4Fa1", c: "code" },
    ]},
    { delay: 500, left: [{ t: "> prepare_deposit(vault, 100 USDC)", c: "active" }], right: [
      { t: "", c: "dim" },
      { t: "── morpho_prepare_deposit ───────────────", c: "dim" },
      { t: "  Simulating deposit...", c: "muted" },
    ]},
    { delay: 700, left: [{ t: "  ← simulation ok · calls ready", c: "muted" }], right: [
      { t: "", c: "dim" },
      { t: "{", c: "code" },
      { t: '  "chainId": "0x2105",', c: "code" },
      { t: '  "calls": [approve, deposit]', c: "code" },
      { t: "}", c: "code" },
    ]},
    { delay: 500, left: [{ t: "> send_calls(chainId, calls)", c: "active" }], right: [
      { t: "", c: "dim" },
      { t: "── send_calls ──────────────────────────", c: "dim" },
      { t: "  Submitting to Base Account MCP...", c: "muted" },
    ]},
    { delay: 600, left: [{ t: "  ← approval required", c: "warn" }], right: [
      { t: "", c: "dim" },
      { t: '  approvalUrl: "keys.coinbase.com/..."', c: "warn" },
      { t: '  requestId:   "req_xyz789"', c: "muted" },
    ]},
    { delay: 500, left: [{ t: "  Please approve: keys.coinbase.com/…", c: "warn" }], right: [] },
    { delay: 1000, left: [{ t: "  ← user approved ✓", c: "success" }], right: [
      { t: "", c: "dim" },
      { t: "── get_request_status ──────────────────", c: "dim" },
      { t: '  status: "confirmed"', c: "success" },
    ]},
    { delay: 400, left: [{ t: "  ✓ 100 USDC deposited · earning 8.42% APY", c: "success" }], right: [] },
  ];

  const [leftLines, setLeftLines]   = useState([]);
  const [rightLines, setRightLines] = useState([]);
  const [running, setRunning]       = useState(false);
  const [done, setDone]             = useState(false);
  const [blink, setBlink]           = useState(true);
  const leftRef  = useRef(null);
  const rightRef = useRef(null);

  useEffect(() => { const t = setInterval(() => setBlink(b => !b), 530); return () => clearInterval(t); }, []);
  useEffect(() => { if (leftRef.current)  leftRef.current.scrollTop  = leftRef.current.scrollHeight; }, [leftLines]);
  useEffect(() => { if (rightRef.current) rightRef.current.scrollTop = rightRef.current.scrollHeight; }, [rightLines]);

  const reset = () => { setLeftLines([]); setRightLines([]); setRunning(false); setDone(false); };

  const run = () => {
    if (running || done) return;
    setRunning(true);
    let i = 0;
    const next = () => {
      if (i >= steps.length) { setRunning(false); setDone(true); return; }
      const s = steps[i];
      setTimeout(() => {
        if (s.left && s.left.length)  setLeftLines(prev  => [...prev, ...s.left]);
        if (s.right && s.right.length) setRightLines(prev => [...prev, ...s.right]);
        i++; next();
      }, s.delay);
    };
    next();
  };

  const renderLine = (item, i) => {
    if (!item.t) return <div key={i} style={{ height: 6 }} />;
    return <div key={i} style={{ fontFamily: mono, fontSize: 12, lineHeight: "20px", color: col[item.c] || col.code, whiteSpace: "pre" }}>{item.t}</div>;
  };

  return (
    <div style={{ margin: "28px 0", borderRadius: 12, overflow: "hidden", border: "1px solid #27272a", background: "#09090b" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", background: "#111113", borderBottom: "1px solid #27272a" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 24, borderRadius: 6, background: "#1e1e20", border: "1px solid #27272a", marginRight: 10, flexShrink: 0 }}>
          <span style={{ fontFamily: mono, fontSize: 11, color: "#71717a", userSelect: "none" }}>{">"}_</span>
        </div>
        <span style={{ fontFamily: mono, fontSize: 12, color: "#52525b" }}>Morpho + Base Account MCP</span>
        <div style={{ flex: 1 }} />
        <button onClick={reset} title="Reset" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 24, borderRadius: 6, background: "transparent", border: "1px solid transparent", cursor: "pointer", color: "#3f3f46", fontSize: 15, lineHeight: 1 }}
          onMouseEnter={e => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.background = "#1e1e20"; e.currentTarget.style.borderColor = "#27272a"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#3f3f46"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>{"↺"}</button>
      </div>
      <div style={{ height: 270, borderBottom: "1px solid #27272a", overflow: "hidden", display: "flex" }}>
        <div style={{ flex: 1, borderRight: "1px solid #27272a", display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ padding: "7px 16px 5px", borderBottom: "1px solid #1c1c1e" }}>
            <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#3f3f46" }}>Agent</span>
          </div>
          <div ref={leftRef} style={{ flex: 1, overflowY: "hidden", padding: "12px 16px" }}>
            {leftLines.map(renderLine)}
            {running && <div style={{ fontFamily: mono, fontSize: 12, lineHeight: "20px", color: "#60a5fa", opacity: blink ? 1 : 0 }}>{"▋"}</div>}
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ padding: "7px 16px 5px", borderBottom: "1px solid #1c1c1e" }}>
            <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#3f3f46" }}>MCP Response</span>
          </div>
          <div ref={rightRef} style={{ flex: 1, overflowY: "hidden", padding: "12px 16px" }}>
            {rightLines.map(renderLine)}
          </div>
        </div>
      </div>
      <div style={{ padding: "8px 16px", display: "flex", justifyContent: "center", minHeight: 37, alignItems: "center" }}>
        {!running && !done && leftLines.length === 0 && (
          <button onClick={run} style={{ fontFamily: mono, fontSize: 11, color: "#60a5fa", background: "#0c1824", border: "1px solid #1d3a5a", cursor: "pointer", padding: "4px 14px", borderRadius: 4 }}
            onMouseEnter={e => { e.currentTarget.style.background = "#0f2033"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#0c1824"; }}>▶ Run demo</button>
        )}
        {done && (
          <button onClick={reset} style={{ fontFamily: mono, fontSize: 11, color: "#52525b", background: "none", border: "none", cursor: "pointer", padding: "4px 10px", borderRadius: 4 }}
            onMouseEnter={e => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.background = "#18181b"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#52525b"; e.currentTarget.style.background = "none"; }}>{"↺"} Play again</button>
        )}
      </div>
    </div>
  );
};
