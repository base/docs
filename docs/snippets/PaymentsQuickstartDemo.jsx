import { useState, useEffect, useRef } from "react";

// CDP x402 payments demo — used in payments.mdx
export const PaymentsQuickstartDemo = () => {
  const mono = "ui-monospace,'Cascadia Code','Source Code Pro',Menlo,Monaco,Consolas,monospace";
  const col = {
    dim:     "#3f3f46",
    muted:   "#52525b",
    active:  "#60a5fa",
    success: "#34d399",
    code:    "#d4d4d8",
  };

  const steps = [
    { delay: 350, left: [{ t: "> npx skills add coinbase/agentic-wallet-skills", c: "active" }], right: [
      { t: "── Installing CDP skills ───────────────", c: "dim" },
      { t: "authenticate-wallet", c: "muted" },
      { t: "pay-for-service", c: "muted" },
      { t: "search-for-service", c: "muted" },
      { t: "monetize-service", c: "muted" },
    ]},
    { delay: 700, left: [{ t: "  ✓ CDP Agentic Wallet skills installed", c: "success" }], right: [] },
    { delay: 500, left: [{ t: "> Sign in with you@email.com", c: "active" }], right: [] },
    { delay: 650, left: [{ t: "  ✓ CDP wallet authenticated  0x4a3f...b7c1", c: "success" }], right: [
      { t: "", c: "dim" },
      { t: "── wallet ready ────────────────────────", c: "dim" },
      { t: "  address: 0x4a3f...b7c1", c: "success" },
      { t: "  balance: 10.00 USDC", c: "success" },
    ]},
    { delay: 500, left: [{ t: "> Find a weather API and get the NYC forecast", c: "active" }], right: [
      { t: "", c: "dim" },
      { t: "── search-for-service ──────────────────", c: "dim" },
      { t: 'query: "weather forecast"', c: "code" },
    ]},
    { delay: 700, left: [{ t: "  ← found: weather.x402.io · 0.001 USDC/req", c: "muted" }], right: [
      { t: "", c: "dim" },
      { t: "── pay-for-service ─────────────────────", c: "dim" },
      { t: "GET /v1/forecast?city=NYC", c: "code" },
      { t: "← HTTP 402 Payment Required", c: "muted" },
    ]},
    { delay: 550, left: [{ t: "  paying 0.001 USDC...", c: "muted" }], right: [
      { t: "", c: "dim" },
      { t: "  Paying 0.001 USDC · signing...", c: "muted" },
      { t: "  Retrying with X-Payment-Sig", c: "muted" },
    ]},
    { delay: 600, left: [{ t: "  ← 200 OK  · forecast received", c: "success", bold: true }], right: [
      { t: "", c: "dim" },
      { t: "HTTP/1.1 200 OK", c: "success" },
      { t: '{"city":"NYC","temp":"68°F",...}', c: "code" },
    ]},
  ];

  const [leftLines, setLeftLines]   = useState([]);
  const [rightLines, setRightLines] = useState([]);
  const [running, setRunning]       = useState(false);
  const [done, setDone]             = useState(false);
  const [blink, setBlink]           = useState(true);
  const leftRef  = useRef(null);
  const rightRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setBlink(b => !b), 530);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { if (leftRef.current)  leftRef.current.scrollTop  = leftRef.current.scrollHeight; }, [leftLines]);
  useEffect(() => { if (rightRef.current) rightRef.current.scrollTop = rightRef.current.scrollHeight; }, [rightLines]);

  const play = () => {
    setLeftLines([]);
    setRightLines([]);
    setRunning(true);
    setDone(false);
    let i = 0;
    const next = () => {
      if (i >= steps.length) { setRunning(false); setDone(true); return; }
      const s = steps[i];
      setTimeout(() => {
        if (s.left && s.left.length)   setLeftLines(prev  => [...prev, ...s.left]);
        if (s.right && s.right.length) setRightLines(prev => [...prev, ...s.right]);
        i++;
        next();
      }, s.delay);
    };
    next();
  };

  useEffect(() => { setTimeout(play, 350); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const renderLine = (item, i) => {
    if (!item.t) return <div key={i} style={{ height: 6 }} />;
    return (
      <div key={i} style={{ fontFamily: mono, fontSize: 12, lineHeight: "20px", color: col[item.c] || col.code, fontWeight: item.bold ? 600 : 400, whiteSpace: "pre" }}>{item.t}</div>
    );
  };

  return (
    <div style={{ margin: "28px 0", borderRadius: 12, overflow: "hidden", border: "1px solid #27272a", background: "#09090b" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", background: "#111113", borderBottom: "1px solid #27272a" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 24, borderRadius: 6, background: "#1e1e20", border: "1px solid #27272a", marginRight: 10, flexShrink: 0 }}>
          <span style={{ fontFamily: mono, fontSize: 11, color: "#71717a", userSelect: "none" }}>{">"}_</span>
        </div>
        <span style={{ fontFamily: mono, fontSize: 12, color: "#52525b" }}>x402 via CDP Agentic Wallet</span>
        <div style={{ flex: 1 }} />
        <button onClick={play} title="Reset" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 24, borderRadius: 6, background: "transparent", border: "1px solid transparent", cursor: "pointer", color: "#3f3f46", fontSize: 15, lineHeight: 1 }}
          onMouseEnter={e => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.background = "#1e1e20"; e.currentTarget.style.borderColor = "#27272a"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#3f3f46"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>
          {"↺"}
        </button>
      </div>

      <div style={{ height: 260, borderBottom: "1px solid #27272a", overflow: "hidden", display: "flex" }}>
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
            <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#3f3f46" }}>HTTP Trace</span>
          </div>
          <div ref={rightRef} style={{ flex: 1, overflowY: "hidden", padding: "12px 16px" }}>
            {rightLines.map(renderLine)}
          </div>
        </div>
      </div>

      <div style={{ padding: "8px 16px", display: "flex", justifyContent: "center", minHeight: 37, alignItems: "center" }}>
        {done && (
          <button onClick={play}
            style={{ fontFamily: mono, fontSize: 11, color: "#52525b", background: "none", border: "none", cursor: "pointer", padding: "4px 10px", borderRadius: 4 }}
            onMouseEnter={e => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.background = "#18181b"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#52525b"; e.currentTarget.style.background = "none"; }}>
            {"↺"} Play again
          </button>
        )}
      </div>
    </div>
  );
};
