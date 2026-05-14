import { useState, useEffect, useRef } from "react";

export const TradeExecutionDemo = () => {
  const mono = "ui-monospace,'Cascadia Code','Source Code Pro',Menlo,Monaco,Consolas,monospace";
  const col = { dim: "#3f3f46", muted: "#52525b", active: "#60a5fa", success: "#34d399", code: "#d4d4d8", warn: "#fb923c" };

  const steps = [
    { delay: 400, lines: [{ t: "> Send 50 DEGEN to alice.base.eth", c: "active" }] },
    { delay: 500, lines: [
      { t: "  ── search_tokens ──────────────────────────", c: "dim" },
      { t: '  query: "DEGEN"  chain: base', c: "muted" },
    ]},
    { delay: 650, lines: [
      { t: '  ← name: "Degen"  symbol: "DEGEN"', c: "code" },
      { t: '     address: "0x4ed4...9fa2"  decimals: 18', c: "code" },
    ]},
    { delay: 500, lines: [{ t: "", c: "dim" }, { t: "> send(alice.base.eth, 50 DEGEN, 0x4ed4..., 18)", c: "active" }] },
    { delay: 500, lines: [
      { t: "  ── approval required ──────────────────────", c: "warn" },
      { t: '  approvalUrl: "keys.coinbase.com/..."', c: "warn" },
    ]},
    { delay: 500, lines: [{ t: "  Please approve: keys.coinbase.com/…", c: "warn" }] },
    { delay: 1000, lines: [
      { t: '  ← status: "confirmed"', c: "success" },
      { t: "  ✓ 50 DEGEN sent to alice.base.eth", c: "success" },
    ]},
  ];

  const [lines, setLines]     = useState([]);
  const [running, setRunning] = useState(false);
  const [done, setDone]       = useState(false);
  const [blink, setBlink]     = useState(true);
  const ref = useRef(null);

  useEffect(() => { const t = setInterval(() => setBlink(b => !b), 530); return () => clearInterval(t); }, []);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [lines]);

  const reset = () => { setLines([]); setRunning(false); setDone(false); };
  const run = () => {
    if (running || done) return;
    setRunning(true);
    let i = 0;
    const next = () => {
      if (i >= steps.length) { setRunning(false); setDone(true); return; }
      setTimeout(() => { setLines(p => [...p, ...steps[i].lines]); i++; next(); }, steps[i].delay);
    };
    next();
  };

  const renderLine = (item, i) => {
    if (!item.t) return <div key={i} style={{ height: 5 }} />;
    return <div key={i} style={{ fontFamily: mono, fontSize: 12, lineHeight: "20px", color: col[item.c] || col.code, whiteSpace: "pre" }}>{item.t}</div>;
  };

  return (
    <div style={{ margin: "28px 0", borderRadius: 12, overflow: "hidden", border: "1px solid #27272a", background: "#09090b" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", background: "#111113", borderBottom: "1px solid #27272a" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 24, borderRadius: 6, background: "#1e1e20", border: "1px solid #27272a", marginRight: 10, flexShrink: 0 }}>
          <span style={{ fontFamily: mono, fontSize: 11, color: "#71717a", userSelect: "none" }}>{">"}_</span>
        </div>
        <span style={{ fontFamily: mono, fontSize: 12, color: "#52525b" }}>Token Search + Send</span>
        <div style={{ flex: 1 }} />
        <button onClick={reset} title="Reset" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 24, borderRadius: 6, background: "transparent", border: "1px solid transparent", cursor: "pointer", color: "#3f3f46", fontSize: 15, lineHeight: 1 }}
          onMouseEnter={e => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.background = "#1e1e20"; e.currentTarget.style.borderColor = "#27272a"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#3f3f46"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>{"↺"}</button>
      </div>
      <div style={{ height: 240, borderBottom: "1px solid #27272a", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "7px 16px 5px", borderBottom: "1px solid #1c1c1e" }}><span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#3f3f46" }}>Terminal</span></div>
        <div ref={ref} style={{ flex: 1, overflowY: "hidden", padding: "12px 16px" }}>
          {lines.map(renderLine)}
          {running && <div style={{ fontFamily: mono, fontSize: 12, lineHeight: "20px", color: "#60a5fa", opacity: blink ? 1 : 0 }}>{"▋"}</div>}
        </div>
      </div>
      <div style={{ padding: "8px 16px", display: "flex", justifyContent: "center", minHeight: 37, alignItems: "center" }}>
        {!running && !done && <button onClick={run} style={{ fontFamily: mono, fontSize: 11, color: "#60a5fa", background: "#0c1824", border: "1px solid #1d3a5a", cursor: "pointer", padding: "4px 14px", borderRadius: 4 }} onMouseEnter={e => { e.currentTarget.style.background = "#0f2033"; }} onMouseLeave={e => { e.currentTarget.style.background = "#0c1824"; }}>▶ Run demo</button>}
        {done && <button onClick={reset} style={{ fontFamily: mono, fontSize: 11, color: "#52525b", background: "none", border: "none", cursor: "pointer", padding: "4px 10px", borderRadius: 4 }} onMouseEnter={e => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.background = "#18181b"; }} onMouseLeave={e => { e.currentTarget.style.color = "#52525b"; e.currentTarget.style.background = "none"; }}>{"↺"} Play again</button>}
      </div>
    </div>
  );
};
