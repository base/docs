import { useState, useEffect, useRef } from "react";

export const WalletSetupDemo = () => {
  const sans  = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  const serif = "'Tiempos Headline','Iowan Old Style','Source Serif Pro',ui-serif,Georgia,serif";
  const mono  = "ui-monospace,'SF Mono','Cascadia Code',Menlo,Monaco,Consolas,monospace";

  const c = {
    bg:           "#1f1e1d",
    header:       "#262624",
    border:       "#34322f",
    inputBg:      "#2a2926",
    text:         "#f5f4ed",
    body:         "#e8e4dc",
    muted:        "#a8a39d",
    dim:          "#6b6663",
    accent:       "#D97757",
    bubble:       "#2c2b28",
    bubbleText:   "#f5f4ed",
    code:         "#e89972",
    codeBg:       "rgba(217,119,87,0.12)",
    toolBg:       "#272622",
    toolBorder:   "#3a3835",
    success:      "#a3c585",
  };

  const examples = [
    {
      prompt: "What's my USDC balance on Base?",
      tool:   { server: "base-account", action: "get_portfolio", args: { chain: "base" } },
      reply:  {
        intro: "Here's your portfolio on Base:",
        rows: [
          { token: "USDC",     amount: "245.80",  value: "$245.80" },
          { token: "ETH",      amount: "0.0412",  value: "$148.33" },
        ],
        total: "$394.13",
      },
    },
    {
      prompt: "Send 1 USDC to coinbase.base.eth",
      tool:   { server: "base-account", action: "send", args: { to: "coinbase.base.eth", amount: "1 USDC" } },
      reply:  {
        intro: "I prepared the transaction. Approve it to send:",
        approval: "keys.coinbase.com/approve/req_a4f7c2",
        confirm:  "Sent 1 USDC to coinbase.base.eth",
      },
    },
    {
      prompt: "Find the best USDC vault on Base by APY",
      tool:   { server: "morpho", action: "find_best_vault", args: { asset: "USDC", chain: "base" } },
      reply:  {
        intro: "Top USDC vaults on Base right now:",
        rows: [
          { token: "Steakhouse USDC", amount: "8.42% APY", value: "$24.1M TVL" },
          { token: "Re7 USDC",        amount: "7.91% APY", value: "$18.7M TVL" },
        ],
        total: null,
      },
    },
  ];

  const [activeIdx, setActiveIdx] = useState(null);   // which example is playing
  const [step, setStep]           = useState(0);      // 0=just user msg, 1=thinking, 2=tool, 3=intro, 4=details, 5=done
  const scrollRef = useRef(null);
  const timersRef = useRef([]);

  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [step, activeIdx]);
  useEffect(() => () => clearTimers(), []);

  const pick = (idx) => {
    if (activeIdx !== null) return;
    setActiveIdx(idx);
    setStep(0);
    clearTimers();
    const seq = [[350, 1], [600, 2], [800, 3], [600, 4], [500, 5]];
    let cumulative = 0;
    seq.forEach(([d, s]) => {
      cumulative += d;
      timersRef.current.push(setTimeout(() => setStep(s), cumulative));
    });
  };

  const reset = () => { clearTimers(); setActiveIdx(null); setStep(0); };

  const ex = activeIdx !== null ? examples[activeIdx] : null;

  // ----- UI bits -----

  const TrafficLights = () => (
    <div style={{ display: "flex", gap: 6, marginRight: 14 }}>
      <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ed6a5e", display: "inline-block" }} />
      <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#f5bf4f", display: "inline-block" }} />
      <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#61c554", display: "inline-block" }} />
    </div>
  );

  const UserBubble = ({ children }) => (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
      <div style={{
        maxWidth: "78%", background: c.bubble, color: c.bubbleText, padding: "12px 16px",
        borderRadius: 14, fontFamily: sans, fontSize: 14, lineHeight: 1.45,
        border: `1px solid ${c.toolBorder}`,
      }}>{children}</div>
    </div>
  );

  const ToolCall = ({ tool }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        background: c.toolBg, border: `1px solid ${c.toolBorder}`,
        borderRadius: 8, padding: "6px 11px",
      }}>
        <span style={{ width: 14, height: 14, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={c.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a4 4 0 0 0-5.4 0l-7 7a3.5 3.5 0 0 0 5 5l5.5-5.5"/>
            <path d="m11 8 5 5"/>
          </svg>
        </span>
        <span style={{ fontFamily: mono, fontSize: 12, color: c.muted }}>
          <span style={{ color: c.accent }}>{tool.server}</span>
          <span style={{ color: c.dim }}> · </span>
          <span style={{ color: c.body }}>{tool.action}</span>
          <span style={{ color: c.dim }}>(</span>
          {Object.entries(tool.args).map(([k, v], i, arr) => (
            <span key={k}>
              <span style={{ color: c.muted }}>{k}: </span>
              <span style={{ color: c.code }}>"{v}"</span>
              {i < arr.length - 1 && <span style={{ color: c.dim }}>, </span>}
            </span>
          ))}
          <span style={{ color: c.dim }}>)</span>
        </span>
      </div>
    </div>
  );

  const Thinking = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontFamily: sans, fontSize: 13, color: c.muted }}>
      <span style={{ display: "inline-flex", gap: 3 }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 5, height: 5, borderRadius: "50%", background: c.muted,
            opacity: 0.4, animation: `wsd-pulse 1.2s infinite ${i * 0.18}s`,
          }} />
        ))}
      </span>
      <span style={{ fontStyle: "italic" }}>Thinking</span>
    </div>
  );

  const ResponseText = ({ children }) => (
    <div style={{ fontFamily: serif, fontSize: 15, lineHeight: 1.55, color: c.body, marginBottom: 12 }}>{children}</div>
  );

  const ResponseRows = ({ rows }) => (
    <div style={{ marginBottom: 12 }}>
      {rows.map((r, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "baseline", gap: 12, padding: "5px 0",
          fontFamily: serif, fontSize: 14, color: c.body,
        }}>
          <span style={{ minWidth: 12, color: c.dim }}>•</span>
          <span style={{ flex: "0 0 auto", minWidth: 130, fontWeight: 500 }}>{r.token}</span>
          <span style={{
            fontFamily: mono, fontSize: 12.5, color: c.code,
            background: c.codeBg, padding: "1px 6px", borderRadius: 4,
          }}>{r.amount}</span>
          <span style={{ color: c.muted, fontSize: 13 }}>{r.value}</span>
        </div>
      ))}
    </div>
  );

  const ApprovalLink = ({ url }) => (
    <div style={{ marginBottom: 10 }}>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        background: c.toolBg, border: `1px solid ${c.toolBorder}`,
        borderRadius: 8, padding: "8px 12px",
        fontFamily: mono, fontSize: 12.5, color: c.accent,
      }}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        {url}
      </span>
    </div>
  );

  const Confirm = ({ text }) => (
    <div style={{
      fontFamily: serif, fontSize: 14, color: c.success,
      display: "flex", alignItems: "center", gap: 8, marginTop: 4,
    }}>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke={c.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5"/>
      </svg>
      {text}
    </div>
  );

  const Total = ({ value }) => (
    <div style={{
      fontFamily: serif, fontSize: 14.5, color: c.text, fontWeight: 600,
      paddingTop: 8, borderTop: `1px solid ${c.border}`, display: "flex", justifyContent: "space-between",
      maxWidth: 360,
    }}>
      <span>Total</span>
      <span style={{ color: c.success }}>{value}</span>
    </div>
  );

  const ChipBtn = ({ onClick, children }) => {
    const [hover, setHover] = useState(false);
    return (
      <button
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          fontFamily: sans, fontSize: 13, lineHeight: 1.35,
          color: hover ? c.text : c.body,
          background: hover ? c.toolBg : "transparent",
          border: `1px solid ${hover ? c.accent : c.toolBorder}`,
          borderRadius: 12, padding: "10px 14px",
          textAlign: "left", cursor: "pointer",
          transition: "all 0.15s ease",
        }}>
        {children}
      </button>
    );
  };

  return (
    <div style={{
      margin: "28px 0", borderRadius: 14, overflow: "hidden",
      border: `1px solid ${c.border}`, background: c.bg,
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
    }}>
      {/* keyframes */}
      <style>{`@keyframes wsd-pulse{0%,100%{opacity:0.3;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}`}</style>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center",
        padding: "11px 14px", background: c.header,
        borderBottom: `1px solid ${c.border}`,
      }}>
        <TrafficLights />
        <span style={{ fontFamily: sans, fontSize: 13, color: c.muted, fontWeight: 500 }}>
          Base wallet
        </span>
        <span style={{ fontFamily: sans, fontSize: 12, color: c.dim, marginLeft: 8 }}>▾</span>
        <div style={{ flex: 1 }} />
        {activeIdx !== null && (
          <button onClick={reset} title="Reset" style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 28, height: 24, borderRadius: 6, background: "transparent",
            border: "1px solid transparent", cursor: "pointer", color: c.dim,
          }}
            onMouseEnter={e => { e.currentTarget.style.color = c.text; e.currentTarget.style.borderColor = c.toolBorder; }}
            onMouseLeave={e => { e.currentTarget.style.color = c.dim; e.currentTarget.style.borderColor = "transparent"; }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>
          </button>
        )}
      </div>

      {/* Chat area */}
      <div ref={scrollRef} style={{ height: 360, overflowY: "auto", padding: "24px 28px 16px" }}>
        {!ex && (
          <div>
            <div style={{ fontFamily: serif, fontSize: 16, color: c.muted, marginBottom: 20, lineHeight: 1.5 }}>
              Try asking your assistant once <span style={{ fontFamily: mono, fontSize: 13, color: c.code, background: c.codeBg, padding: "1px 6px", borderRadius: 4 }}>mcp.base.org</span> is connected:
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {examples.map((e, i) => (
                <ChipBtn key={i} onClick={() => pick(i)}>{e.prompt}</ChipBtn>
              ))}
            </div>
          </div>
        )}

        {ex && (
          <>
            <UserBubble>{ex.prompt}</UserBubble>

            {step >= 1 && step < 3 && <Thinking />}
            {step >= 2 && <ToolCall tool={ex.tool} />}

            {step >= 3 && <ResponseText>{ex.reply.intro}</ResponseText>}

            {step >= 4 && ex.reply.rows && <ResponseRows rows={ex.reply.rows} />}
            {step >= 4 && ex.reply.total && <Total value={ex.reply.total} />}
            {step >= 4 && ex.reply.approval && <ApprovalLink url={ex.reply.approval} />}
            {step >= 5 && ex.reply.confirm && <Confirm text={ex.reply.confirm} />}
          </>
        )}
      </div>

      {/* Input area */}
      <div style={{ padding: "10px 16px 14px" }}>
        <div style={{
          display: "flex", alignItems: "center",
          background: c.inputBg, border: `1px solid ${c.toolBorder}`,
          borderRadius: 14, padding: "10px 14px",
        }}>
          <button style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 26, height: 26, borderRadius: 8, border: "none",
            background: "transparent", color: c.muted, cursor: "default", padding: 0,
          }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          </button>
          <span style={{
            flex: 1, marginLeft: 8, fontFamily: sans, fontSize: 14, color: c.dim,
          }}>
            Write a message...
          </span>
          <span style={{ fontFamily: sans, fontSize: 13, color: c.muted, marginRight: 12 }}>
            Sonnet 4.6 <span style={{ color: c.dim }}>▾</span>
          </span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={c.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
            <path d="M19 11a7 7 0 0 1-14 0"/>
            <line x1="12" y1="18" x2="12" y2="22"/>
          </svg>
        </div>
        <div style={{
          textAlign: "center", marginTop: 8, fontFamily: sans, fontSize: 11, color: c.dim,
        }}>
          Demo · Your assistant approves every transaction at <span style={{ color: c.muted }}>keys.coinbase.com</span>
        </div>
      </div>
    </div>
  );
};
