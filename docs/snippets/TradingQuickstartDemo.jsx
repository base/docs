import { useState, useEffect, useRef } from "react";

export const TradingQuickstartDemo = () => {
  const mono = "ui-monospace,'Cascadia Code','Source Code Pro',Menlo,Monaco,Consolas,monospace";
  const col = {
    dim:     "#3f3f46",
    muted:   "#52525b",
    active:  "#60a5fa",
    success: "#34d399",
    code:    "#d4d4d8",
  };

  const steps = [
    { delay: 350, left: [{ t: "> install bankr skill from github.com/BankrBot/skills", c: "active" }], right: [
      { t: "── Bankr Wallet ────────────────────────", c: "dim" },
      { t: "GET /releases/latest", c: "muted" },
    ]},
    { delay: 700, left: [{ t: "  ✓ Bankr skill installed", c: "success" }], right: [
      { t: "  tag: bankr-wallet-v2.1.0", c: "success" },
      { t: "  chains: base, eth, solana", c: "muted" },
      { t: "  gas:    sponsored", c: "muted" },
    ]},
    { delay: 500, left: [{ t: "  ✓ Bankr wallet connected   wlt_bankr_...", c: "success" }], right: [] },
    { delay: 500, left: [{ t: "> Buy $50 of ETH on Base", c: "active" }], right: [
      { t: "", c: "dim" },
      { t: "── Swap Quote ──────────────────────────", c: "dim" },
      { t: "POST /v1/swap/quote", c: "code" },
      { t: "Host: api.bankr.bot", c: "muted" },
    ]},
    { delay: 700, left: [{ t: "  fetching quote...", c: "muted" }], right: [
      { t: "", c: "dim" },
      { t: '{"fromAmount":"50.00 USDC",', c: "code" },
      { t: '  "toAmount":"0.01756 ETH",', c: "code" },
      { t: '  "priceImpact":"0.12%"}', c: "code" },
    ]},
    { delay: 500, left: [{ t: "  ← 0.01756 ETH · price impact 0.12%", c: "muted" }], right: [] },
    { delay: 500, left: [{ t: "  impact below 1% — executing...", c: "muted" }], right: [] },
    { delay: 750, left: [{ t: "  ✓ tx 0xb4f2...91ca confirmed", c: "success" }], right: [
      { t: "", c: "dim" },
      { t: "── Transaction ─────────────────────────", c: "dim" },
      { t: "  hash:   0xb4f2...91ca", c: "success" },
      { t: "  status: confirmed", c: "success" },
      { t: "  block:  28,419,042", c: "muted" },
    ]},
    { delay: 400, left: [{ t: "  ✓ received 0.01756 ETH", c: "success", bold: true }], right: [] },
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
        <span style={{ fontFamily: mono, fontSize: 12, color: "#52525b" }}>Trading Quickstart</span>
        <div style={{ flex: 1 }} />
        <button onClick={play} title="Reset" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 24, borderRadius: 6, background: "transparent", border: "1px solid transparent", cursor: "pointer", color: "#3f3f46", fontSize: 15, lineHeight: 1 }}
          onMouseEnter={e => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.background = "#1e1e20"; e.currentTarget.style.borderColor = "#27272a"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#3f3f46"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>
          {"\u21ba"}
        </button>
      </div>

      <div style={{ height: 250, borderBottom: "1px solid #27272a", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "7px 16px 5px", borderBottom: "1px solid #1c1c1e" }}>
          <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#3f3f46" }}>Agent</span>
        </div>
        <div ref={leftRef} style={{ flex: 1, overflowY: "hidden", padding: "12px 16px" }}>
          {leftLines.map(renderLine)}
          {running && <div style={{ fontFamily: mono, fontSize: 12, lineHeight: "20px", color: "#60a5fa", opacity: blink ? 1 : 0 }}>{"▋"}</div>}
        </div>
      </div>

      <div style={{ padding: "8px 16px", display: "flex", justifyContent: "center", minHeight: 37, alignItems: "center" }}>
        {done && (
          <button onClick={play}
            style={{ fontFamily: mono, fontSize: 11, color: "#52525b", background: "none", border: "none", cursor: "pointer", padding: "4px 10px", borderRadius: 4 }}
            onMouseEnter={e => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.background = "#18181b"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#52525b"; e.currentTarget.style.background = "none"; }}>
            {"\u21ba"} Play again
          </button>
        )}
      </div>
    </div>
  );
};
