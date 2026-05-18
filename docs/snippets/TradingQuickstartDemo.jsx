
export const TradingQuickstartDemo = () => {
  const sans  = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  const serif = "'Tiempos Headline','Iowan Old Style','Source Serif Pro',ui-serif,Georgia,serif";
  const mono  = "ui-monospace,'SF Mono','Cascadia Code',Menlo,Monaco,Consolas,monospace";

  const c = {
    bg: "#1f1e1d", header: "#262624", border: "#34322f", inputBg: "#2a2926",
    text: "#f5f4ed", body: "#e8e4dc", muted: "#a8a39d", dim: "#6b6663",
    accent: "#D97757", bubble: "#2c2b28", bubbleText: "#f5f4ed",
    code: "#e89972", codeBg: "rgba(217,119,87,0.12)",
    toolBg: "#272622", toolBorder: "#3a3835", success: "#a3c585",
  };

  const examples = [
    {
      prompt: "Swap 100 USDC for ETH on Base",
      events: [
        { delay: 380, type: "thinking" },
        { delay: 600, type: "tool", tool: { server: "base-account", action: "swap", args: { fromAsset: "USDC", toAsset: "ETH", amount: "100", chain: "base" } } },
        { delay: 500, type: "text", text: "Quote ready: 0.03512 ETH · price impact 0.09%. Approve to swap:" },
        { delay: 250, type: "approval", url: "keys.coinbase.com/approve/req_swap01" },
        { delay: 1100, type: "confirm", text: "Swapped 100 USDC → 0.03512 ETH" },
      ],
    },
    {
      prompt: "Swap 0.05 ETH to USDC — best rate",
      events: [
        { delay: 380, type: "thinking" },
        { delay: 600, type: "tool", tool: { server: "aerodrome", action: "get_quote", args: { from: "0.05 ETH", to: "USDC" } } },
        { delay: 700, type: "tool", tool: { server: "uniswap-v3", action: "get_quote", args: { from: "0.05 ETH", to: "USDC" } } },
        { delay: 600, type: "text", text: "Routed across two Base DEXes — Uniswap v3 has the better fill:" },
        { delay: 250, type: "rows", rows: [
          { token: "Aerodrome",         amount: "178.92 USDC", value: "0.30% fee · slippage 0.18%" },
          { token: "Uniswap v3 (best)", amount: "179.41 USDC", value: "0.05% fee · slippage 0.12%" },
        ]},
        { delay: 700, type: "tool", tool: { server: "base-account", action: "swap", args: { route: "ETH→USDC", min_out: "179.20 USDC" } } },
        { delay: 450, type: "approval", url: "keys.coinbase.com/approve/req_swap02" },
        { delay: 1100, type: "confirm", text: "Swapped 0.05 ETH → 179.41 USDC on Uniswap v3" },
      ],
    },
    {
      prompt: "Convert 200 USDC to cbBTC",
      events: [
        { delay: 380, type: "thinking" },
        { delay: 550, type: "tool", tool: { server: "base-account", action: "search_tokens", args: { query: "cbBTC", chain: "base" } } },
        { delay: 500, type: "tool", tool: { server: "base-account", action: "swap", args: { fromAsset: "USDC", toAsset: "cbBTC", amount: "200", chain: "base" } } },
        { delay: 500, type: "text", text: "Quote ready: 0.00210 cbBTC at current rates. Approve to swap:" },
        { delay: 250, type: "approval", url: "keys.coinbase.com/approve/req_swap03" },
        { delay: 1100, type: "confirm", text: "Swapped 200 USDC → 0.00210 cbBTC" },
      ],
    },
  ];

  const [activeIdx, setActiveIdx] = useState(null);
  const [eventIdx, setEventIdx]   = useState(0);
  const scrollRef = useRef(null);
  const timersRef = useRef([]);

  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [eventIdx, activeIdx]);
  useEffect(() => () => clearTimers(), []);

  const pick = (idx) => {
    if (activeIdx !== null) return;
    setActiveIdx(idx);
    setEventIdx(0);
    clearTimers();
    let cumulative = 0;
    examples[idx].events.forEach((e, i) => {
      cumulative += e.delay;
      timersRef.current.push(setTimeout(() => setEventIdx(i + 1), cumulative));
    });
  };

  const reset = () => { clearTimers(); setActiveIdx(null); setEventIdx(0); };
  const ex = activeIdx !== null ? examples[activeIdx] : null;

  const TrafficLights = () => (
    <div style={{ display: "flex", gap: 6, marginRight: 14 }}>
      <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ed6a5e", display: "inline-block" }} />
      <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#f5bf4f", display: "inline-block" }} />
      <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#61c554", display: "inline-block" }} />
    </div>
  );

  const UserBubble = ({ children }) => (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
      <div className="tqd-bubble" style={{ background: c.bubble, color: c.bubbleText, padding: "12px 16px", borderRadius: 14, fontFamily: sans, lineHeight: 1.45, border: `1px solid ${c.toolBorder}` }}>{children}</div>
    </div>
  );

  const ToolCall = ({ tool, completed }) => (
    <div style={{ marginBottom: 10 }}>
      <div className="tqd-tool-chip" style={{ display: "inline-flex", alignItems: "flex-start", gap: 8, background: c.toolBg, border: `1px solid ${c.toolBorder}`, borderRadius: 8, padding: "6px 11px", opacity: completed ? 0.85 : 1 }}>
        <span style={{ width: 14, height: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
          {completed
            ? <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={c.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            : <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={c.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 0l-7 7a3.5 3.5 0 0 0 5 5l5.5-5.5"/><path d="m11 8 5 5"/></svg>}
        </span>
        <span className="tqd-tool-text" style={{ fontFamily: mono, color: c.muted }}>
          <span style={{ color: c.accent }}>{tool.server}</span>
          <span style={{ color: c.dim }}> · </span>
          <span style={{ color: c.body }}>{tool.action}</span>
          <span style={{ color: c.dim }}>(</span>
          {Object.entries(tool.args).map(([k, v], i, arr) => (
            <span key={k}><span style={{ color: c.muted }}>{k}: </span><span style={{ color: c.code }}>"{v}"</span>{i < arr.length - 1 && <span style={{ color: c.dim }}>, </span>}</span>
          ))}
          <span style={{ color: c.dim }}>)</span>
        </span>
      </div>
    </div>
  );

  const Thinking = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontFamily: sans, fontSize: 13, color: c.muted }}>
      <span style={{ display: "inline-flex", gap: 3 }}>
        {[0, 1, 2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: c.muted, opacity: 0.4, animation: `tqd-pulse 1.2s infinite ${i * 0.18}s` }} />)}
      </span>
      <span style={{ fontStyle: "italic" }}>Thinking</span>
    </div>
  );

  const ResponseText = ({ children, top }) => (
    <div style={{ fontFamily: serif, fontSize: 15, lineHeight: 1.55, color: c.body, marginBottom: 12, marginTop: top ? 8 : 0 }}>{children}</div>
  );

  const ResponseRows = ({ rows }) => (
    <div style={{ marginBottom: 14 }}>
      {rows.map((r, i) => (
        <div key={i} className="tqd-row" style={{ display: "flex", alignItems: "baseline", padding: "5px 0", fontFamily: serif, fontSize: 14, color: c.body }}>
          <span style={{ minWidth: 12, color: c.dim, flexShrink: 0 }}>•</span>
          <span className="tqd-row-token" style={{ fontWeight: 500 }}>{r.token}</span>
          <span style={{ fontFamily: mono, fontSize: 12.5, color: c.code, background: c.codeBg, padding: "1px 6px", borderRadius: 4, whiteSpace: "nowrap" }}>{r.amount}</span>
          <span style={{ color: c.muted, fontSize: 13 }}>{r.value}</span>
        </div>
      ))}
    </div>
  );

  const ApprovalLink = ({ url }) => (
    <div style={{ marginBottom: 10, marginTop: 4 }}>
      <span className="tqd-approval" style={{ display: "inline-flex", alignItems: "flex-start", gap: 8, background: c.toolBg, border: `1px solid ${c.accent}`, borderRadius: 8, padding: "9px 13px", fontFamily: mono, color: c.accent, boxShadow: `0 0 0 3px rgba(217,119,87,0.08)`, maxWidth: "100%" }}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>{url}</span>
      </span>
    </div>
  );

  const Confirm = ({ text }) => (
    <div style={{ fontFamily: serif, fontSize: 14, color: c.success, display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke={c.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      {text}
    </div>
  );

  const ChipBtn = ({ onClick, children }) => {
    const [hover, setHover] = useState(false);
    return (
      <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} className="tqd-chip"
        style={{ fontFamily: serif, lineHeight: 1.4, color: hover ? c.text : c.body, background: hover ? c.toolBg : c.header, border: `1px solid ${hover ? c.accent : c.toolBorder}`, borderRadius: 14, textAlign: "left", cursor: "pointer", transition: "all 0.15s ease", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, width: "100%" }}>
        <span style={{ flex: 1 }}>{children}</span>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={hover ? c.accent : c.dim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: "stroke 0.15s ease, transform 0.15s ease", transform: hover ? "translateX(2px)" : "translateX(0)" }}><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </button>
    );
  };

  const renderEvents = () => {
    if (!ex) return null;
    const shown = ex.events.slice(0, eventIdx);
    return shown.map((event, i) => {
      if (event.type === "thinking") {
        if (i < shown.length - 1) return null;
        return <Thinking key={i} />;
      }
      if (event.type === "tool") {
        const hasLater = shown.slice(i + 1).some(e => e.type !== "thinking");
        return <ToolCall key={i} tool={event.tool} completed={hasLater} />;
      }
      if (event.type === "text")     return <ResponseText key={i} top>{event.text}</ResponseText>;
      if (event.type === "rows")     return <ResponseRows key={i} rows={event.rows} />;
      if (event.type === "approval") return <ApprovalLink key={i} url={event.url} />;
      if (event.type === "confirm")  return <Confirm key={i} text={event.text} />;
      return null;
    });
  };

  return (
    <div style={{ margin: "28px 0", borderRadius: 14, overflow: "hidden", border: `1px solid ${c.border}`, background: c.bg, boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
      <style>{`
        @keyframes tqd-pulse{0%,100%{opacity:0.3;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}
        .tqd-chat{height:400px;padding:24px 28px 16px}
        .tqd-input-row{padding:10px 16px 14px}
        .tqd-tool-text{white-space:nowrap;font-size:12px;line-height:1.4}
        .tqd-tool-chip{max-width:100%}
        .tqd-row{gap:12px;flex-wrap:nowrap}
        .tqd-row-token{min-width:170px}
        .tqd-bubble{max-width:78%;font-size:14px}
        .tqd-approval{font-size:12.5px}
        .tqd-chip{padding:16px 18px;font-size:15px}
        .tqd-empty-text{font-size:16px}
        .tqd-footnote{font-size:11px}
        @media(max-width:640px){
          .tqd-chat{height:460px;padding:16px 14px 12px}
          .tqd-input-row{padding:8px 10px 10px}
          .tqd-tool-chip{display:block}
          .tqd-tool-text{white-space:normal;word-break:break-word;font-size:11px}
          .tqd-row{flex-wrap:wrap;gap:4px 10px}
          .tqd-row-token{min-width:100%;flex:1 1 100%}
          .tqd-bubble{max-width:88%;font-size:13.5px}
          .tqd-approval{font-size:11.5px;word-break:break-all}
          .tqd-chip{padding:14px 14px;font-size:14px}
          .tqd-empty-text{font-size:14.5px}
          .tqd-footnote{font-size:10.5px}
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", padding: "11px 14px", background: c.header, borderBottom: `1px solid ${c.border}` }}>
        <TrafficLights />
        <span style={{ fontFamily: sans, fontSize: 13, color: c.muted, fontWeight: 500 }}>Base wallet</span>
        <span style={{ fontFamily: sans, fontSize: 12, color: c.dim, marginLeft: 8 }}>▾</span>
        <div style={{ flex: 1 }} />
        {activeIdx !== null && (
          <button onClick={reset} title="Reset" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 24, borderRadius: 6, background: "transparent", border: "1px solid transparent", cursor: "pointer", color: c.dim }}
            onMouseEnter={e => { e.currentTarget.style.color = c.text; e.currentTarget.style.borderColor = c.toolBorder; }}
            onMouseLeave={e => { e.currentTarget.style.color = c.dim; e.currentTarget.style.borderColor = "transparent"; }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>
          </button>
        )}
      </div>

      <div ref={scrollRef} className="tqd-chat" style={{ overflowY: "auto" }}>
        {!ex && (
          <div>
            <div className="tqd-empty-text" style={{ fontFamily: serif, color: c.muted, marginBottom: 20, lineHeight: 1.5 }}>
              Swap any token on Base once <span style={{ fontFamily: mono, fontSize: "0.85em", color: c.code, background: c.codeBg, padding: "1px 6px", borderRadius: 4 }}>mcp.base.org</span> is connected:
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {examples.map((e, i) => <ChipBtn key={i} onClick={() => pick(i)}>{e.prompt}</ChipBtn>)}
            </div>
          </div>
        )}
        {ex && <><UserBubble>{ex.prompt}</UserBubble>{renderEvents()}</>}
      </div>

      <div className="tqd-input-row">
        <div style={{ display: "flex", alignItems: "center", background: c.inputBg, border: `1px solid ${c.toolBorder}`, borderRadius: 14, padding: "10px 14px" }}>
          <button style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 8, border: "none", background: "transparent", color: c.muted, cursor: "default", padding: 0, flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          </button>
          <span style={{ flex: 1, marginLeft: 8, fontFamily: sans, fontSize: 14, color: c.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Write a message...</span>
          <span style={{ fontFamily: sans, fontSize: 13, color: c.muted, marginRight: 12, flexShrink: 0 }}>Sonnet 4.6 <span style={{ color: c.dim }}>▾</span></span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={c.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 11a7 7 0 0 1-14 0"/><line x1="12" y1="18" x2="12" y2="22"/></svg>
        </div>
        <div className="tqd-footnote" style={{ textAlign: "center", marginTop: 8, fontFamily: sans, color: c.dim }}>
          Demo · Every swap requires your approval at <span style={{ color: c.muted }}>keys.coinbase.com</span>
        </div>
      </div>
    </div>
  );
};
