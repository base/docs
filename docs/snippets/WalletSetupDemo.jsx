export const WalletSetupDemo = () => {
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

  // Conversation script. Reveal pauses on an `approval` event until the user
  // confirms the transaction-review modal, then resumes. Every write action
  // (send, swap, deposit) drives the same generic modal purely through the
  // `preview` fields — read-only lookups (chains) never pause.
  const examples = [
    {
      prompt: "Send 5 USDC to jesse.base.eth",
      events: [
        { delay: 380, type: "thinking" },
        { delay: 460, type: "text", text: "I'll prepare a 5 USDC transfer and pause for your signature before anything is sent." },
        { delay: 650, type: "tool", tool: { server: "base-mcp", name: "send", desc: "Sends tokens from your Base Account to a recipient.", args: { recipient: "jesse.base.eth", asset: "USDC", amount: "5", chain: "base" } } },
        { delay: 520, type: "text", text: "Resolved jesse.base.eth → 0xd8dA…6045. Review and approve to send:" },
        { delay: 220, type: "approval", preview: {
          title: "Approve transaction", subtitle: "You are sending tokens from your account.",
          amount: "5 USDC", fiat: "$5.00",
          rows: [["From", "0x71Dc…7244", true], ["To", "jesse.base.eth", true], ["Network", "Base Vibenet", false]],
          meta: [["Est. network fee", "< $0.01"], ["Max total", "5 USDC + fee"]],
          confirm: "Confirm",
        } },
        { delay: 520, type: "confirm", text: "Sent 5 USDC to jesse.base.eth." },
      ],
    },
    {
      prompt: "Swap 0.05 ETH to USDC on Base",
      events: [
        { delay: 380, type: "thinking" },
        { delay: 460, type: "text", text: "I'll quote the swap and pause for your signature before it executes." },
        { delay: 650, type: "tool", tool: { server: "base-mcp", name: "swap", desc: "Swaps one token for another on Base.", args: { fromAsset: "ETH", toAsset: "USDC", amount: "0.05", chain: "base" } } },
        { delay: 520, type: "text", text: "Quote ready: 0.05 ETH → about 179.41 USDC. Review and approve to swap:" },
        { delay: 220, type: "approval", preview: {
          title: "Approve swap", subtitle: "You are swapping tokens on Base.",
          amount: "0.05 ETH", fiat: "~$179.50",
          rows: [["Receive", "179.41 USDC", false], ["From", "0x71Dc…7244", true], ["Network", "Base Vibenet", false]],
          meta: [["Est. network fee", "< $0.01"], ["Min received", "178.51 USDC"]],
          confirm: "Confirm swap",
        } },
        { delay: 520, type: "confirm", text: "Swapped 0.05 ETH → 179.41 USDC." },
      ],
    },
    {
      prompt: "Find the highest paying USDC yield on Base and deposit 100",
      events: [
        { delay: 380, type: "thinking" },
        { delay: 460, type: "text", text: "I'll compare USDC yields across Morpho and Moonwell, then deposit into the best one." },
        { delay: 650, type: "tool", tool: { server: "morpho", name: "query_vaults", desc: "Lists USDC vaults ranked by APY.", args: { chain: "base", asset: "USDC", sort: "apy_desc" } } },
        { delay: 620, type: "tool", tool: { server: "moonwell", name: "list_markets", desc: "Lists lending markets for an asset.", args: { asset: "USDC", chain: "base" } } },
        { delay: 460, type: "text", text: "Top USDC yields on Base right now:" },
        { delay: 220, type: "rows", cols: ["source", "apy", "detail"], rows: [
          ["Steakhouse USDC · Morpho", "8.42%", "$24.1M TVL · best"],
          ["Re7 USDC · Morpho", "7.91%", "$18.7M TVL"],
          ["USDC market · Moonwell", "5.13%", "$41.2M supplied"],
        ] },
        { delay: 620, type: "tool", tool: { server: "morpho", name: "prepare_deposit", desc: "Builds the deposit call for the chosen vault.", args: { vault: "Steakhouse USDC", amount: "100 USDC" } } },
        { delay: 520, type: "tool", tool: { server: "base-mcp", name: "send_calls", desc: "Batches approve + deposit into one signature.", args: { chain: "base", calls: "[approve, deposit]" } } },
        { delay: 220, type: "approval", preview: {
          title: "Approve deposit", subtitle: "You are depositing into a lending vault.",
          amount: "100 USDC", fiat: "~$100.00",
          rows: [["Vault", "Steakhouse USDC", false], ["Current APY", "8.42%", false], ["Network", "Base Vibenet", false]],
          meta: [["Est. network fee", "< $0.01"], ["Batched", "approve + deposit"]],
          confirm: "Confirm deposit",
        } },
        { delay: 520, type: "confirm", text: "Deposited 100 USDC into Steakhouse USDC — earning 8.42% APY." },
      ],
    },
    {
      prompt: "What chains are supported by Base MCP?",
      events: [
        { delay: 380, type: "thinking" },
        { delay: 460, type: "text", text: "Let me pull the networks your Base Account can reach through mcp.base.org." },
        { delay: 520, type: "tool", tool: { server: "base-mcp", name: "get_wallets", desc: "Lists wallets and their supported networks.", args: {} } },
        { delay: 460, type: "text", text: "Base MCP currently supports 7 mainnets and 1 testnet:" },
        { delay: 220, type: "rows", cols: ["network", "type"], rows: [
          ["Base", "Mainnet"],
          ["Arbitrum", "Mainnet"],
          ["Optimism", "Mainnet"],
          ["Polygon", "Mainnet"],
          ["BNB Chain", "Mainnet"],
          ["Avalanche", "Mainnet"],
          ["Ethereum", "Mainnet"],
          ["Base Sepolia", "Testnet"],
        ] },
      ],
    },
  ];

  const [activeIdx, setActiveIdx] = useState(null);
  const [eventIdx, setEventIdx] = useState(0);
  const [modalPreview, setModalPreview] = useState(null);
  const scrollRef = useRef(null);
  const timersRef = useRef([]);

  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [eventIdx, activeIdx]);
  useEffect(() => () => clearTimers(), []);

  // Schedule reveals from `start`; stop after queuing an approval event (waits for confirm).
  const scheduleFrom = (idx, start) => {
    let cum = 0;
    const events = examples[idx].events;
    for (let i = start; i < events.length; i++) {
      cum += events[i].delay;
      timersRef.current.push(setTimeout(() => setEventIdx(i + 1), cum));
      if (events[i].type === "approval") break;
    }
  };
  const pick = (idx) => { if (activeIdx !== null) return; setActiveIdx(idx); setEventIdx(0); clearTimers(); scheduleFrom(idx, 0); };
  const handleConfirm = () => { setModalPreview(null); if (activeIdx === null) return; clearTimers(); scheduleFrom(activeIdx, eventIdx); };
  const reset = () => { clearTimers(); setActiveIdx(null); setEventIdx(0); setModalPreview(null); };
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

  const ToolCard = ({ tool, running }) => (
    <div className="as-anim" style={{ border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, overflow: "hidden", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 600, color: C.ink }}>MCP Tool Call</span>
        <div style={{ flex: 1 }} />
        <StatusBadge running={running} />
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 12px" }}>
        <span style={{ width: 26, height: 26, borderRadius: 6, background: C.blueSoft, border: `1px solid ${C.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></svg>
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 600, color: C.ink, wordBreak: "break-word" }}><span style={{ color: C.sub }}>{tool.server} · </span>{tool.name}</div>
          {tool.desc && <div style={{ fontFamily: sans, fontSize: 12, color: C.sec, marginTop: 2, lineHeight: 1.4 }}>{tool.desc}</div>}
        </div>
      </div>
      <div style={{ padding: "0 12px 12px" }}>
        <div style={{ fontFamily: sans, fontSize: 10.5, fontWeight: 600, letterSpacing: ".5px", textTransform: "uppercase", color: C.sub, marginBottom: 5 }}>Arguments</div>
        <pre className="as-code" style={{ margin: 0, fontFamily: mono, fontSize: 11.5, lineHeight: 1.6, color: C.body, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, padding: "9px 11px", overflowX: "auto", whiteSpace: "pre" }}>
{"{\n"}{Object.entries(tool.args).map(([k, v], i, a) => (
  <span key={k}>{"  "}<span style={{ color: C.sec }}>"{k}"</span>: <span style={{ color: C.blue }}>{typeof v === "string" ? `"${v}"` : JSON.stringify(v)}</span>{i < a.length - 1 ? "," : ""}{"\n"}</span>
))}{"}"}
        </pre>
      </div>
    </div>
  );

  const ResultTable = ({ cols, rows }) => (
    <div className="as-anim" style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
      <div className="as-trow" style={{ display: "grid", gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))`, background: C.panel, borderBottom: `1px solid ${C.border}` }}>
        {cols.map((cn) => <span key={cn} style={{ fontFamily: mono, fontSize: 10.5, fontWeight: 600, color: C.sec, padding: "6px 10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cn}</span>)}
      </div>
      {rows.map((row, ri) => (
        <div key={ri} className="as-trow" style={{ display: "grid", gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))`, borderTop: ri ? `1px solid ${C.border}` : "none" }}>
          {row.map((cell, ci) => <span key={ci} style={{ fontFamily: mono, fontSize: 11.5, color: ci === 0 ? C.ink : C.body, fontWeight: ci === 0 ? 600 : 400, padding: "7px 10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cell}</span>)}
        </div>
      ))}
    </div>
  );

  const ApprovalButton = ({ preview }) => (
    <div className="as-anim" style={{ marginBottom: 12 }}>
      <button onClick={() => setModalPreview(preview)} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.blueSoft, border: `1px solid ${C.blue}`, borderRadius: 6, padding: "9px 14px", cursor: "pointer", color: C.blue, fontFamily: sans, fontSize: 13, fontWeight: 600 }}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
        Review &amp; sign
      </button>
    </div>
  );

  const Thinking = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: sans, fontSize: 13, color: C.sec, marginBottom: 12 }}>
      <span style={{ display: "inline-flex", gap: 3 }}>{[0, 1, 2].map((i) => <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: C.sec, animation: `as-pulse 1.2s infinite ${i * 0.18}s` }} />)}</span>
      Thinking
    </div>
  );

  const RespText = ({ children }) => (<div className="as-anim" style={{ fontFamily: sans, fontSize: 13.5, color: C.body, lineHeight: 1.55, marginBottom: 12 }}>{children}</div>);
  const Confirm = ({ text }) => (
    <div className="as-anim" style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: sans, fontSize: 13.5, color: C.body, lineHeight: 1.5 }}>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke={C.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 6 9 17l-5-5" /></svg>{text}
    </div>
  );

  const renderEvents = () => {
    if (!ex) return null;
    const shown = ex.events.slice(0, eventIdx);
    return shown.map((event, i) => {
      if (event.type === "thinking") return i < shown.length - 1 ? null : <Thinking key={i} />;
      if (event.type === "tool") { const hasLater = shown.slice(i + 1).some((e) => e.type !== "thinking"); return <ToolCard key={i} tool={event.tool} running={!hasLater} />; }
      if (event.type === "approval") return <ApprovalButton key={i} preview={event.preview} />;
      if (event.type === "text") return <RespText key={i}>{event.text}</RespText>;
      if (event.type === "rows") return <ResultTable key={i} cols={event.cols} rows={event.rows} />;
      if (event.type === "confirm") return <Confirm key={i} text={event.text} />;
      return null;
    });
  };

  // ---- generated transaction-review modal (light) ----
  // A single generic modal drives every variant (send, swap, deposit, and any
  // sign/permit preview) purely through `preview` fields: title, subtitle,
  // optional amount/fiat, rows [label,value,isMono], optional meta, confirm.
  const TxModal = ({ preview, onConfirm, onCancel }) => (
    <div onClick={onCancel} className="as-anim" style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(10,11,13,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ background: C.white, borderRadius: 8, border: `1px solid ${C.border}`, width: 360, maxWidth: "100%", maxHeight: "calc(100% - 16px)", overflowY: "auto", boxShadow: "0 24px 64px rgba(10,11,13,.24)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "16px 18px 12px" }}>
          <div>
            <div style={{ fontFamily: sans, fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", color: C.ink }}>{preview.title}</div>
            <div style={{ fontFamily: sans, fontSize: 12.5, color: C.sec, marginTop: 3, lineHeight: 1.4 }}>{preview.subtitle}</div>
          </div>
          <button onClick={onCancel} aria-label="Close" style={{ background: "transparent", border: "none", cursor: "pointer", color: C.sub, padding: 2, flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {preview.amount && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 18px", borderTop: `1px solid ${C.border}` }}>
            <span style={{ fontFamily: sans, fontSize: 12.5, color: C.sec }}>Amount</span>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: C.cerulean, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M15 9.5a3.5 3.5 0 1 0 0 5" /></svg>
              </span>
              <span style={{ textAlign: "right" }}>
                <span style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: C.ink }}>{preview.amount}</span>
                {preview.fiat && <span style={{ display: "block", fontFamily: mono, fontSize: 11.5, color: C.sub }}>{preview.fiat}</span>}
              </span>
            </span>
          </div>
        )}

        <div style={{ borderTop: `1px solid ${C.border}` }}>
          {preview.rows.map(([label, value, isMono], i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 18px", borderTop: i ? `1px solid ${C.border}` : "none" }}>
              <span style={{ fontFamily: sans, fontSize: 12.5, color: C.sec }}>{label}</span>
              <span style={{ fontFamily: isMono ? mono : sans, fontSize: isMono ? 12 : 12.5, fontWeight: isMono ? 500 : 600, color: C.ink, textAlign: "right", overflowWrap: "anywhere" }}>
                {label === "Network" && <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: C.cerulean, marginRight: 6 }} />}
                {value}
              </span>
            </div>
          ))}
        </div>

        {preview.meta && preview.meta.length > 0 && (
          <div style={{ borderTop: `1px solid ${C.border}`, background: C.panel }}>
            {preview.meta.map(([label, value], i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 18px" }}>
                <span style={{ fontFamily: sans, fontSize: 12, color: C.sec }}>{label}</span>
                <span style={{ fontFamily: mono, fontSize: 11.5, color: C.body, textAlign: "right", overflowWrap: "anywhere" }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderTop: `1px solid ${C.border}` }}>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke={C.blue} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
          <span style={{ fontFamily: sans, fontSize: 10.5, fontWeight: 600, letterSpacing: ".3px", color: C.blue }}>DEMO · not a real signature</span>
        </div>

        <div style={{ display: "flex", gap: 10, padding: "12px 18px 16px", borderTop: `1px solid ${C.border}` }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "11px 0", background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer", fontFamily: sans, fontSize: 13.5, fontWeight: 600, color: C.body }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "11px 0", background: C.blue, border: `1px solid ${C.blue}`, borderRadius: 6, cursor: "pointer", fontFamily: sans, fontSize: 13.5, fontWeight: 600, color: C.onBlue }}>{preview.confirm || "Confirm"}</button>
        </div>
      </div>
    </div>
  );

  const suggested = examples.map((e) => e.prompt);

  return (
    <div className="as" style={{ position: "relative", margin: "22px 0", maxWidth: 760, borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, overflow: "hidden", boxShadow: "0 1px 2px rgba(10,11,13,.04)" }}>
      {modalPreview && <TxModal preview={modalPreview} onConfirm={handleConfirm} onCancel={() => setModalPreview(null)} />}
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
              <div style={{ fontFamily: sans, fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: C.ink, lineHeight: 1.25 }}>Set up a wallet and take your first onchain actions</div>
              <div style={{ fontFamily: sans, fontSize: 13.5, color: C.sec, lineHeight: 1.5, marginTop: 8 }}>
                Ask the assistant to act on your Base Account through <span style={{ fontFamily: mono, fontSize: "0.92em", color: C.blue, background: C.blueSoft, padding: "1px 5px", borderRadius: 4 }}>mcp.base.org</span>. It pauses for your signature before anything leaves your wallet.
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
              <div style={{ flex: 1, minWidth: 0 }}>{renderEvents()}</div>
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
          <button className="as-send" aria-label="Send"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg></button>
        </div>
        <div style={{ textAlign: "center", marginTop: 8, fontFamily: sans, fontSize: 11, color: C.sub }}>Demo · write actions require a wallet signature — AI responses can make mistakes.</div>
      </div>
    </div>
  );
};
