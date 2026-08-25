
// Auth approval demo — mock of the Base Account Allow modal shown
// on first wallet-tool use. The client name is hardcoded because Mintlify
// does not expose the active <Tab> selection to JSX snippets. (Cross-tab
// sync would require wrapping this in another visible Tabs block.)
export const AuthApprovalDemo = ({ client = "Claude" }) => {
  const sans = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";

  const c = {
    bg:          "#0a0a0a",
    cardBorder:  "#1c1c1c",
    rowBorder:   "#1f1f1f",
    text:        "#ffffff",
    muted:       "#9a9a9a",
    dim:         "#6b6b6b",
    accent:      "#a796f7",
    accentRing:  "#c8bcff",
    btnDark:     "#1c1c1c",
    iconBlue:    "#2a64ff",
    iconBlue2:   "#5b8eff",
    permIconBg:  "#1c1c1c",
    permIconFg:  "#d2d2d2",
  };

  const permissions = [
    { label: "View address, balances & activity." },
    { label: "Prepare transactions for you to review." }
  ];

  const EyeIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={c.permIconFg} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
  const SendIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={c.permIconFg} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2 11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
    </svg>
  );
  const SignIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={c.permIconFg} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
    </svg>
  );
  const ChainIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={c.permIconFg} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5"/>
      <path d="M14 11a5 5 0 0 0-7-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5"/>
    </svg>
  );
  const icons = [<EyeIcon />, <SendIcon />, <SignIcon />, <ChainIcon />];

  return (
    <div style={{ margin: "28px 0", fontFamily: sans }}>
      <style>{`
        .aad-card  { max-width: 420px; margin: 0 auto; }
        .aad-title { font-size: 23px; line-height: 1.22; letter-spacing: -0.01em; }
        .aad-body  { padding: 28px 24px 36px; }
        .aad-perm-list { display: flex; flex-direction: column; gap: 16px; margin-bottom: 96px; }
        .aad-foot  { padding: 0 20px 22px; }
        .aad-btn   { font-size: 15px; font-weight: 700; padding: 14px 0; border-radius: 12px; }

        @media (max-width: 540px) {
          .aad-card  { max-width: 100%; }
          .aad-title { font-size: 19px; }
          .aad-body  { padding: 22px 18px 28px; }
          .aad-perm-list { gap: 14px; margin-bottom: 72px; }
          .aad-foot  { padding: 0 16px 18px; }
          .aad-btn   { font-size: 14px; padding: 12px 0; }
          .aad-perm-text { font-size: 14px !important; }
          .aad-signed { padding: 14px 18px !important; font-size: 13px !important; }
        }
      `}</style>

      <div className="aad-card" style={{
        background: c.bg,
        border: `1px solid ${c.cardBorder}`,
        borderRadius: 18,
        color: c.text,
        boxShadow: "0 16px 48px rgba(0,0,0,0.45)",
        overflow: "hidden",
      }}>
        {/* Signed-in row */}
        <div className="aad-signed" style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "16px 22px",
          borderBottom: `1px solid ${c.rowBorder}`,
          fontSize: 14,
        }}>
          <span style={{
            display: "inline-block", width: 14, height: 14,
            background: "#fff", borderRadius: 3, flexShrink: 0,
          }} />
          <span style={{ color: c.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Signed in as <span style={{ color: c.text, fontWeight: 700 }}>0x71Dc…7244</span>
          </span>
        </div>

        {/* Body */}
        <div className="aad-body">
          {/* Icons */}
          <div style={{ display: "flex", marginBottom: 22 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: `radial-gradient(circle at 30% 30%, ${c.iconBlue2}, ${c.iconBlue})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 0 3px ${c.bg}`,
              position: "relative", zIndex: 2,
            }}>
              <svg viewBox="0 0 32 32" width="34" height="34" fill="#fff">
                <path d="M16 5c-2.4 0-4.4 1-5.7 2.7-.7-.5-1.7-.7-2.6-.4-1.4.4-2.2 1.9-1.8 3.3.1.3.2.6.4.8C5 12.1 4 13.5 4 15.4c0 1.9 1 3.4 2.3 4.1-.2.2-.3.5-.4.8-.4 1.4.4 2.9 1.8 3.3.9.3 1.9.1 2.6-.4C11.6 24.9 13.6 26 16 26s4.4-1.1 5.7-2.8c.7.5 1.7.7 2.6.4 1.4-.4 2.2-1.9 1.8-3.3-.1-.3-.2-.6-.4-.8 1.3-.7 2.3-2.2 2.3-4.1 0-1.9-1-3.3-2.3-4 .2-.3.3-.5.4-.8.4-1.4-.4-2.9-1.8-3.3-.9-.3-1.9-.1-2.6.4C20.4 6 18.4 5 16 5z"/>
                <circle cx="12.5" cy="16" r="2" fill={c.iconBlue}/>
                <circle cx="19.5" cy="16" r="2" fill={c.iconBlue}/>
              </svg>
            </div>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: c.iconBlue,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginLeft: -14,
              boxShadow: `0 0 0 3px ${c.bg}`,
            }}>
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none">
                <rect x="3" y="6" width="18" height="13" rx="2.5" fill="#fff" opacity="0.95"/>
                <rect x="3" y="9" width="18" height="2.5" fill={c.iconBlue}/>
              </svg>
            </div>
          </div>

          <h3 className="aad-title" style={{
            fontWeight: 700,
            margin: "0 0 10px 0",
            color: c.text,
          }}>
            Allow {client} to access your account.
          </h3>

          <p style={{
            fontSize: 14, color: c.muted,
            margin: "0 0 26px 0", lineHeight: 1.5,
          }}>
            By continuing, you allow {client} to:
          </p>

          <div className="aad-perm-list">
            {permissions.map((p, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 14,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: c.permIconBg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {icons[i]}
                </div>
                <span className="aad-perm-text" style={{ fontSize: 15, color: c.text, lineHeight: 1.4 }}>
                  {p.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="aad-foot" style={{
          display: "flex", gap: 10,
          position: "relative",
        }}>
          <button className="aad-btn" style={{
            flex: 1, background: c.btnDark, border: "none",
            color: c.text, cursor: "default", fontFamily: sans,
          }}>Learn More</button>
          <button className="aad-btn" style={{
            flex: 1, background: c.accent,
            border: `2px solid ${c.accentRing}`,
            color: "#0a0a0a", cursor: "default", fontFamily: sans,
            boxShadow: "0 0 0 1px rgba(167,150,247,0.3)",
          }}>Allow</button>
          <span style={{
            position: "absolute", right: 12, bottom: -2,
            color: c.accent, opacity: 0.8,
            display: "inline-flex", padding: 4,
          }}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </span>
        </div>
      </div>

      <div style={{
        textAlign: "center", marginTop: 12,
        fontFamily: sans, fontSize: 12, color: c.dim,
      }}>
        Preview · Shown in <span style={{ color: c.muted }}>Base Account</span> on first wallet-tool use
      </div>
    </div>
  );
};
