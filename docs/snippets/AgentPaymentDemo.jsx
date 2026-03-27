import { useState, useEffect, useRef } from "react";

export const AgentPaymentDemo = () => {
  const mono = "ui-monospace,'Cascadia Code','Source Code Pro',Menlo,Monaco,Consolas,monospace";
  const col = {
    dim:     "#3f3f46",
    muted:   "#52525b",
    active:  "#60a5fa",
    success: "#34d399",
    code:    "#d4d4d8",
  };

  const flows = {
    wallet_cdp: [
      { delay: 350, left: [{ t: "> npx skills add coinbase/agentic-wallet-skills", c: "active" }], right: [
        { t: "── wallet.config.json ──────────────────", c: "dim" },
        { t: "{", c: "code" },
      ]},
      { delay: 550, left: [{ t: "  ✓ skill installed", c: "success" }], right: [
        { t: '  "provider": "coinbase",', c: "code" },
        { t: '  "network": "base",', c: "code" },
        { t: '  "skills": ["agentic-wallet"]', c: "code" },
        { t: "}", c: "code" },
      ]},
      { delay: 500, left: [{ t: "> Sign in with your@email.com", c: "active" }], right: [] },
      { delay: 650, left: [{ t: "  ← OTP sent · checking...", c: "muted" }], right: [] },
      { delay: 600, left: [{ t: "  ✓ CDP wallet connected   0x4a3f...b7c1", c: "success" }], right: [
        { t: "", c: "dim" },
        { t: "  address: 0x4a3f...b7c1", c: "success" },
        { t: "  network: base-mainnet", c: "success" },
      ]},
    ],
    wallet_sponge: [
      { delay: 350, left: [{ t: "> curl -X POST https://api.wallet.paysponge.com/...", c: "active" }], right: [
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
      { delay: 450, left: [{ t: "  ✓ Sponge wallet ready", c: "success" }], right: [] },
    ],
    wallet_bankr: [
      { delay: 350, left: [{ t: "> install bankr skill from github.com/BankrBot/skills", c: "active" }], right: [
        { t: "── github.com/BankrBot/skills ──────────", c: "dim" },
        { t: "GET /releases/latest", c: "muted" },
      ]},
      { delay: 700, left: [{ t: "  ✓ Bankr skill installed", c: "success" }], right: [
        { t: "", c: "dim" },
        { t: "  tag: bankr-wallet-v2.1.0", c: "success" },
        { t: "  size: 142 KB", c: "muted" },
      ]},
      { delay: 500, left: [{ t: "  ✓ Bankr wallet connected", c: "success" }], right: [
        { t: "  ready: true", c: "success" },
      ]},
    ],
    pay: [
      { delay: 350, left: [{ t: "> Find and fetch ETH price from a paid source", c: "active" }], right: [
        { t: "── Request ─────────────────────────────", c: "dim" },
        { t: "GET /api/v3/simple/price?ids=ethereum", c: "code" },
        { t: "Host: api.coingecko.com", c: "muted" },
      ]},
      { delay: 600, left: [{ t: "  → GET api.coingecko.com/simple/price", c: "muted" }], right: [] },
      { delay: 650, left: [{ t: "  ← 402 Payment Required · 0.001 USDC", c: "muted" }], right: [
        { t: "", c: "dim" },
        { t: "── Response 1 ──────────────────────────", c: "dim" },
        { t: "HTTP/1.1 402 Payment Required", c: "muted" },
        { t: 'X-Payment-Required: {', c: "muted" },
        { t: '  "amount": "0.001", "asset": "USDC"', c: "code" },
        { t: '}', c: "muted" },
      ]},
      { delay: 650, left: [{ t: "  paying via wallet...", c: "muted" }], right: [] },
      { delay: 600, left: [{ t: "  ✓ tx confirmed", c: "success" }], right: [] },
      { delay: 500, left: [{ t: "  → retrying with payment signature", c: "muted" }], right: [
        { t: "", c: "dim" },
        { t: "── Request 2 ───────────────────────────", c: "dim" },
        { t: "GET /api/v3/simple/price?ids=ethereum", c: "code" },
        { t: "X-Payment-Sig: 0x1a9f...c4e2", c: "success" },
      ]},
      { delay: 600, left: [{ t: "  ← 200 OK", c: "success" }], right: [
        { t: "", c: "dim" },
        { t: "── Response 2 ──────────────────────────", c: "dim" },
        { t: "HTTP/1.1 200 OK", c: "success" },
        { t: '{"ethereum":{"usd":2847.32}}', c: "code" },
      ]},
      { delay: 300, left: [{ t: "  ETH  $2,847.32  ↑ 2.3%", c: "code", bold: true }], right: [] },
    ],
    getpaid: [
      { delay: 350, left: [{ t: "> Set up a paid endpoint at $0.01 per request", c: "active" }], right: [
        { t: "── x402 middleware config ──────────────", c: "dim" },
        { t: "{", c: "code" },
        { t: '  "path": "/market-data",', c: "code" },
        { t: '  "price": "0.01",', c: "code" },
        { t: '  "asset": "USDC"', c: "code" },
        { t: "}", c: "code" },
      ]},
      { delay: 600, left: [{ t: "  creating x402 middleware...", c: "muted" }], right: [] },
      { delay: 500, left: [{ t: "  ✓ endpoint live: api.myagent.com/market-data", c: "success" }], right: [] },
      { delay: 400, left: [{ t: "  ✓ payTo: 0x742d...c4f2", c: "success" }], right: [] },
      { delay: 800, left: [{ t: "  waiting for requests...", c: "muted" }], right: [
        { t: "", c: "dim" },
        { t: "── Incoming request ────────────────────", c: "dim" },
        { t: "GET /market-data", c: "code" },
        { t: "X-Payment-Sig: 0xc3d1...f891", c: "success" },
      ]},
      { delay: 700, left: [{ t: "  ← incoming payment · 0.01 USDC", c: "muted" }], right: [
        { t: "", c: "dim" },
        { t: "── Payment verified ────────────────────", c: "dim" },
        { t: "  amount: 0.01 USDC ✓", c: "success" },
        { t: "  sig valid: true ✓", c: "success" },
      ]},
      { delay: 450, left: [{ t: "  ✓ payment verified · serving data", c: "success" }], right: [] },
    ],
    swap_cdp: [
      { delay: 350, left: [{ t: "  ✓ using CDP wallet 0x4a3f...b7c1", c: "success" }], right: [
        { t: "── Swap quote ───────────────────────────", c: "dim" },
        { t: "POST /v1/swap/quote", c: "code" },
        { t: "Host: api.developer.coinbase.com", c: "muted" },
      ]},
      { delay: 500, left: [{ t: "> Buy $50 of ETH on Base", c: "active" }], right: [] },
      { delay: 600, left: [{ t: "  fetching quote...", c: "muted" }], right: [
        { t: "", c: "dim" },
        { t: "── Quote response ───────────────────────", c: "dim" },
        { t: '{"fromAmount":"50.00 USDC",', c: "code" },
        { t: '  "toAmount":"0.01756 ETH",', c: "code" },
        { t: '  "priceImpact":"0.12%"}', c: "code" },
      ]},
      { delay: 500, left: [{ t: "  ← 0.01756 ETH · price impact 0.12%", c: "muted" }], right: [] },
      { delay: 550, left: [{ t: "  impact below 1% — executing...", c: "muted" }], right: [] },
      { delay: 700, left: [{ t: "  ✓ tx 0xb4f2...91ca confirmed", c: "success" }], right: [
        { t: "", c: "dim" },
        { t: "── Transaction ──────────────────────────", c: "dim" },
        { t: "  hash: 0xb4f2...91ca", c: "success" },
        { t: "  status: confirmed", c: "success" },
        { t: "  block: 28,419,042", c: "muted" },
      ]},
      { delay: 400, left: [{ t: "  ✓ received 0.01756 ETH", c: "success" }], right: [] },
    ],
    swap_sponge: [
      { delay: 350, left: [{ t: "  ✓ using Sponge wallet", c: "success" }], right: [
        { t: "── Swap quote ───────────────────────────", c: "dim" },
        { t: "POST /swap/quote", c: "code" },
        { t: "Host: api.wallet.paysponge.com", c: "muted" },
      ]},
      { delay: 500, left: [{ t: "> Buy $50 of ETH on Base", c: "active" }], right: [] },
      { delay: 600, left: [{ t: "  fetching quote...", c: "muted" }], right: [
        { t: "", c: "dim" },
        { t: "── Quote response ───────────────────────", c: "dim" },
        { t: '{"fromAmount":"50.00 USDC",', c: "code" },
        { t: '  "toAmount":"0.01756 ETH",', c: "code" },
        { t: '  "priceImpact":"0.12%"}', c: "code" },
      ]},
      { delay: 500, left: [{ t: "  ← 0.01756 ETH · price impact 0.12%", c: "muted" }], right: [] },
      { delay: 550, left: [{ t: "  impact below 1% — executing...", c: "muted" }], right: [] },
      { delay: 700, left: [{ t: "  ✓ tx 0xb4f2...91ca confirmed", c: "success" }], right: [
        { t: "", c: "dim" },
        { t: "── Transaction ──────────────────────────", c: "dim" },
        { t: "  hash: 0xb4f2...91ca", c: "success" },
        { t: "  status: confirmed", c: "success" },
        { t: "  block: 28,419,042", c: "muted" },
      ]},
      { delay: 400, left: [{ t: "  ✓ received 0.01756 ETH", c: "success" }], right: [] },
    ],
    swap_bankr: [
      { delay: 350, left: [{ t: "  ✓ using Bankr wallet", c: "success" }], right: [
        { t: "── Swap quote ───────────────────────────", c: "dim" },
        { t: "POST /swap/quote", c: "code" },
        { t: "Host: api.bankr.bot", c: "muted" },
      ]},
      { delay: 500, left: [{ t: "> Buy $50 of ETH on Base", c: "active" }], right: [] },
      { delay: 600, left: [{ t: "  fetching quote...", c: "muted" }], right: [
        { t: "", c: "dim" },
        { t: "── Quote response ───────────────────────", c: "dim" },
        { t: '{"fromAmount":"50.00 USDC",', c: "code" },
        { t: '  "toAmount":"0.01756 ETH",', c: "code" },
        { t: '  "priceImpact":"0.12%"}', c: "code" },
      ]},
      { delay: 500, left: [{ t: "  ← 0.01756 ETH · price impact 0.12%", c: "muted" }], right: [] },
      { delay: 550, left: [{ t: "  impact below 1% — executing...", c: "muted" }], right: [] },
      { delay: 700, left: [{ t: "  ✓ tx 0xb4f2...91ca confirmed", c: "success" }], right: [
        { t: "", c: "dim" },
        { t: "── Transaction ──────────────────────────", c: "dim" },
        { t: "  hash: 0xb4f2...91ca", c: "success" },
        { t: "  status: confirmed", c: "success" },
        { t: "  block: 28,419,042", c: "muted" },
      ]},
      { delay: 400, left: [{ t: "  ✓ received 0.01756 ETH", c: "success" }], right: [] },
    ],
  };

  const tabs        = ["Setup Wallet", "Pay & Get Paid", "Swap"];
  const rightLabels = ["Wallet Config", "HTTP Trace", "Quote Details"];
  const intros      = [
    "> Setting up your agent wallet...",
    "> Choose a flow:",
    "> Which wallet should execute the swap?",
  ];

  const [activeTab, setActiveTab] = useState(0);
  const [choice1,   setChoice1]   = useState(null);
  const [choice2,   setChoice2]   = useState(null);
  const [leftLines, setLeftLines] = useState([]);
  const [rightLines,setRightLines]= useState([]);
  const [running,   setRunning]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [blink,     setBlink]     = useState(true);
  const leftRef  = useRef(null);
  const rightRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setBlink(b => !b), 530);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { if (leftRef.current)  leftRef.current.scrollTop  = leftRef.current.scrollHeight; }, [leftLines]);
  useEffect(() => { if (rightRef.current) rightRef.current.scrollTop = rightRef.current.scrollHeight; }, [rightLines]);

  const reset = (tab) => {
    const next = tab !== undefined ? tab : activeTab;
    setActiveTab(next);
    setChoice1(null);
    setChoice2(null);
    setLeftLines([]);
    setRightLines([]);
    setRunning(false);
    setDone(false);
  };

  useEffect(() => {
    setLeftLines([]);
    setRightLines([]);
    setChoice1(null);
    setChoice2(null);
    setRunning(false);
    setDone(false);
    const t = setTimeout(() => setLeftLines([{ t: intros[activeTab], c: "muted" }]), 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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

  const pickWallet = (w) => {
    if (choice1) return;
    setChoice1(w);
    setLeftLines(prev => [...prev, { t: "  [" + w.toUpperCase() + "]", c: "active" }]);
    setTimeout(() => animateFlow("wallet_" + w), 150);
  };

  const pickPay = (p) => {
    if (choice2) return;
    setChoice2(p);
    const label = p === "pay" ? "Pay for a service" : "Get paid";
    setLeftLines(prev => [...prev, { t: "  [" + label + "]", c: "active" }]);
    setTimeout(() => animateFlow(p), 150);
  };

  const pickSwap = (w) => {
    if (choice1) return;
    setChoice1(w);
    setLeftLines(prev => [...prev, { t: "  [" + w.toUpperCase() + "]", c: "active" }]);
    setTimeout(() => animateFlow("swap_" + w), 150);
  };

  const renderLine = (item, i) => {
    if (!item.t) return <div key={i} style={{ height: 6 }} />;
    return (
      <div key={i} style={{
        fontFamily: mono,
        fontSize: 12,
        lineHeight: "20px",
        color: col[item.c] || col.code,
        fontWeight: item.bold ? 600 : 400,
        whiteSpace: "pre",
      }}>
        {item.t}
      </div>
    );
  };

  const btnBase = {
    fontFamily: mono, fontSize: 12,
    color: "#60a5fa", background: "transparent",
    border: "1px solid #27272a", borderRadius: 4,
    cursor: "pointer", padding: "1px 8px",
    marginRight: 6, lineHeight: "20px",
  };
  const onBtnEnter = (e) => {
    e.currentTarget.style.color = "#e4e4e7";
    e.currentTarget.style.background = "#1c1c1e";
    e.currentTarget.style.borderColor = "#3f3f46";
  };
  const onBtnLeave = (e) => {
    e.currentTarget.style.color = "#60a5fa";
    e.currentTarget.style.background = "transparent";
    e.currentTarget.style.borderColor = "#27272a";
  };

  const showWalletBtns = activeTab === 0 && !choice1 && leftLines.length > 0;
  const showPayBtns    = activeTab === 1 && !choice2 && leftLines.length > 0;
  const showSwapBtns   = activeTab === 2 && !choice1 && leftLines.length > 0;
  const isLastTab      = activeTab === 2;
  const footerLabel    = isLastTab ? "\u21ba Play again" : "Next: " + tabs[activeTab + 1] + " \u2192";

  return (
    <div style={{ margin: "28px 0", borderRadius: 12, overflow: "hidden", border: "1px solid #27272a", background: "#09090b" }}>

      {/* Tab bar */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", padding: "8px 12px", background: "#111113", borderBottom: "1px solid #27272a" }}>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 28, height: 24, borderRadius: 6,
          background: "#1e1e20", border: "1px solid #27272a", marginRight: 10, flexShrink: 0,
        }}>
          <span style={{ fontFamily: mono, fontSize: 11, color: "#71717a", userSelect: "none" }}>{">"}_</span>
        </div>

        {tabs.map((tab, i) => {
          const active = i === activeTab;
          return (
            <button
              key={tab}
              onClick={() => reset(i)}
              style={{
                fontFamily: mono, fontSize: 12,
                fontWeight: active ? 600 : 400,
                color: active ? "#e4e4e7" : "#52525b",
                background: active ? "#1e1e20" : "transparent",
                border: active ? "1px solid #27272a" : "1px solid transparent",
                borderRadius: 6, cursor: "pointer",
                padding: "3px 12px", marginRight: 2,
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = "#a1a1aa"; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = "#52525b"; }}
            >
              {tab}
            </button>
          );
        })}

        <div style={{ flex: 1 }} />

        <button
          onClick={() => reset(activeTab)}
          title="Reset"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 28, height: 24, borderRadius: 6,
            background: "transparent", border: "1px solid transparent",
            cursor: "pointer", color: "#3f3f46", fontSize: 15, lineHeight: 1,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.background = "#1e1e20"; e.currentTarget.style.borderColor = "#27272a"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#3f3f46"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
        >
          {"\u21ba"}
        </button>
      </div>

      {/* Terminal pane */}
      <div style={{ height: 290, borderBottom: "1px solid #27272a", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "7px 16px 5px", borderBottom: "1px solid #1c1c1e" }}>
          <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#3f3f46" }}>Agent</span>
        </div>
        <div ref={leftRef} style={{ flex: 1, overflowY: "hidden", padding: "12px 16px" }}>
          {leftLines.map(renderLine)}

          {showWalletBtns && (
            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontFamily: mono, fontSize: 12, color: "#52525b", marginRight: 6 }}>  pick:</span>
              <button style={btnBase} onMouseEnter={onBtnEnter} onMouseLeave={onBtnLeave} onClick={() => pickWallet("cdp")}>CDP</button>
              <button style={btnBase} onMouseEnter={onBtnEnter} onMouseLeave={onBtnLeave} onClick={() => pickWallet("sponge")}>Sponge</button>
              <button style={btnBase} onMouseEnter={onBtnEnter} onMouseLeave={onBtnLeave} onClick={() => pickWallet("bankr")}>Bankr</button>
            </div>
          )}
          {showPayBtns && (
            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontFamily: mono, fontSize: 12, color: "#52525b", marginRight: 6 }}>  pick:</span>
              <button style={btnBase} onMouseEnter={onBtnEnter} onMouseLeave={onBtnLeave} onClick={() => pickPay("pay")}>Pay for a service</button>
              <button style={btnBase} onMouseEnter={onBtnEnter} onMouseLeave={onBtnLeave} onClick={() => pickPay("getpaid")}>Get paid</button>
            </div>
          )}
          {showSwapBtns && (
            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontFamily: mono, fontSize: 12, color: "#52525b", marginRight: 6 }}>  pick:</span>
              <button style={btnBase} onMouseEnter={onBtnEnter} onMouseLeave={onBtnLeave} onClick={() => pickSwap("cdp")}>CDP</button>
              <button style={btnBase} onMouseEnter={onBtnEnter} onMouseLeave={onBtnLeave} onClick={() => pickSwap("sponge")}>Sponge</button>
              <button style={btnBase} onMouseEnter={onBtnEnter} onMouseLeave={onBtnLeave} onClick={() => pickSwap("bankr")}>Bankr</button>
            </div>
          )}

          {running && (
            <div style={{ fontFamily: mono, fontSize: 12, lineHeight: "20px", color: "#60a5fa", opacity: blink ? 1 : 0 }}>{"▋"}</div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "8px 16px", display: "flex", justifyContent: "center", minHeight: 37, alignItems: "center" }}>
        {done && (
          <button
            onClick={() => isLastTab ? reset(0) : reset(activeTab + 1)}
            style={{ fontFamily: mono, fontSize: 11, color: "#52525b", background: "none", border: "none", cursor: "pointer", padding: "4px 10px", borderRadius: 4 }}
            onMouseEnter={e => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.background = "#18181b"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#52525b"; e.currentTarget.style.background = "none"; }}
          >
            {footerLabel}
          </button>
        )}
      </div>

    </div>
  );
};
