export const AcceptingPaymentsDemo = () => {
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




  // Shared Base Account "Review" modal + Approve Transaction button used
  // across the ai-agents demos. Supports asset-transfer previews (send, swap,
  // deposit, borrow, repay) and signing previews (sign-message, sign-siwe,
  // sign-permit). Positioned absolute inside the parent demo container so it
  // doesn't fight with the Mintlify navbar's z-index.

  const ACCENT = "#D97757";

  const tokenBg = (ticker) => {
    if (!ticker) return ACCENT;
    const t = ticker.toUpperCase();
    if (t === "USDC")  return "#2775CA";
    if (t === "ETH" || t === "WETH") return "#627EEA";
    if (t === "CBBTC" || t === "BTC") return "#F7931A";
    if (t === "DEGEN") return "#A06CFF";
    if (t === "POL")   return "#8247E5";
    return ACCENT;
  };

  const tokenGlow = (ticker) => {
    if (!ticker) return "rgba(217,119,87,0.14)";
    const t = ticker.toUpperCase();
    if (t === "USDC")  return "rgba(39,117,202,0.14)";
    if (t === "ETH" || t === "WETH") return "rgba(98,126,234,0.14)";
    if (t === "CBBTC" || t === "BTC") return "rgba(247,147,26,0.14)";
    if (t === "DEGEN") return "rgba(160,108,255,0.14)";
    return "rgba(217,119,87,0.14)";
  };

  const BigTokenAvatar = ({ ticker }) => (
    <div style={{
      width: 46, height: 46, borderRadius: "50%",
      background: tokenBg(ticker),
      display: "flex", alignItems: "center", justifyContent: "center",
      border: "1.5px solid rgba(255,255,255,0.10)",
      boxShadow: `0 0 0 5px ${tokenGlow(ticker)}`,
      flexShrink: 0,
    }}>
      <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 800, color: "#fff", letterSpacing: "-0.4px" }}>
        {(ticker || "??").slice(0, 2).toUpperCase()}
      </span>
    </div>
  );

  const SmallTokenAvatar = ({ ticker }) => (
    <div style={{
      width: 30, height: 30, borderRadius: "50%",
      background: tokenBg(ticker),
      display: "flex", alignItems: "center", justifyContent: "center",
      border: "1.5px solid rgba(255,255,255,0.08)",
      flexShrink: 0,
    }}>
      <span style={{ fontFamily: sans, fontSize: 9, fontWeight: 800, color: "#fff", letterSpacing: "-0.2px" }}>
        {(ticker || "??").slice(0, 2).toUpperCase()}
      </span>
    </div>
  );

  // Wallet avatar — wow-face emoji style in a blue gradient circle
  const CBAvatar = () => (
    <div style={{
      width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
      background: "radial-gradient(circle at 35% 30%, #5d8cff 0%, #2949d8 80%)",
      position: "relative", overflow: "hidden",
    }}>
      <span style={{ position: "absolute", top: 6, left: 5, width: 3, height: 3.5, borderRadius: "50%", background: "#fff" }} />
      <span style={{ position: "absolute", top: 6, right: 5, width: 3, height: 3.5, borderRadius: "50%", background: "#fff" }} />
      <span style={{ position: "absolute", bottom: 3.5, left: "50%", transform: "translateX(-50%)", width: 3.5, height: 4, borderRadius: "50%", background: "#1a1208" }} />
    </div>
  );

  // Sign-icon avatar for signing flows — pen-on-paper in a purple gradient circle
  const SignAvatar = () => (
    <div style={{
      width: 46, height: 46, borderRadius: "50%",
      background: "linear-gradient(135deg, #a796f7 0%, #7c5ae8 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      border: "1.5px solid rgba(255,255,255,0.10)",
      boxShadow: "0 0 0 5px rgba(167,150,247,0.14)",
      flexShrink: 0,
    }}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
      </svg>
    </div>
  );

  const ApprovalButton = ({ preview, onApprove, label }) => {
    const [hover, setHover] = useState(false);
    return (
      <div style={{ marginBottom: 10, marginTop: 4 }}>
        <button
          onClick={() => onApprove(preview)}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: hover ? "rgba(217,119,87,0.18)" : "rgba(217,119,87,0.10)",
            border: `1px solid ${ACCENT}`,
            borderRadius: 8, padding: "9px 14px",
            cursor: "pointer", color: ACCENT,
            fontFamily: sans, fontSize: 13.5, fontWeight: 600,
            boxShadow: hover ? `0 0 0 3px rgba(217,119,87,0.18)` : `0 0 0 3px rgba(217,119,87,0.08)`,
            transition: "all 0.15s ease",
          }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          {label || (preview && preview.type && preview.type.startsWith("sign") ? "Approve Signature" : "Approve Transaction")}
        </button>
      </div>
    );
  };

  const TxModal = ({ preview, onConfirm, onCancel }) => {
    const mbg     = "#0a0a0a";
    const mcard   = "#1a1816";
    const mhair   = "#1f1d1b";
    const mwhite  = "#ffffff";
    const mvalue  = "#a09b95";
    const msub    = "#7a7470";

    const isSign = preview.type && preview.type.startsWith("sign");

    const renderPreview = () => {
      if (preview.type === "send") return (
        <div style={{ padding: "16px 16px 14px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
            <BigTokenAvatar ticker={preview.asset} />
          </div>
          <div style={{ fontFamily: sans, fontSize: 20, fontWeight: 700, color: mwhite, lineHeight: 1.1, letterSpacing: "-0.4px" }}>
            {preview.amount} {preview.asset}
          </div>
          {preview.usdValue && (
            <div style={{ fontFamily: sans, fontSize: 12, color: msub, marginTop: 3 }}>
              {preview.usdValue}
            </div>
          )}
          <div style={{ height: 1, background: mhair, margin: "12px 0 10px" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: mwhite }}>To</span>
            <span style={{ fontFamily: sans, fontSize: 13, color: mvalue }}>{preview.to}</span>
          </div>
        </div>
      );

      if (preview.type === "swap") return (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px" }}>
            <SmallTokenAvatar ticker={preview.fromAsset} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: sans, fontSize: 11.5, color: msub, marginBottom: 1 }}>You send</div>
              <div style={{ fontFamily: sans, fontSize: 15, fontWeight: 700, color: mwhite, letterSpacing: "-0.2px" }}>
                {preview.fromAmount} {preview.fromAsset}
              </div>
            </div>
            {preview.fromUsd && (
              <div style={{ fontFamily: sans, fontSize: 11.5, color: msub }}>{preview.fromUsd}</div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "center", height: 0 }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%",
              background: mbg, border: `1px solid ${mhair}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginTop: -11, position: "relative", zIndex: 2,
            }}>
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke={mvalue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12l7 7 7-7"/>
              </svg>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderTop: `1px solid ${mhair}` }}>
            <SmallTokenAvatar ticker={preview.toAsset} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: sans, fontSize: 11.5, color: msub, marginBottom: 1 }}>You receive</div>
              <div style={{ fontFamily: sans, fontSize: 15, fontWeight: 700, color: "#a3c585", letterSpacing: "-0.2px" }}>
                {preview.toAmount} {preview.toAsset}
              </div>
            </div>
            {preview.toUsd && (
              <div style={{ fontFamily: sans, fontSize: 11.5, color: msub }}>{preview.toUsd}</div>
            )}
          </div>
        </div>
      );

      if (preview.type === "deposit") return (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px" }}>
            <SmallTokenAvatar ticker={preview.asset} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: sans, fontSize: 11.5, color: msub, marginBottom: 1 }}>You deposit</div>
              <div style={{ fontFamily: sans, fontSize: 15, fontWeight: 700, color: mwhite, letterSpacing: "-0.2px" }}>
                {preview.amount} {preview.asset}
              </div>
            </div>
            {preview.usdValue && (
              <div style={{ fontFamily: sans, fontSize: 11.5, color: msub }}>{preview.usdValue}</div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderTop: `1px solid ${mhair}` }}>
            <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: mwhite }}>Into</span>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: sans, fontSize: 13, color: mvalue }}>{preview.vault}</div>
              {preview.apy && (
                <div style={{ fontFamily: sans, fontSize: 11, color: "#a3c585", marginTop: 1, fontWeight: 600 }}>{preview.apy} APY</div>
              )}
            </div>
          </div>
        </div>
      );

      if (preview.type === "borrow") return (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px" }}>
            <SmallTokenAvatar ticker={preview.collateralAsset} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: sans, fontSize: 11.5, color: msub, marginBottom: 1 }}>Supply collateral</div>
              <div style={{ fontFamily: sans, fontSize: 15, fontWeight: 700, color: mwhite, letterSpacing: "-0.2px" }}>
                {preview.collateralAmount} {preview.collateralAsset}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderTop: `1px solid ${mhair}` }}>
            <SmallTokenAvatar ticker={preview.loanAsset} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: sans, fontSize: 11.5, color: msub, marginBottom: 1 }}>You borrow</div>
              <div style={{ fontFamily: sans, fontSize: 15, fontWeight: 700, color: "#a3c585", letterSpacing: "-0.2px" }}>
                {preview.loanAmount} {preview.loanAsset}
              </div>
            </div>
          </div>
          {preview.healthFactor && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: `1px solid ${mhair}` }}>
              <span style={{ fontFamily: sans, fontSize: 12.5, color: msub }}>Health factor</span>
              <span style={{ fontFamily: sans, fontSize: 13, color: "#a3c585", fontWeight: 600 }}>{preview.healthFactor}</span>
            </div>
          )}
        </div>
      );

      if (preview.type === "repay") return (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px" }}>
            <SmallTokenAvatar ticker={preview.asset} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: sans, fontSize: 11.5, color: msub, marginBottom: 1 }}>You repay</div>
              <div style={{ fontFamily: sans, fontSize: 15, fontWeight: 700, color: mwhite, letterSpacing: "-0.2px" }}>
                {preview.amount} {preview.asset}
              </div>
            </div>
            {preview.usdValue && (
              <div style={{ fontFamily: sans, fontSize: 11.5, color: msub }}>{preview.usdValue}</div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderTop: `1px solid ${mhair}` }}>
            <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: mwhite }}>To market</span>
            <span style={{ fontFamily: sans, fontSize: 13, color: mvalue }}>{preview.market}</span>
          </div>
        </div>
      );

      if (preview.type === "sign-message") return (
        <div style={{ padding: "16px 16px 14px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
            <SignAvatar />
          </div>
          <div style={{ fontFamily: sans, fontSize: 16, fontWeight: 700, color: mwhite, letterSpacing: "-0.3px" }}>
            Sign message
          </div>
          <div style={{ fontFamily: sans, fontSize: 11.5, color: msub, marginTop: 3 }}>
            personal_sign
          </div>
          <div style={{
            marginTop: 12, padding: "10px 12px",
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${mhair}`,
            borderRadius: 8, textAlign: "left",
            fontFamily: mono, fontSize: 12, color: mvalue,
            lineHeight: 1.45, wordBreak: "break-word",
          }}>
            "{preview.message}"
          </div>
        </div>
      );

      if (preview.type === "sign-siwe") return (
        <div style={{ padding: "16px 16px 14px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
            <SignAvatar />
          </div>
          <div style={{ fontFamily: sans, fontSize: 16, fontWeight: 700, color: mwhite, letterSpacing: "-0.3px" }}>
            Sign in with Ethereum
          </div>
          <div style={{ fontFamily: sans, fontSize: 11.5, color: msub, marginTop: 3 }}>
            EIP-4361 · session login
          </div>
          <div style={{ height: 1, background: mhair, margin: "12px 0 10px" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: mwhite }}>Domain</span>
            <span style={{ fontFamily: sans, fontSize: 13, color: mvalue }}>{preview.domain}</span>
          </div>
        </div>
      );

      if (preview.type === "sign-permit") return (
        <div style={{ padding: "16px 16px 14px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
            <SignAvatar />
          </div>
          <div style={{ fontFamily: sans, fontSize: 16, fontWeight: 700, color: mwhite, letterSpacing: "-0.3px" }}>
            Approve token spending
          </div>
          <div style={{ fontFamily: sans, fontSize: 11.5, color: msub, marginTop: 3 }}>
            EIP-712 · Permit2
          </div>
          <div style={{ height: 1, background: mhair, margin: "12px 0 8px" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
            <span style={{ fontFamily: sans, fontSize: 12.5, color: mwhite }}>Token</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <SmallTokenAvatar ticker={preview.token} />
              <span style={{ fontFamily: sans, fontSize: 13, color: mvalue }}>{preview.token}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
            <span style={{ fontFamily: sans, fontSize: 12.5, color: mwhite }}>Spender</span>
            <span style={{ fontFamily: sans, fontSize: 13, color: mvalue }}>{preview.spender}</span>
          </div>
          {preview.amount && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
              <span style={{ fontFamily: sans, fontSize: 12.5, color: mwhite }}>Allowance</span>
              <span style={{ fontFamily: sans, fontSize: 13, color: mvalue }}>{preview.amount}</span>
            </div>
          )}
        </div>
      );

      return null;
    };

    const FieldRow = ({ label, right }) => (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 16px",
      }}>
        <span style={{ fontFamily: sans, fontSize: 13.5, fontWeight: 500, color: mwhite }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>{right}</div>
      </div>
    );

    return (
      <div
        onClick={onCancel}
        style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 50,
          background: "rgba(0,0,0,0.78)",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(3px)",
          padding: 14,
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: mbg,
            borderRadius: 16,
            border: `1px solid #1f1d1b`,
            width: 320, maxWidth: "100%",
            maxHeight: "calc(100% - 8px)",
            overflowY: "auto",
            boxShadow: "0 24px 80px rgba(0,0,0,0.85)",
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px 12px",
            borderBottom: `1px solid ${mhair}`,
          }}>
            <span style={{ fontFamily: sans, fontSize: 17, fontWeight: 700, color: mwhite, letterSpacing: "-0.3px" }}>
              {isSign ? "Sign" : "Review"}
            </span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#d4d0ca" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>

          {/* Demo banner */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 16px",
            background: "rgba(217,119,87,0.10)",
            borderBottom: `1px solid rgba(217,119,87,0.18)`,
          }}>
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke={ACCENT} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
            </svg>
            <span style={{ fontFamily: sans, fontSize: 10.5, color: ACCENT, fontWeight: 700, letterSpacing: "0.3px", whiteSpace: "nowrap" }}>
              DEMO · Not a real {isSign ? "signature" : "transaction"}
            </span>
          </div>

          {/* Preview */}
          <div style={{ background: mcard, borderBottom: `1px solid ${mhair}` }}>
            {renderPreview()}
          </div>

          {/* Field rows */}
          <div style={{ padding: "4px 0" }}>
            <FieldRow
              label="Signing with"
              right={
                <>
                  <CBAvatar />
                  <span style={{ fontFamily: sans, fontSize: 13, color: mvalue }}>0x71Dc…7244</span>
                </>
              }
            />
            {!isSign && (
              <FieldRow
                label="Payment methods"
                right={
                  <>
                    <CBAvatar />
                    <span style={{ fontFamily: sans, fontSize: 13, color: mvalue }}>0x71Dc…7244</span>
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke={msub} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 1 }}><path d="m9 18 6-6-6-6"/></svg>
                  </>
                }
              />
            )}
            <FieldRow
              label="Network"
              right={
                <>
                  <div style={{ width: 16, height: 16, borderRadius: 4, background: "#0052FF", flexShrink: 0 }} />
                  <span style={{ fontFamily: sans, fontSize: 13, color: mvalue }}>Base</span>
                </>
              }
            />
            {!isSign && (
              <FieldRow
                label="Network fee (est.)"
                right={<span style={{ fontFamily: sans, fontSize: 13, color: mvalue }}>{"< $0.01"}</span>}
              />
            )}
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 8, padding: "12px 16px 16px" }}>
            <button
              onClick={onCancel}
              onMouseEnter={e => { e.currentTarget.style.background = "#3a3835"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#2a2826"; }}
              style={{
                flex: 1, padding: "12px 0",
                background: "#2a2826", border: "none",
                borderRadius: 12, cursor: "pointer",
                fontFamily: sans, fontSize: 14, fontWeight: 700, color: "#ffffff",
                transition: "background 0.15s ease",
              }}
            >Cancel</button>
            <button
              onClick={onConfirm}
              onMouseEnter={e => { e.currentTarget.style.background = "#1a4fd6"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#0052FF"; }}
              style={{
                flex: 1, padding: "12px 0",
                background: "#0052FF", border: "none",
                borderRadius: 12, cursor: "pointer",
                fontFamily: sans, fontSize: 14, fontWeight: 700, color: "#fff",
                transition: "background 0.15s ease",
              }}
            >Confirm</button>
          </div>
        </div>
      </div>
    );
  };


  const examples = [
    {
      prompt: "Find the best USDC vault on Base and deposit 100 USDC",
      events: [
        { delay: 380, type: "thinking" },
        { delay: 600, type: "tool", tool: { server: "morpho", action: "query_vaults", args: { chain: "base", asset: "USDC", sort: "apy_desc" } } },
        { delay: 500, type: "text", text: "Steakhouse USDC has the best yield. Preparing deposit through the available Morpho path..." },
        { delay: 300, type: "rows", rows: [
          { token: "Morpho · Steakhouse USDC", amount: "8.42% APY", value: "$24.1M TVL · winner" },
          { token: "Morpho · Re7 USDC",        amount: "7.91% APY", value: "$18.7M TVL" },
          { token: "Morpho · Flagship USDC",   amount: "7.34% APY", value: "$42.1M TVL" },
        ]},
        { delay: 500, type: "tool", tool: { server: "morpho", action: "prepare_deposit", args: { vault: "Steakhouse USDC", amount: "100 USDC" } } },
        { delay: 350, type: "tool", tool: { server: "base-mcp", action: "send_calls", args: { chain: "base", calls: "[approve, deposit]" } } },
        { delay: 450, type: "approval", preview: { type: "deposit", asset: "USDC", amount: "100", usdValue: "~$100.00", vault: "Steakhouse USDC", apy: "8.42%" } },
        { delay: 1100, type: "confirm", text: "Deposited 100 USDC into Steakhouse USDC · earning 8.42% APY" },
      ],
    },
    {
      prompt: "Supply 0.5 ETH as collateral and borrow 1000 USDC",
      events: [
        { delay: 380, type: "thinking" },
        { delay: 550, type: "tool", tool: { server: "morpho", action: "query_markets", args: { chain: "base", collateral: "ETH", loan: "USDC" } } },
        { delay: 500, type: "text", text: "Found Morpho ETH/USDC market on Base. Batching supply + borrow..." },
        { delay: 500, type: "tool", tool: { server: "morpho", action: "prepare_supply_collateral", args: { asset: "ETH", amount: "0.5", borrow: "1000 USDC" } } },
        { delay: 350, type: "tool", tool: { server: "base-mcp", action: "send_calls", args: { chain: "base", calls: "[supplyCollateral, borrow]" } } },
        { delay: 450, type: "approval", preview: { type: "borrow", collateralAsset: "ETH", collateralAmount: "0.5", loanAsset: "USDC", loanAmount: "1000", healthFactor: "2.1" } },
        { delay: 1100, type: "confirm", text: "Supplied 0.5 ETH · borrowed 1000 USDC · health factor 2.1" },
      ],
    },
    {
      prompt: "Repay all my Morpho USDC debt",
      events: [
        { delay: 380, type: "thinking" },
        { delay: 550, type: "tool", tool: { server: "morpho", action: "get_positions", args: { market: "ETH/USDC", chain: "base" } } },
        { delay: 500, type: "text", text: "You owe 1002.14 USDC including accrued interest. Preparing full repayment..." },
        { delay: 500, type: "tool", tool: { server: "morpho", action: "prepare_repay", args: { amount: "1002.14 USDC", market: "ETH/USDC" } } },
        { delay: 350, type: "tool", tool: { server: "base-mcp", action: "send_calls", args: { chain: "base", calls: "[approve, repayAll]" } } },
        { delay: 450, type: "approval", preview: { type: "repay", asset: "USDC", amount: "1002.14", usdValue: "~$1,002.14", market: "Morpho ETH/USDC" } },
        { delay: 1100, type: "confirm", text: "Repaid 1002.14 USDC · Morpho position closed" },
      ],
    },
  ];

  const [activeIdx, setActiveIdx]     = useState(null);
  const [eventIdx, setEventIdx]       = useState(0);
  const [modalPreview, setModalPreview] = useState(null);
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
    const events = examples[idx].events;
    for (let i = 0; i < events.length; i++) {
      cumulative += events[i].delay;
      timersRef.current.push(setTimeout(() => setEventIdx(i + 1), cumulative));
      if (events[i].type === "approval") break;
    }
  };

  const reset = () => { clearTimers(); setActiveIdx(null); setEventIdx(0); setModalPreview(null); };

  const handleConfirm = () => {
    setModalPreview(null);
    clearTimers();
    if (activeIdx !== null) setEventIdx(examples[activeIdx].events.length);
  };

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
      <div className="apd-bubble" style={{ background: c.bubble, color: c.bubbleText, padding: "12px 16px", borderRadius: 14, fontFamily: sans, lineHeight: 1.45, border: `1px solid ${c.toolBorder}` }}>{children}</div>
    </div>
  );

  const ToolCall = ({ tool, completed }) => (
    <div style={{ marginBottom: 10 }}>
      <div className="apd-tool-chip" style={{ display: "inline-flex", alignItems: "flex-start", gap: 8, background: c.toolBg, border: `1px solid ${c.toolBorder}`, borderRadius: 8, padding: "6px 11px", opacity: completed ? 0.85 : 1 }}>
        <span style={{ width: 14, height: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
          {completed
            ? <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={c.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            : <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={c.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 0l-7 7a3.5 3.5 0 0 0 5 5l5.5-5.5"/><path d="m11 8 5 5"/></svg>}
        </span>
        <span className="apd-tool-text" style={{ fontFamily: mono, color: c.muted }}>
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
        {[0, 1, 2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: c.muted, opacity: 0.4, animation: `apd-pulse 1.2s infinite ${i * 0.18}s` }} />)}
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
        <div key={i} className="apd-row" style={{ display: "flex", alignItems: "baseline", padding: "5px 0", fontFamily: serif, fontSize: 14, color: c.body }}>
          <span style={{ minWidth: 12, color: c.dim, flexShrink: 0 }}>•</span>
          <span className="apd-row-token" style={{ fontWeight: 500 }}>{r.token}</span>
          <span style={{ fontFamily: mono, fontSize: 12.5, color: c.code, background: c.codeBg, padding: "1px 6px", borderRadius: 4, whiteSpace: "nowrap" }}>{r.amount}</span>
          <span style={{ color: c.muted, fontSize: 13 }}>{r.value}</span>
        </div>
      ))}
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
      <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} className="apd-chip"
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
      if (event.type === "approval") return <ApprovalButton key={i} preview={event.preview} onApprove={setModalPreview} />;
      if (event.type === "confirm")  return <Confirm key={i} text={event.text} />;
      return null;
    });
  };

  return (
    <div style={{ position: "relative", margin: "28px 0", borderRadius: 14, overflow: "hidden", border: `1px solid ${c.border}`, background: c.bg, boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
      {modalPreview && <TxModal preview={modalPreview} onConfirm={handleConfirm} onCancel={() => setModalPreview(null)} />}
      <style>{`
        @keyframes apd-pulse{0%,100%{opacity:0.3;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}
        .apd-chat{height:420px;padding:24px 28px 16px}
        .apd-input-row{padding:10px 16px 14px}
        .apd-tool-text{white-space:nowrap;font-size:12px;line-height:1.4}
        .apd-tool-chip{max-width:100%}
        .apd-row{gap:12px;flex-wrap:nowrap}
        .apd-row-token{min-width:200px}
        .apd-bubble{max-width:78%;font-size:14px}
        .apd-approval{font-size:12.5px}
        .apd-chip{padding:16px 18px;font-size:15px}
        .apd-empty-text{font-size:16px}
        .apd-footnote{font-size:11px}
        @media(max-width:640px){
          .apd-chat{height:480px;padding:16px 14px 12px}
          .apd-input-row{padding:8px 10px 10px}
          .apd-tool-chip{display:block}
          .apd-tool-text{white-space:normal;word-break:break-word;font-size:11px}
          .apd-row{flex-wrap:wrap;gap:4px 10px}
          .apd-row-token{min-width:100%;flex:1 1 100%}
          .apd-bubble{max-width:88%;font-size:13.5px}
          .apd-approval{font-size:11.5px;word-break:break-all}
          .apd-chip{padding:14px 14px;font-size:14px}
          .apd-empty-text{font-size:14.5px}
          .apd-footnote{font-size:10.5px}
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", padding: "11px 14px", background: c.header, borderBottom: `1px solid ${c.border}` }}>
        <TrafficLights />
        <span style={{ fontFamily: sans, fontSize: 13, color: c.muted, fontWeight: 500 }}>Morpho + Base MCP</span>
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

      <div ref={scrollRef} className="apd-chat" style={{ overflowY: "auto" }}>
        {!ex && (
          <div>
            <div className="apd-empty-text" style={{ fontFamily: serif, color: c.muted, marginBottom: 20, lineHeight: 1.5 }}>
              Try asking once <span style={{ fontFamily: mono, fontSize: "0.85em", color: c.code, background: c.codeBg, padding: "1px 6px", borderRadius: 4 }}>mcp.base.org</span> is connected and Morpho MCP is available:
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {examples.map((e, i) => <ChipBtn key={i} onClick={() => pick(i)}>{e.prompt}</ChipBtn>)}
            </div>
          </div>
        )}
        {ex && <><UserBubble>{ex.prompt}</UserBubble>{renderEvents()}</>}
      </div>

      <div className="apd-input-row">
        <div style={{ display: "flex", alignItems: "center", background: c.inputBg, border: `1px solid ${c.toolBorder}`, borderRadius: 14, padding: "10px 14px" }}>
          <button style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 8, border: "none", background: "transparent", color: c.muted, cursor: "default", padding: 0, flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          </button>
          <span style={{ flex: 1, marginLeft: 8, fontFamily: sans, fontSize: 14, color: c.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Write a message...</span>
          <span style={{ fontFamily: sans, fontSize: 13, color: c.muted, marginRight: 12, flexShrink: 0 }}>Sonnet 4.6 <span style={{ color: c.dim }}>▾</span></span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={c.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 11a7 7 0 0 1-14 0"/><line x1="12" y1="18" x2="12" y2="22"/></svg>
        </div>
        <div className="apd-footnote" style={{ textAlign: "center", marginTop: 8, fontFamily: sans, color: c.dim }}>
          Demo · Morpho prepares calls, then you approve them in <span style={{ color: c.muted }}>Base Account</span>
        </div>
      </div>
    </div>
  );
};
