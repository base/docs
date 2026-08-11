export const DataFetchingDemo = () => {
  // No imports allowed in Mintlify snippets: useState/useEffect/useRef are injected globally.
  const sans = "'Base Sans','Inter Tight',Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  const mono = "'Base Mono','Roboto Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace";

  // Locked Base palette — light product surface regardless of host docs theme.
  const C = {
    blue: "#0000ff", onBlue: "#ffffff", cerulean: "#3c8aff",
    ink: "#0a0b0d", body: "#32353d", sec: "#5b616e", sub: "#717886",
    border: "#dee1e7", panel: "#eef0f3", white: "#ffffff",
    success: "#66c800", error: "#fc401f",
    blueSoft: "rgba(0,0,255,.06)", successSoft: "rgba(102,200,0,.14)",
  };

  // Each example: a prompt, an assistant intro line, one MCP tool call
  // (args + tabular result), and a closing confirmation.
  const examples = [
    {
      prompt: "What's my USDC balance on Base?",
      intro: "I'll check your USDC balance using the Base MCP.",
      tool: {
        server: "base-mcp", name: "base_getErc20Balance",
        desc: "Gets the ERC-20 token balance for an address.",
        args: { tokenAddress: "0x833589fC...2913D", address: "0x8dA6...C6eB48" },
        cols: ["token", "balance", "decimals", "formatted"],
        rows: [["USDC", "1250000", "6", "1.250000"]],
      },
      outro: "You have 1.25 USDC on Base Vibenet.",
    },
    {
      prompt: "What tokens do I have in my wallet?",
      intro: "Let me pull your full portfolio on Base.",
      tool: {
        server: "base-mcp", name: "base_getPortfolio",
        desc: "Returns token balances and USD values for an address.",
        args: { address: "0x8dA6...C6eB48", chain: "base" },
        cols: ["token", "amount", "value"],
        rows: [
          ["USDC", "245.80", "$245.80"],
          ["ETH", "0.0412", "$148.33"],
          ["WETH", "0.0100", "$36.02"],
        ],
      },
      outro: "3 tokens found — total $430.15 on Base.",
    },
    {
      prompt: "What's my total balance across all chains?",
      intro: "I'll aggregate balances across supported networks.",
      tool: {
        server: "base-mcp", name: "base_getPortfolio",
        desc: "Returns balances across every supported network.",
        args: { address: "0x8dA6...C6eB48" },
        cols: ["network", "value", "tokens"],
        rows: [
          ["Base", "$430.15", "USDC · ETH · WETH"],
          ["Ethereum", "$284.20", "ETH · USDC"],
        ],
      },
      outro: "Total: $714.35 across all chains.",
    },
  ];

  // 0: user + thinking · 1: intro + tool(running) · 2: tool(success) + result · 3: confirm
  const DELAYS = [420, 780, 520];
  const [activeIdx, setActiveIdx] = useState(null);
  const [phase, setPhase] = useState(0);
  const scrollRef = useRef(null);
  const timersRef = useRef([]);

  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [phase, activeIdx]);
  useEffect(() => () => clearTimers(), []);

  const pick = (idx) => {
    if (activeIdx !== null) return;
    setActiveIdx(idx); setPhase(0); clearTimers();
    let cum = 0;
    DELAYS.forEach((d, i) => { cum += d; timersRef.current.push(setTimeout(() => setPhase(i + 1), cum)); });
  };
  const reset = () => { clearTimers(); setActiveIdx(null); setPhase(0); };
  const ex = activeIdx !== null ? examples[activeIdx] : null;

  const BaseAvatar = ({ size = 22 }) => (
    <img src="/images/brand/base-square-blue.svg" alt="" aria-hidden="true" style={{ width: size, height: size, flexShrink: 0 }} />
  );

  const StatusBadge = ({ running }) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: sans, fontSize: 11, fontWeight: 600, borderRadius: 5, padding: "2px 8px", color: running ? C.blue : C.success, background: running ? C.blueSoft : C.successSoft }}>
      {running
        ? <svg className="as-spin" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke={C.blue} strokeWidth="2.4" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.5" /></svg>
        : <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke={C.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
      {running ? "Running" : "Success"}
    </span>
  );

  const ToolCard = ({ tool, running, showResult }) => (
    <div className="as-anim" style={{ border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, overflow: "hidden", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", borderBottom: `1px solid ${C.border}`, background: C.white }}>
        <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 600, color: C.ink }}>MCP Tool Call</span>
        <div style={{ flex: 1 }} />
        <StatusBadge running={running} />
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 12px" }}>
        <span style={{ width: 26, height: 26, borderRadius: 6, background: C.blueSoft, border: `1px solid ${C.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></svg>
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 600, color: C.ink, wordBreak: "break-word" }}>
            <span style={{ color: C.sub }}>{tool.server} · </span>{tool.name}
          </div>
          <div style={{ fontFamily: sans, fontSize: 12, color: C.sec, marginTop: 2, lineHeight: 1.4 }}>{tool.desc}</div>
        </div>
      </div>
      <div style={{ padding: "0 12px 12px" }}>
        <div style={{ fontFamily: sans, fontSize: 10.5, fontWeight: 600, letterSpacing: ".5px", textTransform: "uppercase", color: C.sub, marginBottom: 5 }}>Arguments</div>
        <pre className="as-code" style={{ margin: 0, fontFamily: mono, fontSize: 11.5, lineHeight: 1.6, color: C.body, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, padding: "9px 11px", overflowX: "auto", whiteSpace: "pre" }}>
{"{\n"}{Object.entries(tool.args).map(([k, v], i, a) => (
  <span key={k}>{"  "}<span style={{ color: C.sec }}>"{k}"</span>: <span style={{ color: C.blue }}>"{v}"</span>{i < a.length - 1 ? "," : ""}{"\n"}</span>
))}{"}"}
        </pre>
        {showResult && (
          <div className="as-anim" style={{ marginTop: 11 }}>
            <div style={{ fontFamily: sans, fontSize: 10.5, fontWeight: 600, letterSpacing: ".5px", textTransform: "uppercase", color: C.sub, marginBottom: 5 }}>Result</div>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
              <div className="as-trow" style={{ display: "grid", gridTemplateColumns: `repeat(${tool.cols.length}, minmax(0, 1fr))`, background: C.panel, borderBottom: `1px solid ${C.border}` }}>
                {tool.cols.map((c) => <span key={c} style={{ fontFamily: mono, fontSize: 10.5, fontWeight: 600, color: C.sec, padding: "6px 10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c}</span>)}
              </div>
              {tool.rows.map((row, ri) => (
                <div key={ri} className="as-trow" style={{ display: "grid", gridTemplateColumns: `repeat(${tool.cols.length}, minmax(0, 1fr))`, borderTop: ri ? `1px solid ${C.border}` : "none" }}>
                  {row.map((cell, ci) => <span key={ci} style={{ fontFamily: mono, fontSize: 11.5, color: ci === 0 ? C.ink : C.body, fontWeight: ci === 0 ? 600 : 400, padding: "7px 10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cell}</span>)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const Thinking = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: sans, fontSize: 13, color: C.sec, marginBottom: 4 }}>
      <span style={{ display: "inline-flex", gap: 3 }}>
        {[0, 1, 2].map((i) => <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: C.sec, animation: `as-pulse 1.2s infinite ${i * 0.18}s` }} />)}
      </span>
      Thinking
    </div>
  );

  const suggested = examples.map((e) => e.prompt);

  return (
    <div className="as" style={{ margin: "22px 0", maxWidth: 760, borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, overflow: "hidden", boxShadow: "0 1px 2px rgba(10,11,13,.04)" }}>
      <style>{`
        .as, .as * { box-sizing: border-box; }
        @keyframes as-pulse { 0%,100% { opacity:.3; transform:scale(1);} 50% { opacity:1; transform:scale(1.3);} }
        @keyframes as-spin { to { transform: rotate(360deg); } }
        @keyframes as-in { from { opacity:0; transform: translateY(4px);} to { opacity:1; transform:none; } }
        .as-anim { animation: as-in .28s ease both; }
        .as-spin { animation: as-spin .9s linear infinite; transform-origin: center; }
        .as-body { min-height: 380px; max-height: 440px; overflow-y: auto; padding: 20px 22px; }
        .as-land { display: grid; grid-template-columns: 1fr 260px; gap: 22px; }
        .as-nav { display: flex; gap: 18px; }
        .as-send { width: 34px; height: 34px; border-radius: 6px; border: 1px solid ${C.blue}; background: ${C.blue}; color: #fff; display: inline-flex; align-items: center; justify-content: center; cursor: default; flex-shrink: 0; }
        .as-sugg { font-family: ${sans}; font-size: 12.5px; color: ${C.body}; background: ${C.white}; border: 1px solid ${C.border}; border-radius: 6px; padding: 9px 11px; text-align: left; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; transition: all .14s ease; }
        .as-sugg:hover { border-color: ${C.blue}; color: ${C.ink}; }
        @media (max-width: 640px) {
          .as-land { grid-template-columns: 1fr; gap: 16px; }
          .as-nav { display: none; }
          .as-body { padding: 16px 14px; }
          .as-code { font-size: 10.5px !important; }
          .as-trow span { font-size: 10.5px !important; padding: 6px 7px !important; }
        }
        @media (prefers-reduced-motion: reduce) { .as-anim, .as-spin { animation: none !important; } }
      `}</style>

      {/* Product header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: `1px solid ${C.border}`, background: C.white }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: sans, fontSize: 12, fontWeight: 600, color: C.sec }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.success }} />Base MCP
        </span>
        <div style={{ flex: 1 }} />
        {activeIdx !== null && (
          <button onClick={reset} title="Reset" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 24, borderRadius: 6, background: "transparent", border: `1px solid ${C.border}`, cursor: "pointer", color: C.sec }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
          </button>
        )}
      </div>

      {/* Conversation / landing */}
      <div ref={scrollRef} className="as-body">
        {!ex ? (
          <div className="as-land">
            <div>
              <div style={{ fontFamily: sans, fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: C.ink, lineHeight: 1.25 }}>How can I help you build on Base?</div>
              <div style={{ fontFamily: sans, fontSize: 13.5, color: C.sec, lineHeight: 1.5, marginTop: 8 }}>
                Ask the assistant to read onchain data through <span style={{ fontFamily: mono, fontSize: "0.92em", color: C.blue, background: C.blueSoft, padding: "1px 5px", borderRadius: 4 }}>mcp.base.org</span>. These examples are read-only — no approval required.
              </div>
            </div>
            <div>
              <div style={{ fontFamily: sans, fontSize: 10.5, fontWeight: 600, letterSpacing: ".6px", textTransform: "uppercase", color: C.sub, marginBottom: 9 }}>Suggested prompts</div>
              <div style={{ display: "grid", gap: 8 }}>
                {suggested.map((p, i) => (
                  <button key={i} className="as-sugg" onClick={() => pick(i)}>
                    <span style={{ flex: 1 }}>{p}</span>
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke={C.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
              <div style={{ maxWidth: "80%", background: C.panel, color: C.ink, border: `1px solid ${C.border}`, padding: "10px 14px", borderRadius: 8, fontFamily: sans, fontSize: 13.5, lineHeight: 1.45 }}>{ex.prompt}</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <BaseAvatar size={22} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {phase >= 1
                  ? <div className="as-anim" style={{ fontFamily: sans, fontSize: 13.5, color: C.body, lineHeight: 1.55, marginBottom: 12 }}>{ex.intro}</div>
                  : <Thinking />}
                {phase >= 1 && <ToolCard tool={ex.tool} running={phase < 2} showResult={phase >= 2} />}
                {phase >= 3 && (
                  <div className="as-anim" style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: sans, fontSize: 13.5, color: C.body, lineHeight: 1.5 }}>
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke={C.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 6 9 17l-5-5" /></svg>
                    {ex.outro}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Composer */}
      <div style={{ padding: "12px 16px 14px", borderTop: `1px solid ${C.border}`, background: C.white }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px 8px 12px" }}>
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke={C.sub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95L10.12 17.24" /></svg>
          <span style={{ flex: 1, fontFamily: sans, fontSize: 13.5, color: C.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Ask a question or describe what you want to build…</span>
          <span style={{ fontFamily: sans, fontSize: 12, color: C.sec, whiteSpace: "nowrap" }}>Sonnet 4.6</span>
          <button className="as-send" aria-label="Send">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
          </button>
        </div>
        <div style={{ textAlign: "center", marginTop: 8, fontFamily: sans, fontSize: 11, color: C.sub }}>
          Demo · read-only — AI responses can make mistakes. Verify important information.
        </div>
      </div>
    </div>
  );
};
