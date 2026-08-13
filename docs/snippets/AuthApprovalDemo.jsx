// Auth approval demo — mock of the Base Account "Allow" screen shown on first
// wallet-tool use. Part of the same product design system as the transaction
// modals. The client name is hardcoded because Mintlify does not expose the
// active <Tab> selection to JSX snippets.
export const AuthApprovalDemo = ({ client = "Claude" }) => {
  const sans = "'Base Sans','Inter Tight',Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  const mono = "'Base Mono','Roboto Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace";

  const C = {
    blue: "var(--wf-blue)", onBlue: "var(--wf-on-blue)", cerulean: "var(--wf-cerulean)",
    ink: "var(--wf-ink)", body: "var(--wf-body)", sec: "var(--wf-sec)", sub: "var(--wf-sub)",
    border: "var(--wf-border)", panel: "var(--wf-panel)", white: "var(--wf-surface)",
    blueSoft: "var(--wf-blue-soft)",
  };

  const permissions = [
    { label: "View your address, balances, and activity.",
      icon: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></> },
    { label: "Prepare transactions for you to review.",
      icon: <><path d="M22 2 11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></> },
    { label: "Request your signature before anything is sent.",
      icon: <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /> },
  ];

  return (
    <div style={{ margin: "22px 0", fontFamily: sans, display: "flex", justifyContent: "center" }}>
      <style>{`
        /* ---- Base design system: color tokens (light) ---- */
        .aad-card {
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
          .aad-card {
            --wf-blue: #4d6bff; --wf-on-blue: #ffffff; --wf-cerulean: #6ea8ff;
            --wf-ink: #ffffff; --wf-body: #dee1e7; --wf-sec: #b1b7c3; --wf-sub: #8a91a0; --wf-muted: #787878;
            --wf-border: #2b2f36; --wf-panel: #17181b; --wf-surface: #0f1012;
            --wf-success: #7cd442; --wf-lime: #b6f569; --wf-error: #ff6a4d; --wf-warn: #ffd12f;
            --wf-blue-soft: rgba(77,107,255,.16); --wf-success-soft: rgba(124,212,66,.16); --wf-error-soft: rgba(255,106,77,.16);
            --wf-shadow: 0 1px 2px rgba(0,0,0,.4);
          }
        }
        /* ---- Dark theme: docs explicit toggle wins over system ---- */
        html.dark .aad-card, :root[data-theme="dark"] .aad-card, [data-theme="dark"] .aad-card {
          --wf-blue: #4d6bff; --wf-on-blue: #ffffff; --wf-cerulean: #6ea8ff;
          --wf-ink: #ffffff; --wf-body: #dee1e7; --wf-sec: #b1b7c3; --wf-sub: #8a91a0; --wf-muted: #787878;
          --wf-border: #2b2f36; --wf-panel: #17181b; --wf-surface: #0f1012;
          --wf-success: #7cd442; --wf-lime: #b6f569; --wf-error: #ff6a4d; --wf-warn: #ffd12f;
          --wf-blue-soft: rgba(77,107,255,.16); --wf-success-soft: rgba(124,212,66,.16); --wf-error-soft: rgba(255,106,77,.16);
          --wf-shadow: 0 1px 2px rgba(0,0,0,.4);
        }
        /* ---- Light theme: docs explicit toggle wins over system dark ---- */
        html.light .aad-card, :root[data-theme="light"] .aad-card, [data-theme="light"] .aad-card {
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

        .aad-card { width: 100%; max-width: 400px; }
        @media (max-width: 480px) { .aad-card { max-width: 100%; } }
      `}</style>

      <div className="aad-card" style={{ background: C.white, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.blue}`, borderRadius: 8, color: C.ink, boxShadow: "var(--wf-shadow)", overflow: "hidden" }}>
        {/* Signed-in row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderBottom: `1px solid ${C.border}` }}>
          <img src="/images/brand/base-square-blue.svg" alt="" aria-hidden="true" style={{ width: 18, height: 18, flexShrink: 0 }} />
          <span className="wf-t-footnote" style={{ color: C.sec, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Signed in as <span style={{ fontFamily: mono, fontSize: 12.5, color: C.ink, fontWeight: 600 }}>0x71Dc…7244</span>
          </span>
        </div>

        {/* Body */}
        <div style={{ padding: "22px 22px 20px" }}>
          {/* Client ↔ account pairing */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <span style={{ width: 44, height: 44, borderRadius: 8, background: C.panel, border: `1px solid ${C.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 17, fontWeight: 600, color: C.body }}>
              {client.charAt(0).toUpperCase()}
            </span>
            <span style={{ display: "inline-flex", gap: 4 }}>
              {[0, 1, 2].map((i) => <span key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: C.sub }} />)}
            </span>
            <span style={{ width: 44, height: 44, borderRadius: 8, background: C.blueSoft, border: `1px solid ${C.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <img src="/images/brand/base-square-blue.svg" alt="" aria-hidden="true" style={{ width: 26, height: 26 }} />
            </span>
          </div>

          <h3 className="wf-t-headline" style={{ margin: "0 0 6px", color: C.ink }}>
            Allow {client} to access your account.
          </h3>
          <p className="wf-t-body" style={{ color: C.sec, margin: "0 0 18px" }}>
            By continuing, you allow {client} to:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {permissions.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 34, height: 34, borderRadius: 6, background: C.panel, border: `1px solid ${C.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke={C.body} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{p.icon}</svg>
                </span>
                <span className="wf-t-body" style={{ color: C.ink }}>{p.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ display: "flex", gap: 10, padding: "0 18px 16px" }}>
          <button className="wf-t-button" style={{ flex: 1, padding: "12px 0", background: C.white, border: `1px solid ${C.border}`, color: C.body, borderRadius: 6, cursor: "default" }}>Learn more</button>
          <button className="wf-t-button" style={{ flex: 1, padding: "12px 0", background: C.blue, border: `1px solid ${C.blue}`, color: C.onBlue, borderRadius: 6, cursor: "default" }}>Allow</button>
        </div>

        {/* Demo note */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderTop: `1px solid ${C.border}`, background: C.panel }}>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke={C.blue} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
          <span className="wf-t-footnote" style={{ color: C.sub }}>Preview · shown in <span style={{ color: C.sec }}>Base Account</span> on first wallet-tool use.</span>
        </div>
      </div>
    </div>
  );
};
