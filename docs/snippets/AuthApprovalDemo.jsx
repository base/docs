// Auth approval demo — mock of the Base Account "Allow" screen shown on first
// wallet-tool use. Part of the same product design system as the transaction
// modals. The client name is hardcoded because Mintlify does not expose the
// active <Tab> selection to JSX snippets.
export const AuthApprovalDemo = ({ client = "Claude" }) => {
  const sans = "'Base Sans','Inter Tight',Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  const mono = "'Base Mono','Roboto Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace";

  const C = {
    blue: "#0000ff", onBlue: "#ffffff", cerulean: "#3c8aff",
    ink: "#0a0b0d", body: "#32353d", sec: "#5b616e", sub: "#717886",
    border: "#dee1e7", panel: "#eef0f3", white: "#ffffff",
    blueSoft: "rgba(0,0,255,.06)",
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
        .aad-card { width: 100%; max-width: 400px; }
        @media (max-width: 480px) { .aad-card { max-width: 100%; } }
      `}</style>

      <div className="aad-card" style={{ background: C.white, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.blue}`, borderRadius: 8, color: C.ink, boxShadow: "0 1px 2px rgba(10,11,13,.04)", overflow: "hidden" }}>
        {/* Signed-in row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderBottom: `1px solid ${C.border}` }}>
          <img src="/images/brand/base-square-blue.svg" alt="" aria-hidden="true" style={{ width: 18, height: 18, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: C.sec, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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

          <h3 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em", margin: "0 0 6px", color: C.ink, lineHeight: 1.25 }}>
            Allow {client} to access your account.
          </h3>
          <p style={{ fontSize: 13, color: C.sec, margin: "0 0 18px", lineHeight: 1.5 }}>
            By continuing, you allow {client} to:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {permissions.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 34, height: 34, borderRadius: 6, background: C.panel, border: `1px solid ${C.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke={C.body} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{p.icon}</svg>
                </span>
                <span style={{ fontSize: 13.5, color: C.ink, lineHeight: 1.4 }}>{p.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ display: "flex", gap: 10, padding: "0 18px 16px" }}>
          <button style={{ flex: 1, padding: "12px 0", background: C.white, border: `1px solid ${C.border}`, color: C.body, borderRadius: 6, cursor: "default", fontFamily: sans, fontSize: 13.5, fontWeight: 600 }}>Learn more</button>
          <button style={{ flex: 1, padding: "12px 0", background: C.blue, border: `1px solid ${C.blue}`, color: C.onBlue, borderRadius: 6, cursor: "default", fontFamily: sans, fontSize: 13.5, fontWeight: 600 }}>Allow</button>
        </div>

        {/* Demo note */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderTop: `1px solid ${C.border}`, background: C.panel }}>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke={C.blue} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
          <span style={{ fontSize: 11, color: C.sub }}>Preview · shown in <span style={{ color: C.sec }}>Base Account</span> on first wallet-tool use.</span>
        </div>
      </div>
    </div>
  );
};
