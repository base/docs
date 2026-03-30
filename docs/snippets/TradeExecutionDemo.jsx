import { useState, useEffect, useRef } from "react";

export const TradeExecutionDemo = () => {
  const mono = "ui-monospace,'Cascadia Code','Source Code Pro',Menlo,Monaco,Consolas,monospace";
  const col = {
    dim:     "#3f3f46",
    muted:   "#52525b",
    active:  "#60a5fa",
    success: "#34d399",
    code:    "#d4d4d8",
  };

  const steps = [
    { delay: 350, left: [{ t: "> Connect to mainnet-preconf.base.org...", c: "active" }], right: [
      { t: "── Flashblocks State ───────────────────", c: "dim" },
      { t: "eth_getBlockByNumber(\"pending\")", c: "code" },
      { t: "Host: mainnet-preconf.base.org", c: "muted" },
    ]},
    { delay: 650, left: [{ t: "  ✓ preconf endpoint connected (200ms)", c: "success" }], right: [
      { t: "", c: "dim" },
      { t: '{"pending": {', c: "code" },
      { t: '  "number": "0x1B2A4F2",', c: "code" },
      { t: '  "baseFeePerGas": "0x2386F26FC10"', c: "code" },
      { t: "} }", c: "code" },
    ]},
    { delay: 500, left: [{ t: "> Simulate buying $50 ETH (preconf state)...", c: "active" }], right: [
      { t: "", c: "dim" },
      { t: "── eth_simulateV1 ──────────────────────", c: "dim" },
      { t: "blockStateCalls: [pending]", c: "muted" },
    ]},
    { delay: 700, left: [{ t: "  ✓ simulation passed · no revert", c: "success" }], right: [
      { t: "", c: "dim" },
      { t: '{"results":[{"status":"0x1",', c: "code" },
      { t: '  "gasUsed":"0x14c08"}]}', c: "code" },
    ]},
    { delay: 450, left: [{ t: "> Get swap quote · price impact check...", c: "active" }], right: [
      { t: "", c: "dim" },
      { t: "── Quote Details ───────────────────────", c: "dim" },
      { t: '{"fromAmount":"50.00 USDC",', c: "code" },
      { t: '  "toAmount":"0.01756 ETH",', c: "code" },
      { t: '  "priceImpact":"0.12%"}', c: "code" },
    ]},
    { delay: 500, left: [{ t: "  impact 0.12% < 1% — executing...", c: "muted" }], right: [] },
    { delay: 750, left: [{ t: "  ✓ tx 0xb4f2...91ca confirmed (1 Flashblock)", c: "success" }], right: [
      { t: "", c: "dim" },
      { t: "── base_transactionStatus ──────────────", c: "dim" },
      { t: "  status:    preconfirmed", c: "success" },
      { t: "  hash:      0xb4f2...91ca", c: "success" },
      { t: "  block:     28,419,042", c: "muted" },
      { t: "  latency:   ~200ms", c: "muted" },
    ]},
    { delay: 350, left: [{ t: "  ✓ received 0.01756 ETH", c: "success", bold: true }], right: [] },
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
        <span style={{ fontFamily: mono, fontSize: 12, color: "#52525b" }}>Trade Execution</span>
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
