import { useState, useEffect, useRef } from "react";

export const WalletSetupDemo = () => {
  const mono = "ui-monospace,'Cascadia Code','Source Code Pro',Menlo,Monaco,Consolas,monospace";
  const col = { dim: "#3f3f46", muted: "#52525b", active: "#60a5fa", success: "#34d399", code: "#d4d4d8", warn: "#fb923c" };

  // Single-pane: all content flows in one stream. Config lines are indented/styled differently.
  const flows = {
    desktop: [
      { delay: 450, lines: [{ t: "── claude_desktop_config.json ──────────", c: "dim" }] },
      { delay: 300, lines: [
        { t: '{  "mcpServers": {', c: "code" },
        { t: '    "base-account": {', c: "code" },
        { t: '      "url": "https://mcp.base.org"', c: "code" },
        { t: '    }  }  }', c: "code" },
      ]},
      { delay: 600, lines: [{ t: "  Restart Claude Desktop →", c: "muted" }] },
      { delay: 700, lines: [{ t: "  ✓ base-account MCP connected", c: "success" }] },
      { delay: 500, lines: [{ t: "", c: "dim" }, { t: "> What's my USDC balance?", c: "active" }] },
      { delay: 650, lines: [{ t: "  ← get_portfolio(chain=base)", c: "muted" }] },
      { delay: 500, lines: [
        { t: "  USDC    245.80   $245.80", c: "success" },
        { t: "  ETH     0.0412   $148.33", c: "success" },
        { t: "  Total:  $394.13 on Base  ✓", c: "success" },
      ]},
    ],
    chatgpt: [
      { delay: 450, lines: [{ t: "  Settings → Connectors → Add custom connector", c: "muted" }] },
      { delay: 500, lines: [{ t: "  Enter URL: https://mcp.base.org", c: "active" }] },
      { delay: 600, lines: [{ t: "  ✓ base-account connector saved", c: "success" }] },
      { delay: 500, lines: [{ t: "", c: "dim" }, { t: "> Send 5 USDC to alice.base.eth", c: "active" }] },
      { delay: 600, lines: [{ t: "  ← Authorization via keys.coinbase.com", c: "warn" }] },
      { delay: 500, lines: [
        { t: "  Open to connect your Base Account:", c: "warn" },
        { t: "  keys.coinbase.com/authorize", c: "warn" },
      ]},
      { delay: 900, lines: [{ t: "  ✓ Base Account connected  0x4a3f...b7c1", c: "success" }] },
      { delay: 600, lines: [{ t: "  ← approval required for this send", c: "warn" }] },
      { delay: 500, lines: [
        { t: "  Open to approve: keys.coinbase.com/…", c: "warn" },
      ]},
      { delay: 900, lines: [{ t: "  ✓ 5 USDC sent to alice.base.eth", c: "success" }] },
    ],
    claude: [
      { delay: 450, lines: [{ t: "> claude mcp add --transport http base-account https://mcp.base.org", c: "active" }] },
      { delay: 600, lines: [
        { t: "  ✓ MCP server added: base-account", c: "success" },
        { t: "  ── .claude/settings.json updated", c: "dim" },
      ]},
      { delay: 500, lines: [{ t: "", c: "dim" }, { t: "> Show me my wallets", c: "active" }] },
      { delay: 600, lines: [{ t: "  ← Connecting to mcp.base.org…", c: "muted" }] },
      { delay: 500, lines: [
        { t: "  Authorize at: keys.coinbase.com/authorize", c: "warn" },
      ]},
      { delay: 900, lines: [{ t: "  ✓ Base Account: 0x4a3f...b7c1  ready", c: "success" }] },
      { delay: 500, lines: [
        { t: '  { type: "base-account", inSession: true }', c: "code" },
        { t: '  { type: "agent-wallet", inSession: false }', c: "code" },
      ]},
    ],
    codex: [
      { delay: 450, lines: [{ t: "> codex mcp add base-account --url https://mcp.base.org/", c: "active" }] },
      { delay: 600, lines: [
        { t: "  ✓ MCP server added: base-account", c: "success" },
        { t: "  ── codex.toml updated", c: "dim" },
      ]},
      { delay: 500, lines: [{ t: "[mcp_servers.base-account]", c: "code" }, { t: 'url = "https://mcp.base.org/"', c: "code" }] },
      { delay: 600, lines: [{ t: "", c: "dim" }, { t: "> Show me my wallets", c: "active" }] },
      { delay: 700, lines: [{ t: "  ✓ Base Account: 0x4a3f...b7c1  inSession=true", c: "success" }] },
    ],
  };

  const [choice, setChoice]   = useState(null);
  const [lines, setLines]     = useState([{ t: "> Choose your platform:", c: "muted" }]);
  const [running, setRunning] = useState(false);
  const [done, setDone]       = useState(false);
  const [blink, setBlink]     = useState(true);
  const ref = useRef(null);

  useEffect(() => { const t = setInterval(() => setBlink(b => !b), 530); return () => clearInterval(t); }, []);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [lines]);

  const reset = () => { setChoice(null); setLines([{ t: "> Choose your platform:", c: "muted" }]); setRunning(false); setDone(false); };

  const pick = (key) => {
    if (choice) return;
    const labels = { desktop: "Claude Desktop", chatgpt: "ChatGPT", claude: "Claude Code", codex: "Codex" };
    setChoice(key);
    setLines(prev => [...prev, { t: "  [" + labels[key] + "]", c: "active" }]);
    const steps = flows[key];
    setRunning(true);
    let i = 0;
    const next = () => {
      if (i >= steps.length) { setRunning(false); setDone(true); return; }
      const s = steps[i];
      setTimeout(() => { setLines(prev => [...prev, ...s.lines]); i++; next(); }, s.delay);
    };
    setTimeout(next, 200);
  };

  const renderLine = (item, i) => {
    if (!item.t) return <div key={i} style={{ height: 5 }} />;
    return <div key={i} style={{ fontFamily: mono, fontSize: 12, lineHeight: "20px", color: col[item.c] || col.code, whiteSpace: "pre" }}>{item.t}</div>;
  };

  const btnBase = { fontFamily: mono, fontSize: 12, color: "#60a5fa", background: "transparent", border: "1px solid #27272a", borderRadius: 4, cursor: "pointer", padding: "2px 10px", marginRight: 6, lineHeight: "20px" };
  const onEnter = (e) => { e.currentTarget.style.color = "#e4e4e7"; e.currentTarget.style.background = "#1c1c1e"; e.currentTarget.style.borderColor = "#3f3f46"; };
  const onLeave = (e) => { e.currentTarget.style.color = "#60a5fa"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#27272a"; };

  return (
    <div style={{ margin: "28px 0", borderRadius: 12, overflow: "hidden", border: "1px solid #27272a", background: "#09090b" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", background: "#111113", borderBottom: "1px solid #27272a" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 24, borderRadius: 6, background: "#1e1e20", border: "1px solid #27272a", marginRight: 10, flexShrink: 0 }}>
          <span style={{ fontFamily: mono, fontSize: 11, color: "#71717a", userSelect: "none" }}>{">"}_</span>
        </div>
        <span style={{ fontFamily: mono, fontSize: 12, color: "#52525b" }}>Connect mcp.base.org</span>
        <div style={{ flex: 1 }} />
        <button onClick={reset} title="Reset" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 24, borderRadius: 6, background: "transparent", border: "1px solid transparent", cursor: "pointer", color: "#3f3f46", fontSize: 15, lineHeight: 1 }}
          onMouseEnter={e => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.background = "#1e1e20"; e.currentTarget.style.borderColor = "#27272a"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#3f3f46"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>{"↺"}</button>
      </div>
      <div style={{ height: 280, borderBottom: "1px solid #27272a", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "7px 16px 5px", borderBottom: "1px solid #1c1c1e" }}>
          <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#3f3f46" }}>Terminal</span>
        </div>
        <div ref={ref} style={{ flex: 1, overflowY: "hidden", padding: "12px 16px" }}>
          {lines.map(renderLine)}
          {!choice && (
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
              {[["desktop", "Claude Desktop"], ["chatgpt", "ChatGPT"], ["claude", "Claude Code"], ["codex", "Codex"]].map(([k, l]) => (
                <button key={k} style={btnBase} onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={() => pick(k)}>{l}</button>
              ))}
            </div>
          )}
          {running && <div style={{ fontFamily: mono, fontSize: 12, lineHeight: "20px", color: "#60a5fa", opacity: blink ? 1 : 0 }}>{"▋"}</div>}
        </div>
      </div>
      <div style={{ padding: "8px 16px", display: "flex", justifyContent: "center", minHeight: 37, alignItems: "center" }}>
        {done && <button onClick={reset} style={{ fontFamily: mono, fontSize: 11, color: "#52525b", background: "none", border: "none", cursor: "pointer", padding: "4px 10px", borderRadius: 4 }}
          onMouseEnter={e => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.background = "#18181b"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#52525b"; e.currentTarget.style.background = "none"; }}>{"↺"} Play again</button>}
      </div>
    </div>
  );
};
