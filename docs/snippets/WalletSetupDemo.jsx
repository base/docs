import { useState, useEffect, useRef } from "react";

export const WalletSetupDemo = () => {
  const mono = "ui-monospace,'Cascadia Code','Source Code Pro',Menlo,Monaco,Consolas,monospace";
  const col = {
    dim:     "#3f3f46",
    muted:   "#52525b",
    active:  "#60a5fa",
    success: "#34d399",
    code:    "#d4d4d8",
  };

  const flows = {
    cdp: [
      { delay: 400, left: [{ t: "> npx skills add coinbase/agentic-wallet-skills", c: "active" }], right: [
        { t: "── wallet.config.json ──────────────────", c: "dim" },
        { t: "{", c: "code" },
      ]},
      { delay: 600, left: [{ t: "  ✓ skill installed", c: "success" }], right: [
        { t: '  "provider": "coinbase",', c: "code" },
        { t: '  "network": "base",', c: "code" },
        { t: '  "skills": ["agentic-wallet"]', c: "code" },
        { t: "}", c: "code" },
      ]},
      { delay: 500, left: [{ t: "> Sign in to my wallet with you@email.com", c: "active" }], right: [] },
      { delay: 700, left: [{ t: "  ← OTP sent · checking...", c: "muted" }], right: [] },
      { delay: 650, left: [{ t: "  ✓ CDP wallet connected   0x4a3f...b7c1", c: "success" }], right: [
        { t: "", c: "dim" },
        { t: "  address: 0x4a3f...b7c1", c: "success" },
        { t: "  network: base-mainnet", c: "success" },
        { t: "  status:  ready", c: "success" },
      ]},
    ],
    sponge: [
      { delay: 400, left: [{ t: "> curl -X POST https://api.wallet.paysponge.com/...", c: "active" }], right: [
        { t: "── POST /api/agents/register ───────────", c: "dim" },
        { t: "Host: api.wallet.paysponge.com", c: "muted" },
        { t: "Content-Type: application/json", c: "muted" },
      ]},
      { delay: 750, left: [{ t: '  ← {"apiKey": "sponge_live_..."}', c: "muted" }], right: [
        { t: "", c: "dim" },
        { t: "── 200 OK ──────────────────────────────", c: "dim" },
        { t: "{", c: "code" },
        { t: '  "apiKey": "sponge_live_abc...xyz",', c: "code" },
        { t: '  "walletId": "wlt_a1b2c3d4"', c: "code" },
        { t: "}", c: "code" },
      ]},
      { delay: 450, left: [{ t: "> export SPONGE_API_KEY=sponge_live_...", c: "active" }], right: [] },
      { delay: 400, left: [{ t: "  ✓ Sponge wallet ready", c: "success" }], right: [
        { t: "", c: "dim" },
        { t: "  chains: base, ethereum, solana", c: "success" },
        { t: "  x402:   enabled", c: "success" },
      ]},
    ],
    bankr: [
      { delay: 400, left: [{ t: "> install bankr skill from github.com/BankrBot/skills", c: "active" }], right: [
        { t: "── github.com/BankrBot/skills ──────────", c: "dim" },
        { t: "GET /releases/latest", c: "muted" },
      ]},
      { delay: 700, left: [{ t: "  ✓ Bankr skill installed", c: "success" }], right: [
        { t: "", c: "dim" },
        { t: "  tag: bankr-wallet-v2.1.0", c: "success" },
        { t: "  size: 142 KB", c: "muted" },
      ]},
      { delay: 500, left: [{ t: "  ✓ Bankr wallet connected   wlt_bankr_...", c: "success" }], right: [
        { t: "", c: "dim" },
        { t: "  chains: base, eth, solana, polygon", c: "success" },
        { t: "  gas:    sponsored", c: "success" },
        { t: "  swaps:  built-in", c: "success" },
      ]},
    ],
  };

  const [choice, setChoice]       = useState(null);
  const [leftLines, setLeftLines] = useState([]);
  const [rightLines, setRightLines] = useState([]);
  const [running, setRunning]     = useState(false);
  const [done, setDone]           = useState(false);
  const [blink, setBlink]         = useState(true);
  const leftRef  = useRef(null);
  const rightRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setBlink(b => !b), 530);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { if (leftRef.current)  leftRef.current.scrollTop  = leftRef.current.scrollHeight; }, [leftLines]);

  const reset = () => {
    setChoice(null);
    setLeftLines([{ t: "> Choose a wallet provider:", c: "muted" }]);
    setRightLines([]);
    setRunning(false);
    setDone(false);
  };

  useEffect(() => { reset(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const animateFlow = (key) => {
    const steps = flows[key];
    if (!steps) return;
    setRunning(true);
    setDone(false);
    let i = 0;
    const next = () => {
      if (i >= steps.length) { setRunning(false); setDone(true); return; }
      const s = steps[i];
      setTimeout(() => {
        if (s.left && s.left.length)  setLeftLines(prev  => [...prev, ...s.left]);
        if (s.right && s.right.length) setRightLines(prev => [...prev, ...s.right]);
        i++;
        next();
      }, s.delay);
    };
    next();
  };

  const pick = (w) => {
    if (choice) return;
    setChoice(w);
    const label = w === "cdp" ? "CDP" : w === "sponge" ? "Sponge" : "Bankr";
    setLeftLines(prev => [...prev, { t: "  [" + label + "]", c: "active" }]);
    setTimeout(() => animateFlow(w), 150);
  };

  const renderLine = (item, i) => {
    if (!item.t) return <div key={i} style={{ height: 6 }} />;
    return (
      <div key={i} style={{
        fontFamily: mono, fontSize: 12, lineHeight: "20px",
        color: col[item.c] || col.code,
        fontWeight: item.bold ? 600 : 400,
        whiteSpace: "pre",
      }}>{item.t}</div>
    );
  };

  const btnBase = {
    fontFamily: mono, fontSize: 12,
    color: "#60a5fa", background: "transparent",
    border: "1px solid #27272a", borderRadius: 4,
    cursor: "pointer", padding: "1px 8px",
    marginRight: 6, lineHeight: "20px",
  };
  const onEnter = (e) => { e.currentTarget.style.color = "#e4e4e7"; e.currentTarget.style.background = "#1c1c1e"; e.currentTarget.style.borderColor = "#3f3f46"; };
  const onLeave = (e) => { e.currentTarget.style.color = "#60a5fa"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#27272a"; };

  return (
    <div style={{ margin: "28px 0", borderRadius: 12, overflow: "hidden", border: "1px solid #27272a", background: "#09090b" }}>
      {/* Chrome bar */}
      <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", background: "#111113", borderBottom: "1px solid #27272a" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 24, borderRadius: 6, background: "#1e1e20", border: "1px solid #27272a", marginRight: 10, flexShrink: 0 }}>
          <span style={{ fontFamily: mono, fontSize: 11, color: "#71717a", userSelect: "none" }}>{">"}_</span>
        </div>
        <span style={{ fontFamily: mono, fontSize: 12, color: "#52525b" }}>Wallet Setup</span>
        <div style={{ flex: 1 }} />
        <button onClick={reset} title="Reset" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 24, borderRadius: 6, background: "transparent", border: "1px solid transparent", cursor: "pointer", color: "#3f3f46", fontSize: 15, lineHeight: 1 }}
          onMouseEnter={e => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.background = "#1e1e20"; e.currentTarget.style.borderColor = "#27272a"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#3f3f46"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>
          {"\u21ba"}
        </button>
      </div>

      {/* Terminal pane */}
      <div style={{ height: 250, borderBottom: "1px solid #27272a", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "7px 16px 5px", borderBottom: "1px solid #1c1c1e" }}>
          <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#3f3f46" }}>Agent</span>
        </div>
        <div ref={leftRef} style={{ flex: 1, overflowY: "hidden", padding: "12px 16px" }}>
          {leftLines.map(renderLine)}
          {!choice && leftLines.length > 0 && (
            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontFamily: mono, fontSize: 12, color: "#52525b", marginRight: 6 }}>  pick:</span>
              <button style={btnBase} onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={() => pick("cdp")}>CDP</button>
              <button style={btnBase} onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={() => pick("sponge")}>Sponge</button>
              <button style={btnBase} onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={() => pick("bankr")}>Bankr</button>
            </div>
          )}
          {running && <div style={{ fontFamily: mono, fontSize: 12, lineHeight: "20px", color: "#60a5fa", opacity: blink ? 1 : 0 }}>{"▋"}</div>}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "8px 16px", display: "flex", justifyContent: "center", minHeight: 37, alignItems: "center" }}>
        {done && (
          <button onClick={reset}
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
