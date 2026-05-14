import { useState, useEffect, useRef } from "react";

export const AgentPaymentDemo = () => {
  const mono = "ui-monospace,'Cascadia Code','Source Code Pro',Menlo,Monaco,Consolas,monospace";
  const col = {
    dim:     "#3f3f46",
    muted:   "#52525b",
    active:  "#60a5fa",
    success: "#34d399",
    code:    "#d4d4d8",
    warn:    "#fb923c",
  };

  const flows = {
    // Tab 0 — Connect: platform choice
    connect_claude: [
      { delay: 400, left: [{ t: "> claude mcp add --transport http base-account https://mcp.base.org", c: "active" }], right: [
        { t: "── .claude/settings.json ───────────────", c: "dim" },
        { t: "{", c: "code" },
      ]},
      { delay: 650, left: [{ t: "  ✓ MCP server added: base-account", c: "success" }], right: [
        { t: '  "mcpServers": {', c: "code" },
        { t: '    "base-account": {', c: "code" },
        { t: '      "url": "https://mcp.base.org"', c: "code" },
        { t: "    }", c: "code" },
        { t: "  }", c: "code" },
        { t: "}", c: "code" },
      ]},
      { delay: 600, left: [{ t: "> Show me my wallets", c: "active" }], right: [] },
      { delay: 500, left: [{ t: "  ← Authorizing via keys.coinbase.com...", c: "warn" }], right: [
        { t: "", c: "dim" },
        { t: "── OAuth ───────────────────────────────", c: "dim" },
        { t: "  → keys.coinbase.com/authorize", c: "warn" },
      ]},
      { delay: 800, left: [{ t: "  ✓ Base Account connected  0x4a3f...b7c1", c: "success" }], right: [
        { t: "", c: "dim" },
        { t: '  address: "0x4a3f...b7c1"', c: "success" },
        { t: '  network: "base-mainnet"', c: "success" },
        { t: '  status:  "ready"', c: "success" },
      ]},
    ],
    connect_desktop: [
      { delay: 400, left: [{ t: "> Edit claude_desktop_config.json", c: "active" }], right: [
        { t: "── claude_desktop_config.json ──────────", c: "dim" },
        { t: "{", c: "code" },
      ]},
      { delay: 600, left: [{ t: "  Adding base-account entry...", c: "muted" }], right: [
        { t: '  "mcpServers": {', c: "code" },
        { t: '    "base-account": {', c: "code" },
        { t: '      "url": "https://mcp.base.org"', c: "code" },
        { t: "    }", c: "code" },
        { t: "  }", c: "code" },
        { t: "}", c: "code" },
      ]},
      { delay: 550, left: [{ t: "  Restart Claude Desktop →", c: "muted" }], right: [] },
      { delay: 700, left: [{ t: "  ✓ base-account MCP connected", c: "success" }], right: [
        { t: "", c: "dim" },
        { t: "── toolbar ─────────────────────────────", c: "dim" },
        { t: "  [🔵 base-account]  connected", c: "success" },
      ]},
    ],
    connect_chatgpt: [
      { delay: 400, left: [{ t: "> Settings → Connectors → Add MCP", c: "active" }], right: [
        { t: "── ChatGPT Connectors ───────────────────", c: "dim" },
        { t: "  Add custom connector", c: "muted" },
      ]},
      { delay: 550, left: [{ t: "  Enter: https://mcp.base.org", c: "muted" }], right: [
        { t: "", c: "dim" },
        { t: "  Server URL:", c: "muted" },
        { t: "  https://mcp.base.org  [Save]", c: "active" },
      ]},
      { delay: 700, left: [{ t: "  ✓ Base Account MCP saved", c: "success" }], right: [
        { t: "", c: "dim" },
        { t: "── Connectors ──────────────────────────", c: "dim" },
        { t: "  ✓ base-account  mcp.base.org", c: "success" },
      ]},
    ],

    // Tab 1 — Wallets & Balances: linear
    balances: [
      { delay: 400, left: [{ t: "> Show me my wallets", c: "active" }], right: [
        { t: "── get_wallets ─────────────────────────", c: "dim" },
        { t: "tool: get_wallets()", c: "muted" },
      ]},
      { delay: 650, left: [{ t: "  ← 2 wallets", c: "muted" }], right: [
        { t: "", c: "dim" },
        { t: '  { type: "base-account",', c: "code" },
        { t: '    address: "0x4a3f...b7c1",', c: "code" },
        { t: '    inSession: true }', c: "code" },
      ]},
      { delay: 400, left: [{ t: "  Base Account: 0x4a3f...b7c1", c: "success" }], right: [
        { t: "", c: "dim" },
        { t: '  { type: "agent-wallet",', c: "code" },
        { t: '    address: "0x9c2d...e4f8",', c: "code" },
        { t: '    inSession: false }', c: "code" },
      ]},
      { delay: 600, left: [{ t: "> What's my balance on Base?", c: "active" }], right: [] },
      { delay: 500, left: [{ t: "  ← get_portfolio(chain=base)", c: "muted" }], right: [
        { t: "", c: "dim" },
        { t: "── get_portfolio ────────────────────────", c: "dim" },
        { t: "  USDC   245.80   $245.80", c: "success" },
        { t: "  ETH    0.0412   $148.33", c: "success" },
        { t: "  WETH   0.0100   $36.02 ", c: "success" },
      ]},
      { delay: 400, left: [{ t: "  Total: $430.15 on Base", c: "success" }], right: [] },
    ],

    // Tab 2 — Send & Swap: choice
    send: [
      { delay: 400, left: [{ t: "> Send 10 USDC to alice.base.eth", c: "active" }], right: [
        { t: "── send() ──────────────────────────────", c: "dim" },
        { t: "  recipient: alice.base.eth", c: "muted" },
        { t: "  amount:    10", c: "muted" },
        { t: "  asset:     USDC", c: "muted" },
        { t: "  chain:     base", c: "muted" },
      ]},
      { delay: 650, left: [{ t: "  ← approval required", c: "warn" }], right: [
        { t: "", c: "dim" },
        { t: "── approval mode ────────────────────────", c: "warn" },
        { t: '  approvalUrl: "keys.coinbase.com/..."', c: "warn" },
        { t: '  requestId:   "req_abc123"', c: "muted" },
      ]},
      { delay: 500, left: [{ t: "  Please approve: keys.coinbase.com/…", c: "warn" }], right: [] },
      { delay: 900, left: [{ t: "  ← user approved ✓", c: "success" }], right: [
        { t: "", c: "dim" },
        { t: "── get_request_status ──────────────────", c: "dim" },
        { t: '  status: "confirmed"', c: "success" },
        { t: '  txHash: "0xf7e3...9a12"', c: "success" },
      ]},
      { delay: 400, left: [{ t: "  ✓ 10 USDC sent to alice.base.eth", c: "success" }], right: [] },
    ],
    swap: [
      { delay: 400, left: [{ t: "> Swap 100 USDC for ETH on Base", c: "active" }], right: [
        { t: "── swap() ──────────────────────────────", c: "dim" },
        { t: "  fromAsset: USDC", c: "muted" },
        { t: "  toAsset:   ETH", c: "muted" },
        { t: "  amount:    100", c: "muted" },
        { t: "  chain:     base", c: "muted" },
      ]},
      { delay: 650, left: [{ t: "  ← approval required", c: "warn" }], right: [
        { t: "", c: "dim" },
        { t: "── approval mode ────────────────────────", c: "warn" },
        { t: '  approvalUrl: "keys.coinbase.com/..."', c: "warn" },
        { t: '  requestId:   "req_def456"', c: "muted" },
      ]},
      { delay: 500, left: [{ t: "  Please approve: keys.coinbase.com/…", c: "warn" }], right: [] },
      { delay: 900, left: [{ t: "  ← user approved ✓", c: "success" }], right: [
        { t: "", c: "dim" },
        { t: "── get_request_status ──────────────────", c: "dim" },
        { t: '  status:   "confirmed"', c: "success" },
        { t: '  received: "0.03512 ETH"', c: "success" },
      ]},
      { delay: 400, left: [{ t: "  ✓ received 0.03512 ETH", c: "success" }], right: [] },
    ],
  };

  const tabs        = ["Connect", "Wallets & Balances", "Send & Swap"];
  const rightLabels = ["Config", "MCP Response", "Approval Flow"];
  const intros      = [
    "> Choose your platform:",
    "> Checking your Base Account...",
    "> Choose an action:",
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
    const t = setTimeout(() => {
      setLeftLines([{ t: intros[activeTab], c: "muted" }]);
      // Tab 1 is linear — auto-start
      if (activeTab === 1) {
        setTimeout(() => animateFlow("balances"), 300);
      }
    }, 350);
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

  const pickConnect = (p) => {
    if (choice1) return;
    setChoice1(p);
    const labels = { claude: "Claude Code", desktop: "Claude Desktop", chatgpt: "ChatGPT" };
    setLeftLines(prev => [...prev, { t: "  [" + labels[p] + "]", c: "active" }]);
    setTimeout(() => animateFlow("connect_" + p), 150);
  };

  const pickAction = (a) => {
    if (choice2) return;
    setChoice2(a);
    const labels = { send: "Send", swap: "Swap" };
    setLeftLines(prev => [...prev, { t: "  [" + labels[a] + "]", c: "active" }]);
    setTimeout(() => animateFlow(a), 150);
  };

  const renderLine = (item, i) => {
    if (!item.t) return <div key={i} style={{ height: 6 }} />;
    return (
      <div key={i} style={{
        fontFamily: mono, fontSize: 12, lineHeight: "20px",
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
  const onBtnEnter = (e) => { e.currentTarget.style.color = "#e4e4e7"; e.currentTarget.style.background = "#1c1c1e"; e.currentTarget.style.borderColor = "#3f3f46"; };
  const onBtnLeave = (e) => { e.currentTarget.style.color = "#60a5fa"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#27272a"; };

  const showConnectBtns = activeTab === 0 && !choice1 && leftLines.length > 0;
  const showActionBtns  = activeTab === 2 && !choice2 && leftLines.length > 0;
  const isLastTab       = activeTab === 2;
  const footerLabel     = isLastTab ? "↺ Play again" : "Next: " + tabs[activeTab + 1] + " →";

  return (
    <div style={{ margin: "28px 0", borderRadius: 12, overflow: "hidden", border: "1px solid #27272a", background: "#09090b" }}>

      {/* Tab bar */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", padding: "8px 12px", background: "#111113", borderBottom: "1px solid #27272a" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 24, borderRadius: 6, background: "#1e1e20", border: "1px solid #27272a", marginRight: 10, flexShrink: 0 }}>
          <span style={{ fontFamily: mono, fontSize: 11, color: "#71717a", userSelect: "none" }}>{">"}_</span>
        </div>
        {tabs.map((tab, i) => {
          const active = i === activeTab;
          return (
            <button key={tab} onClick={() => reset(i)} style={{
              fontFamily: mono, fontSize: 12,
              fontWeight: active ? 600 : 400,
              color: active ? "#e4e4e7" : "#52525b",
              background: active ? "#1e1e20" : "transparent",
              border: active ? "1px solid #27272a" : "1px solid transparent",
              borderRadius: 6, cursor: "pointer",
              padding: "3px 12px", marginRight: 2,
            }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = "#a1a1aa"; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = "#52525b"; }}>
              {tab}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <button onClick={() => reset(activeTab)} title="Reset" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 24, borderRadius: 6, background: "transparent", border: "1px solid transparent", cursor: "pointer", color: "#3f3f46", fontSize: 15, lineHeight: 1 }}
          onMouseEnter={e => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.background = "#1e1e20"; e.currentTarget.style.borderColor = "#27272a"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#3f3f46"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>
          {"↺"}
        </button>
      </div>

      {/* Split pane */}
      <div style={{ height: 290, borderBottom: "1px solid #27272a", overflow: "hidden", display: "flex" }}>
        {/* Left — Agent */}
        <div style={{ flex: 1, borderRight: "1px solid #27272a", display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ padding: "7px 16px 5px", borderBottom: "1px solid #1c1c1e" }}>
            <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#3f3f46" }}>Agent</span>
          </div>
          <div ref={leftRef} style={{ flex: 1, overflowY: "hidden", padding: "12px 16px" }}>
            {leftLines.map(renderLine)}
            {showConnectBtns && (
              <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontFamily: mono, fontSize: 12, color: "#52525b", marginRight: 6 }}>  pick:</span>
                <button style={btnBase} onMouseEnter={onBtnEnter} onMouseLeave={onBtnLeave} onClick={() => pickConnect("claude")}>Claude Code</button>
                <button style={btnBase} onMouseEnter={onBtnEnter} onMouseLeave={onBtnLeave} onClick={() => pickConnect("desktop")}>Claude Desktop</button>
                <button style={btnBase} onMouseEnter={onBtnEnter} onMouseLeave={onBtnLeave} onClick={() => pickConnect("chatgpt")}>ChatGPT</button>
              </div>
            )}
            {showActionBtns && (
              <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontFamily: mono, fontSize: 12, color: "#52525b", marginRight: 6 }}>  pick:</span>
                <button style={btnBase} onMouseEnter={onBtnEnter} onMouseLeave={onBtnLeave} onClick={() => pickAction("send")}>Send USDC</button>
                <button style={btnBase} onMouseEnter={onBtnEnter} onMouseLeave={onBtnLeave} onClick={() => pickAction("swap")}>Swap tokens</button>
              </div>
            )}
            {running && <div style={{ fontFamily: mono, fontSize: 12, lineHeight: "20px", color: "#60a5fa", opacity: blink ? 1 : 0 }}>{"▋"}</div>}
          </div>
        </div>
        {/* Right — Config/Response */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ padding: "7px 16px 5px", borderBottom: "1px solid #1c1c1e" }}>
            <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#3f3f46" }}>{rightLabels[activeTab]}</span>
          </div>
          <div ref={rightRef} style={{ flex: 1, overflowY: "hidden", padding: "12px 16px" }}>
            {rightLines.map(renderLine)}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "8px 16px", display: "flex", justifyContent: "center", minHeight: 37, alignItems: "center" }}>
        {done && (
          <button onClick={() => isLastTab ? reset(0) : reset(activeTab + 1)}
            style={{ fontFamily: mono, fontSize: 11, color: "#52525b", background: "none", border: "none", cursor: "pointer", padding: "4px 10px", borderRadius: 4 }}
            onMouseEnter={e => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.background = "#18181b"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#52525b"; e.currentTarget.style.background = "none"; }}>
            {footerLabel}
          </button>
        )}
      </div>
    </div>
  );
};
