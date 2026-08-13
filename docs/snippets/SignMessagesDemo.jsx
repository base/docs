export const SignMessagesDemo = () => {
  // No imports allowed in Mintlify snippets: useState/useEffect/useRef are injected globally.
  const sans = "'Base Sans','Inter Tight',Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  const mono = "'Base Mono','Roboto Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace";

  // Color roles map to CSS custom properties defined in the <style> block,
  // so a single dark-theme block flips the whole demo. Keep using C.* in
  // inline styles exactly as before.
  const C = {
    blue: "var(--wf-blue)", onBlue: "var(--wf-on-blue)", cerulean: "var(--wf-cerulean)",
    ink: "var(--wf-ink)", body: "var(--wf-body)", sec: "var(--wf-sec)", sub: "var(--wf-sub)",
    border: "var(--wf-border)", panel: "var(--wf-panel)", white: "var(--wf-surface)",
    success: "var(--wf-success)", error: "var(--wf-error)",
    blueSoft: "var(--wf-blue-soft)", successSoft: "var(--wf-success-soft)",
  };

  // Conversation script. Reveal pauses on an `approval` event until the user
  // confirms the signature-review modal, then resumes. Signing only — no funds
  // move for plain messages or SIWE; the permit grants a spending allowance.
  const examples = [
    {
      prompt: "Sign this message: I accept the terms of service",
      events: [
        { delay: 380, type: "thinking" },
        { delay: 460, type: "text", text: "I'll sign that message with your Base Account through the Base MCP. This is a plain text signature — no funds move." },
        { delay: 650, type: "tool", tool: { server: "base-mcp", name: "sign", desc: "Signs a plain text message with your Base Account (personal_sign).", args: { type: "personal_sign", message: "I accept the terms of service" } } },
        { delay: 520, type: "text", text: "Approve the signature to continue:" },
        { delay: 220, type: "approval", preview: {
          title: "Sign message", subtitle: "You are signing a plain text message. No funds move.",
          rows: [["Message", "I accept the terms of service", true], ["Account", "0x71Dc…7244", true], ["Network", "Base Vibenet", false]],
          meta: [["Method", "personal_sign"], ["Encoding", "utf-8"]],
          confirm: "Sign",
        } },
        { delay: 520, type: "text", text: "Signature generated:" },
        { delay: 220, type: "rows", cols: ["field", "value", "detail"], rows: [
          ["Status", "Signed", "returned to caller"],
          ["Signature", "0x4f2a…8c91", "65-byte ECDSA"],
          ["Method", "personal_sign", "EIP-191"],
        ] },
        { delay: 380, type: "confirm", text: "Message signed · sig 0x4f2a…c38e9b…8c91" },
      ],
    },
    {
      prompt: "Sign in to this app with my Base Account",
      events: [
        { delay: 380, type: "thinking" },
        { delay: 460, type: "text", text: "I'll sign you in to app.example.com using Sign-In with Ethereum (SIWE). This proves account ownership — no funds move." },
        { delay: 650, type: "tool", tool: { server: "base-mcp", name: "sign", desc: "Signs the SIWE authentication challenge (EIP-4361).", args: { type: "personal_sign", message: "SIWE challenge for app.example.com" } } },
        { delay: 520, type: "text", text: "Approve the sign-in signature:" },
        { delay: 220, type: "approval", preview: {
          title: "Sign in with Ethereum", subtitle: "You are signing a session login. No funds move.",
          rows: [["Message", "app.example.com wants you to sign in with your Base Account", true], ["Domain", "app.example.com", true], ["Account", "0x71Dc…7244", true], ["Network", "Base Vibenet", false]],
          meta: [["Standard", "EIP-4361"], ["Nonce", "a1b2c3d4"]],
          confirm: "Sign",
        } },
        { delay: 520, type: "text", text: "Signed in — session established:" },
        { delay: 220, type: "rows", cols: ["field", "value", "detail"], rows: [
          ["Status", "Signed in", "SIWE verified"],
          ["Domain", "app.example.com", "session issuer"],
          ["Session", "valid · 24h", "expires in 24 hours"],
        ] },
        { delay: 380, type: "confirm", text: "Signed in to app.example.com · session valid" },
      ],
    },
    {
      prompt: "Sign a Uniswap permit2 authorization",
      events: [
        { delay: 380, type: "thinking" },
        { delay: 460, type: "text", text: "I'll sign a Permit2 (EIP-712) authorization for Uniswap. No funds move now — this grants a spending allowance." },
        { delay: 650, type: "tool", tool: { server: "base-mcp", name: "sign", desc: "Signs typed EIP-712 data (Permit2 PermitSingle).", args: { type: "typed_data", primaryType: "PermitSingle", spender: "Uniswap", amount: "1000 USDC" } } },
        { delay: 520, type: "text", text: "Review the permit and approve:" },
        { delay: 220, type: "approval", preview: {
          title: "Sign permit", subtitle: "You are authorizing a token spending allowance via Permit2.",
          amount: "1000 USDC", fiat: "$1,000.00",
          rows: [["Spender", "Uniswap", false], ["Token", "USDC", false], ["Network", "Base Vibenet", false]],
          meta: [["Standard", "EIP-712 · Permit2"], ["Deadline", "30 min"], ["Nonce", "0"]],
          confirm: "Sign",
        } },
        { delay: 520, type: "text", text: "Permit signature returned:" },
        { delay: 220, type: "rows", cols: ["field", "value", "detail"], rows: [
          ["Status", "Signed", "typed data returned"],
          ["Spender", "Uniswap", "approved to spend"],
          ["Allowance", "1000 USDC", "expires in 30 min"],
        ] },
        { delay: 380, type: "confirm", text: "Permit2 signature returned for Uniswap" },
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
        <span className="wf-t-headline" style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>MCP tool call</span>
        <div style={{ flex: 1 }} />
        <StatusBadge running={running} />
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 12px" }}>
        <span style={{ width: 26, height: 26, borderRadius: 6, background: C.blueSoft, border: `1px solid ${C.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></svg>
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 600, color: C.ink, wordBreak: "break-word" }}><span style={{ color: C.sub }}>{tool.server} · </span>{tool.name}</div>
          {tool.desc && <div className="wf-t-body" style={{ color: C.sec, marginTop: 2 }}>{tool.desc}</div>}
        </div>
      </div>
      <div style={{ padding: "0 12px 12px" }}>
        <div className="wf-t-caption" style={{ color: C.sub, marginBottom: 5 }}>Arguments</div>
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
    <div className="wf-t-body" style={{ display: "flex", alignItems: "center", gap: 8, color: C.sec, marginBottom: 12 }}>
      <span style={{ display: "inline-flex", gap: 3 }}>{[0, 1, 2].map((i) => <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: C.sec, animation: `as-pulse 1.2s infinite ${i * 0.18}s` }} />)}</span>
      Thinking
    </div>
  );

  const RespText = ({ children }) => (<div className="as-anim wf-t-body" style={{ color: C.body, marginBottom: 12 }}>{children}</div>);
  const Confirm = ({ text }) => (
    <div className="as-anim wf-t-body" style={{ display: "flex", alignItems: "center", gap: 8, color: C.body }}>
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

  // ---- generated signature-review modal (light) ----
  const TxModal = ({ preview, onConfirm, onCancel }) => (
    <div onClick={onCancel} className="as-anim" style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(10,11,13,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ background: C.white, borderRadius: 8, border: `1px solid ${C.border}`, width: 360, maxWidth: "100%", maxHeight: "calc(100% - 16px)", overflowY: "auto", boxShadow: "0 24px 64px rgba(10,11,13,.24)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "16px 18px 12px" }}>
          <div>
            <div className="wf-t-headline" style={{ fontWeight: 600, color: C.ink }}>{preview.title}</div>
            <div className="wf-t-body" style={{ color: C.sec, marginTop: 3 }}>{preview.subtitle}</div>
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
          <span className="wf-t-footnote" style={{ fontWeight: 600, color: C.blue }}>DEMO · not a real signature</span>
        </div>

        <div style={{ display: "flex", gap: 10, padding: "12px 18px 16px", borderTop: `1px solid ${C.border}` }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "11px 0", background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer", fontFamily: sans, fontSize: 13.5, fontWeight: 600, color: C.body }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "11px 0", background: C.blue, border: `1px solid ${C.blue}`, borderRadius: 6, cursor: "pointer", fontFamily: sans, fontSize: 13.5, fontWeight: 600, color: C.onBlue }}>{preview.confirm || "Sign"}</button>
        </div>
      </div>
    </div>
  );

  const suggested = examples.map((e) => e.prompt);

  return (
    <div className="as" style={{ position: "relative", margin: "22px 0", maxWidth: 760, borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, overflow: "hidden", boxShadow: "var(--wf-shadow)" }}>
      {modalPreview && <TxModal preview={modalPreview} onConfirm={handleConfirm} onCancel={() => setModalPreview(null)} />}
      <style>{`
        /* ---- Base design system: color tokens (light) ---- */
        .as {
          --wf-sans: 'Base Sans','Inter Tight',Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
          --wf-sans-text: 'Base Sans Text','Inter',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
          --wf-mono: 'Base Mono','Roboto Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace;
          --wf-blue: #0000ff; --wf-on-blue: #ffffff; --wf-cerulean: #3c8aff;
          --wf-ink: #0a0b0d; --wf-body: #32353d; --wf-sec: #5b616e; --wf-sub: #717886; --wf-muted: #787878;
          --wf-border: #dee1e7; --wf-panel: #eef0f3; --wf-surface: #ffffff;
          --wf-success: #66c800; --wf-lime: #b6f569; --wf-error: #fc401f; --wf-warn: #ffd12f;
          --wf-blue-soft: rgba(0,0,255,.06); --wf-success-soft: rgba(102,200,0,.12); --wf-error-soft: rgba(252,64,31,.10);
          --wf-shadow: 0 1px 2px rgba(10,11,13,.04);
        }
        /* ---- Dark theme: system preference ---- */
        @media (prefers-color-scheme: dark) {
          .as {
            --wf-blue: #4d6bff; --wf-on-blue: #ffffff; --wf-cerulean: #6ea8ff;
            --wf-ink: #ffffff; --wf-body: #dee1e7; --wf-sec: #b1b7c3; --wf-sub: #8a91a0; --wf-muted: #787878;
            --wf-border: #2b2f36; --wf-panel: #17181b; --wf-surface: #0f1012;
            --wf-success: #7cd442; --wf-lime: #b6f569; --wf-error: #ff6a4d; --wf-warn: #ffd12f;
            --wf-blue-soft: rgba(77,107,255,.16); --wf-success-soft: rgba(124,212,66,.16); --wf-error-soft: rgba(255,106,77,.16);
            --wf-shadow: 0 1px 2px rgba(0,0,0,.4);
          }
        }
        /* ---- Dark theme: docs explicit toggle wins over system ---- */
        html.dark .as, :root[data-theme="dark"] .as, [data-theme="dark"] .as {
          --wf-blue: #4d6bff; --wf-on-blue: #ffffff; --wf-cerulean: #6ea8ff;
          --wf-ink: #ffffff; --wf-body: #dee1e7; --wf-sec: #b1b7c3; --wf-sub: #8a91a0; --wf-muted: #787878;
          --wf-border: #2b2f36; --wf-panel: #17181b; --wf-surface: #0f1012;
          --wf-success: #7cd442; --wf-lime: #b6f569; --wf-error: #ff6a4d; --wf-warn: #ffd12f;
          --wf-blue-soft: rgba(77,107,255,.16); --wf-success-soft: rgba(124,212,66,.16); --wf-error-soft: rgba(255,106,77,.16);
          --wf-shadow: 0 1px 2px rgba(0,0,0,.4);
        }
        /* ---- Light theme: docs explicit toggle wins over system dark ---- */
        html.light .as, :root[data-theme="light"] .as, [data-theme="light"] .as {
          --wf-blue: #0000ff; --wf-on-blue: #ffffff; --wf-cerulean: #3c8aff;
          --wf-ink: #0a0b0d; --wf-body: #32353d; --wf-sec: #5b616e; --wf-sub: #717886; --wf-muted: #787878;
          --wf-border: #dee1e7; --wf-panel: #eef0f3; --wf-surface: #ffffff;
          --wf-success: #66c800; --wf-lime: #b6f569; --wf-error: #fc401f; --wf-warn: #ffd12f;
          --wf-blue-soft: rgba(0,0,255,.06); --wf-success-soft: rgba(102,200,0,.12); --wf-error-soft: rgba(252,64,31,.10);
          --wf-shadow: 0 1px 2px rgba(10,11,13,.04);
        }

        /* ---- Base design system: text variants (mobile → md 768px) ---- */
        .wf-t-title2 { font-family: var(--wf-sans); font-weight: 400; letter-spacing: -0.02em; font-size: 20px; line-height: 28px; }
        .wf-t-title3 { font-family: var(--wf-sans); font-weight: 400; letter-spacing: -0.02em; font-size: 18px; line-height: 26px; }
        .wf-t-headline { font-family: var(--wf-sans); font-weight: 400; letter-spacing: -0.02em; font-size: 16px; line-height: 24px; }
        .wf-t-body { font-family: var(--wf-sans-text); font-weight: 400; letter-spacing: 0; font-size: 15px; line-height: 1.4; }
        .wf-t-caption { font-family: var(--wf-sans); font-weight: 500; letter-spacing: 0; text-transform: uppercase; font-size: 11px; line-height: 14px; }
        .wf-t-button { font-family: var(--wf-sans); font-weight: 400; letter-spacing: -0.01em; font-size: 15px; line-height: 1.4; }
        .wf-t-footnote { font-family: var(--wf-sans); font-weight: 400; letter-spacing: 0; font-size: 11px; line-height: 14px; }
        .wf-t-mono { font-family: var(--wf-mono); font-weight: 400; font-size: 11.5px; line-height: 1.5; }
        @media (min-width: 768px) {
          .wf-t-title2 { font-size: 24px; line-height: 32px; }
          .wf-t-title3 { font-size: 20px; line-height: 28px; }
          .wf-t-headline { font-size: 18px; line-height: 28px; }
          .wf-t-body { font-size: 16px; line-height: 1.4; }
          .wf-t-caption { font-size: 12px; line-height: 16px; }
          .wf-t-button { font-size: 16px; line-height: 1.4; }
          .wf-t-footnote { font-size: 12px; line-height: 16px; }
        }

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
              <div className="wf-t-title2" style={{ fontWeight: 600, color: C.ink }}>Sign messages and typed data on Base</div>
              <div className="wf-t-body" style={{ color: C.sec, marginTop: 8 }}>
                Ask the assistant to sign with your Base Account through <span style={{ fontFamily: mono, fontSize: "0.92em", color: C.blue, background: C.blueSoft, padding: "1px 5px", borderRadius: 4 }}>mcp.base.org</span>. It pauses for your approval before every signature.
              </div>
            </div>
            <div>
              <div className="wf-t-caption" style={{ color: C.sub, marginBottom: 9 }}>Suggested prompts</div>
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
              <div className="wf-t-body" style={{ maxWidth: "80%", background: C.panel, color: C.ink, border: `1px solid ${C.border}`, padding: "10px 14px", borderRadius: 8 }}>{ex.prompt}</div>
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
          <span className="wf-t-body" style={{ flex: 1, color: C.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Ask a question or describe what you want to build…</span>
          <span className="wf-t-footnote" style={{ color: C.sec, whiteSpace: "nowrap" }}>Sonnet 4.6</span>
          <button className="as-send" aria-label="Send"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg></button>
        </div>
        <div className="wf-t-footnote" style={{ textAlign: "center", marginTop: 8, color: C.sub }}>Demo · every signature requires your approval in Base Account — AI responses can make mistakes.</div>
      </div>
    </div>
  );
};
