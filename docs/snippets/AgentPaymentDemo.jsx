import { useState, useEffect } from "react";

export const AgentPaymentDemo = () => {
  const MONO = "ui-monospace,'Cascadia Code','Source Code Pro',Menlo,Monaco,Consolas,monospace";

  const C = {
    prompt:  "#86efac",
    muted:   "#52525b",
    dim:     "#3f3f46",
    request: "#60a5fa",
    error:   "#f87171",
    paying:  "#fbbf24",
    success: "#34d399",
    value:   "#fde68a",
    code:    "#d4d4d8",
    result:  "#c4b5fd",
  };

  const STEPS = [
    {
      delay: 200,
      left:  [{ t: "> Get the ETH price from a paid data source", c: "prompt" }],
      right: [],
    },
    {
      delay: 800,
      left:  [{ t: "  searching for ETH/USD endpoint...", c: "muted" }],
      right: [],
    },
    {
      delay: 700,
      left:  [{ t: "  → GET coingecko.com/api/v3/simple/price", c: "request" }],
      right: [
        { t: "── Request 1 ─────────────────────────────", c: "dim"  },
        { t: "GET /api/v3/simple/price?ids=ethereum",      c: "code" },
        { t: "Host: api.coingecko.com",                   c: "muted"},
        { t: null },
      ],
    },
    {
      delay: 800,
      left:  [{ t: "  ← 402 Payment Required", c: "error" }],
      right: [
        { t: "── Response 1 ────────────────────────────", c: "dim"   },
        { t: "HTTP/1.1 402 Payment Required",              c: "error" },
        { t: "Payment-Required: {",                        c: "muted" },
        { t: '  "maxAmountRequired": "0.001",',            c: "value" },
        { t: '  "asset": "USDC",',                         c: "value" },
        { t: '  "network": "base",',                       c: "value" },
        { t: '  "payTo": "0x742d...c4f2"',                c: "value" },
        { t: "}",                                          c: "muted" },
        { t: null },
      ],
    },
    {
      delay: 1000,
      left:  [{ t: "  paying 0.001 USDC · Sponge Wallet...", c: "paying" }],
      right: [],
    },
    {
      delay: 800,
      left:  [{ t: "  ✓ tx 0xb4f2...91ca confirmed", c: "success" }],
      right: [],
    },
    {
      delay: 600,
      left:  [{ t: "  → retrying with payment signature", c: "request" }],
      right: [
        { t: "── Request 2 ─────────────────────────────", c: "dim"     },
        { t: "GET /api/v3/simple/price?ids=ethereum",      c: "code"    },
        { t: "Host: api.coingecko.com",                   c: "muted"   },
        { t: "Payment-Signature: 0x1a9f...c4e2",          c: "success" },
        { t: null },
      ],
    },
    {
      delay: 700,
      left:  [{ t: "  ← 200 OK", c: "success" }],
      right: [
        { t: "── Response 2 ────────────────────────────", c: "dim"     },
        { t: "HTTP/1.1 200 OK",                            c: "success" },
        { t: '{"ethereum":{"usd":2847.32}}',               c: "code"   },
      ],
    },
    {
      delay: 500,
      left: [
        { t: null },
        { t: "  ETH   $2,847.32   ↑ 2.3% (24h)", c: "result", bold: true },
      ],
      right: [],
    },
  ];

  const [step,    setStep]    = useState(0);
  const [running, setRunning] = useState(false);
  const [blink,   setBlink]   = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setRunning(true), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!running || step >= STEPS.length) {
      if (step >= STEPS.length) setRunning(false);
      return;
    }
    const t = setTimeout(() => setStep(s => s + 1), STEPS[step].delay);
    return () => clearTimeout(t);
  }, [running, step]);

  useEffect(() => {
    const t = setInterval(() => setBlink(b => !b), 530);
    return () => clearInterval(t);
  }, []);

  const leftLines  = STEPS.slice(0, step).flatMap(s => s.left);
  const rightLines = STEPS.slice(0, step).flatMap(s => s.right);
  const done = step >= STEPS.length;

  const restart = () => {
    setStep(0);
    setTimeout(() => setRunning(true), 50);
  };

  const renderLine = (item, i) => {
    if (!item.t) return <div key={i} style={{ height: 8 }} />;
    return (
      <div key={i} style={{
        fontFamily: MONO,
        fontSize: 12,
        lineHeight: "20px",
        color: C[item.c] || C.code,
        fontWeight: item.bold ? 600 : 400,
        whiteSpace: "pre",
      }}>
        {item.t}
      </div>
    );
  };

  const paneLabel = (text) => (
    <div style={{
      fontFamily: MONO,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "#3f3f46",
      marginBottom: 14,
    }}>
      {text}
    </div>
  );

  return (
    <div style={{ margin: "28px 0", borderRadius: 12, overflow: "hidden", border: "1px solid #27272a", background: "#09090b" }}>

      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", background: "#111113", borderBottom: "1px solid #27272a" }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#eab308" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#22c55e" }} />
        <span style={{ marginLeft: 10, fontFamily: MONO, fontSize: 11, color: "#52525b", letterSpacing: "0.04em" }}>
          x402 payment flow
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 300 }}>
        <div style={{ padding: 20, borderRight: "1px solid #27272a" }}>
          {paneLabel("Agent")}
          {leftLines.map(renderLine)}
          {running && !done && (
            <div style={{ fontFamily: MONO, fontSize: 12, lineHeight: "20px", color: C.prompt, opacity: blink ? 1 : 0 }}>
              ▋
            </div>
          )}
        </div>

        <div style={{ padding: 20 }}>
          {paneLabel("HTTP Trace")}
          {rightLines.map(renderLine)}
        </div>
      </div>

      {done && (
        <div style={{ borderTop: "1px solid #27272a", padding: "8px 16px", display: "flex", justifyContent: "center" }}>
          <button
            onClick={restart}
            style={{ fontFamily: MONO, fontSize: 11, color: "#52525b", background: "none", border: "none", cursor: "pointer", padding: "4px 10px", borderRadius: 4 }}
            onMouseEnter={e => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.background = "#18181b"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#52525b"; e.currentTarget.style.background = "none"; }}
          >
            ↺ play again
          </button>
        </div>
      )}
    </div>
  );
};
