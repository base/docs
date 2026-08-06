
export const B20FlowDemo = ({ flow }) => {
  // Base brand: Base Sans / Base Mono with brand-recommended fallbacks.
  const sans = "'Base Sans','Inter Tight',Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  const mono = "'Base Mono','Roboto Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace";

  // Palette resolves through CSS variables set on .b20f-card (light) and
  // overridden under html.dark, so the widget tracks the site theme.
  const c = {
    bg: "var(--b20-bg)", panel: "var(--b20-panel)", border: "var(--b20-border)",
    text: "var(--b20-text)", body: "var(--b20-body)", muted: "var(--b20-muted)", dim: "var(--b20-dim)",
    accent: "var(--b20-accent)", accentContrast: "var(--b20-accent-contrast)",
    success: "var(--b20-success)", error: "var(--b20-error)",
  };

  // Base secondary palette for account markers.
  const acctDot = { Issuer: "var(--b20-accent)", Processor: "#3c8aff", Alice: "#66c800", Bob: "#ffd12f", Carol: "#fea8cd" };

  // ----- deterministic simulated address -----
  const hashHex = (seed) => {
    let h = 5381;
    for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
    let out = "", x = h;
    for (let i = 0; i < 9; i++) {
      x = (x * 1103515245 + 12345 + i * 7) >>> 0;
      out += ((x >>> ((i % 4) * 8)) & 0xff).toString(16).padStart(2, "0");
    }
    return out;
  };
  const tokenAddress = (variant, symbol) => {
    const vByte = variant === "STABLECOIN" ? "01" : "00";
    const tail = hashHex(symbol);
    return `0xb2000000…${vByte}${tail.slice(0, 4)}…${tail.slice(-4)}`;
  };

  const emit = (name, args, logIndex) => ({ kind: "event", name, args, logIndex });
  const revert = (name, args) => ({ kind: "revert", name, args: args || "", logIndex: null });
  const info = (name, args) => ({ kind: "info", name, args: args || "", logIndex: null });

  // ----- fresh simulation state -----
  const freshSim = () => ({
    token: null, balances: {}, policies: {}, nextPolicyId: 2,
    scopes: { TRANSFER_SENDER: 0, TRANSFER_RECEIVER: 0, TRANSFER_EXECUTOR: 0, MINT_RECEIVER: 0 },
    roles: {}, allowances: {}, nonces: {}, sig: null,
  });
  const cloneSim = (s) => ({
    token: s.token ? { ...s.token, extraMetadata: { ...s.token.extraMetadata } } : null,
    balances: { ...s.balances },
    policies: Object.fromEntries(Object.entries(s.policies).map(([k, v]) => [k, { ...v, members: [...v.members] }])),
    nextPolicyId: s.nextPolicyId,
    scopes: { ...s.scopes },
    roles: Object.fromEntries(Object.entries(s.roles).map(([k, v]) => [k, [...v]])),
    allowances: { ...s.allowances },
    nonces: { ...s.nonces },
    sig: s.sig ? { ...s.sig } : null,
  });

  // Provision a token directly into the snapshot (simulated createB20).
  const createInSim = (s, kind) => {
    const isEquity = kind === "EQUITY";
    s.token = {
      variant: isEquity ? "ASSET" : "STABLECOIN",
      name: isEquity ? "Acme Corp Class A" : "Acme Dollar",
      symbol: isEquity ? "ACME" : "aUSD",
      multiplier: 1.0,
      extraMetadata: isEquity ? { cusip: "38259P508" } : {},
    };
    const roleMap = {};
    ["DEFAULT_ADMIN_ROLE", "MINT_ROLE", "BURN_BLOCKED_ROLE"].forEach(r => { roleMap[r] = ["Issuer"]; });
    if (isEquity) roleMap["OPERATOR_ROLE"] = ["Issuer"];
    s.roles = roleMap;
  };

  // ---------------------------------------------------------------
  // Op interpreter. Mutates the snapshot; validates in spec order;
  // returns log entries for the step's inline result.
  // ---------------------------------------------------------------
  const applyOp = (s, op, me, entries) => {
    const isAuthorized = (policyId, account) => {
      if (!policyId) return true; // ALWAYS_ALLOW = 0, the default on every scope
      const p = s.policies[policyId];
      if (!p) return false;
      if (p.type === "BLOCKLIST") return !p.members.includes(account);
      return p.members.includes(account); // ALLOWLIST
    };
    const roleHas = (r, a) => (s.roles[r] || []).includes(a);

    switch (op.type) {
      case "mint": {
        if (!roleHas("MINT_ROLE", me)) return entries.push(revert("AccessControlUnauthorizedAccount", `${me} lacks MINT_ROLE`));
        if (!isAuthorized(s.scopes.MINT_RECEIVER, op.to)) return entries.push(revert("PolicyForbids", `MINT_RECEIVER · ${op.to}`));
        s.balances[op.to] = (s.balances[op.to] || 0) + op.amt;
        return entries.push(emit("Transfer", `0x0 → ${op.to} · ${op.amt}`, 0));
      }
      case "transfer": {
        const { from, to, amt, memo } = op;
        if (!isAuthorized(s.scopes.TRANSFER_SENDER, from)) return entries.push(revert("PolicyForbids", `TRANSFER_SENDER · ${from}`));
        if (!isAuthorized(s.scopes.TRANSFER_RECEIVER, to)) return entries.push(revert("PolicyForbids", `TRANSFER_RECEIVER · ${to}`));
        if ((s.balances[from] || 0) < amt) return entries.push(revert("ERC20InsufficientBalance", `${from} has ${s.balances[from] || 0}`));
        s.balances[from] -= amt;
        s.balances[to] = (s.balances[to] || 0) + amt;
        entries.push(emit("Transfer", `${from} → ${to} · ${amt}`, 0));
        if (memo !== undefined) entries.push(emit("Memo", `${me} · "${memo}"`, 1));
        return;
      }
      case "transferFrom": {
        const { from, to, amt } = op;
        const key = from + "→" + me;
        if ((s.allowances[key] || 0) < amt) return entries.push(revert("ERC20InsufficientAllowance", `${me} allowance ${s.allowances[key] || 0} < ${amt}`));
        if ((s.balances[from] || 0) < amt) return entries.push(revert("ERC20InsufficientBalance", `${from} has ${s.balances[from] || 0}`));
        s.balances[from] -= amt;
        s.balances[to] = (s.balances[to] || 0) + amt;
        s.allowances[key] -= amt;
        return entries.push(emit("Transfer", `${from} → ${to} · ${amt} (by ${me})`, 0));
      }
      case "burnBlocked": {
        const { target, amt } = op;
        if (!roleHas("BURN_BLOCKED_ROLE", me)) return entries.push(revert("AccessControlUnauthorizedAccount", `${me} lacks BURN_BLOCKED_ROLE`));
        if (isAuthorized(s.scopes.TRANSFER_SENDER, target)) return entries.push(revert("AccountNotBlocked", `${target} not denied by TRANSFER_SENDER`));
        if ((s.balances[target] || 0) < amt) return entries.push(revert("ERC20InsufficientBalance", `${target} has ${s.balances[target] || 0}`));
        s.balances[target] -= amt;
        return entries.push(emit("Transfer", `${target} → 0x0 · ${amt} (seized)`, 0));
      }
      case "freeze": {
        // createPolicy + updateBlocklist + updatePolicy, presented as one action
        const id = s.nextPolicyId;
        s.policies[id] = { type: "BLOCKLIST", members: [op.target] };
        s.nextPolicyId = id + 1;
        s.scopes.TRANSFER_SENDER = id;
        entries.push(emit("PolicyCreated", `#${id} · BLOCKLIST · admin ${me}`, 0));
        entries.push(emit("updateBlocklist", `#${id} · add ${op.target}`, 1));
        entries.push(emit("PolicyUpdated", `TRANSFER_SENDER → #${id}`, 2));
        return;
      }
      case "permit": {
        const { owner, spender, amt, nonce } = op;
        const current = s.nonces[owner] || 0;
        if (nonce !== current) return entries.push(revert("ERC2612InvalidSigner", `stale nonce ${nonce} ≠ ${current}`));
        s.allowances[owner + "→" + spender] = amt;
        s.nonces[owner] = current + 1;
        return entries.push(emit("Approval", `${owner} → ${spender} · ${amt} (permit, relayed by ${me})`, 0));
      }
      case "updateMultiplier": {
        if (!roleHas("OPERATOR_ROLE", me)) return entries.push(revert("AccessControlUnauthorizedAccount", `${me} lacks OPERATOR_ROLE`));
        s.token = { ...s.token, multiplier: op.value };
        return entries.push(emit("MultiplierUpdated", `${op.value}× (WAD)`, 0));
      }
      case "announceBatchMint": {
        const { recipients, amt, id } = op;
        if (!roleHas("OPERATOR_ROLE", me)) return entries.push(revert("AccessControlUnauthorizedAccount", `${me} lacks OPERATOR_ROLE`));
        entries.push(emit("Announcement", `id ${id} · dividend batchMint`, 0));
        recipients.forEach((r, i) => {
          s.balances[r] = (s.balances[r] || 0) + amt;
          entries.push(emit("Transfer", `0x0 → ${r} · ${amt}`, i + 1));
        });
        entries.push(emit("EndAnnouncement", `id ${id}`, recipients.length + 1));
        return;
      }
      default:
        return;
    }
  };

  const runOps = (s, ops) => {
    const entries = [];
    ops.forEach(op => applyOp(s, op, op.as, entries));
    return entries;
  };

  // ======================================================================
  // Flow definitions. Each step: plain-language situation → one button →
  // visible consequence. API names appear in results, never in the ask.
  // ======================================================================
  const FLOWS = {
    seize: {
      title: "Freeze and seize, as compliance sees it",
      erc20: "On plain ERC-20: you build and audit a custom blocklist token.",
      readout: "balances",
      steps: [
        {
          label: "Bob holds 50 aUSD.",
          action: "Mint to Bob",
          run: (s) => {
            if (!s.token) createInSim(s, "STABLECOIN");
            return { entries: runOps(s, [{ as: "Issuer", type: "mint", to: "Bob", amt: 50 }]) };
          },
        },
        {
          label: "A court order arrives. Freeze Bob's account.",
          action: "Freeze account",
          run: (s) => ({
            entries: runOps(s, [{ as: "Issuer", type: "freeze", target: "Bob" }]),
            caption: "Bob can no longer send. No one else is affected.",
          }),
        },
        {
          label: "Bob tries to pay Alice anyway.",
          action: "Attempt payment",
          run: (s) => ({
            entries: runOps(s, [{ as: "Bob", type: "transfer", from: "Bob", to: "Alice", amt: 10 }]),
            caption: "Blocked by the protocol, not by custom contract code.",
          }),
        },
        {
          label: "Seize the frozen balance.",
          action: "Seize funds",
          run: (s) => ({
            entries: runOps(s, [{ as: "Issuer", type: "burnBlocked", target: "Bob", amt: 50 }]),
            caption: "Seizure only works on a frozen account. It can't skip the freeze.",
          }),
        },
      ],
    },

    memo: {
      title: "An invoice paid and matched",
      erc20: "On plain ERC-20: transfers carry no reference, so you run a deposit address per customer.",
      readout: null,
      steps: [
        {
          label: "Alice has 100 aUSD to spend.",
          action: "Fund Alice",
          run: (s) => {
            if (!s.token) createInSim(s, "STABLECOIN");
            return { entries: runOps(s, [{ as: "Issuer", type: "mint", to: "Alice", amt: 100 }]) };
          },
        },
        {
          label: "Alice pays invoice #8842. The reference rides in the payment.",
          action: "Pay 25 aUSD",
          run: (s) => ({
            entries: runOps(s, [{ as: "Alice", type: "transfer", from: "Alice", to: "Processor", amt: 25, memo: "invoice-8842" }]),
            caption: "One transaction: payment and reference.",
          }),
        },
        {
          label: "The back office matches the payment to the order.",
          action: "Match payment",
          run: () => ({
            entries: [
              info("query", "find Transfer at (txHash, Memo.logIndex − 1)"),
              info("matched", '"invoice-8842" → 25 aUSD from Alice ✓'),
            ],
            caption: "Reconciliation is one log query, not a deposit address per customer.",
          }),
        },
      ],
    },

    permit: {
      title: "A first-time user, zero ETH",
      erc20: "On plain ERC-20: the user buys ETH and sends an onchain approve first.",
      readout: "allowance",
      steps: [
        {
          label: "Alice just signed up. She has aUSD and zero ETH for gas.",
          action: "Fund with aUSD",
          run: (s) => {
            if (!s.token) createInSim(s, "STABLECOIN");
            return { entries: runOps(s, [{ as: "Issuer", type: "mint", to: "Alice", amt: 100 }]) };
          },
        },
        {
          label: "Alice signs an approval offchain. It costs her nothing.",
          action: "Sign approval",
          run: (s) => {
            s.sig = { nonce: s.nonces["Alice"] || 0 };
            return {
              entries: [
                info("signed payload", `owner Alice · spender Processor · value 100 · nonce ${s.sig.nonce}`),
                info("cost to Alice", "0 gas, nothing sent onchain"),
              ],
            };
          },
        },
        {
          label: "The platform relays her signature and collects the payment.",
          action: "Relay & collect",
          run: (s) => ({
            entries: runOps(s, [
              { as: "Processor", type: "permit", owner: "Alice", spender: "Processor", amt: 100, nonce: s.sig ? s.sig.nonce : 0 },
              { as: "Processor", type: "transferFrom", from: "Alice", to: "Processor", amt: 40 },
            ]),
            caption: "Alice never sent a transaction. The nonce blocks replay.",
          }),
        },
      ],
    },

    equity: {
      title: "A share of stock, onchain",
      erc20: "On plain ERC-20: a rebasing token is a custom contract, and disclosures live offchain.",
      readout: "scaled",
      steps: [
        {
          label: "ACME lists onchain with its security identifiers.",
          action: "Create token",
          run: (s) => {
            createInSim(s, "EQUITY");
            return {
              entries: [
                info("createB20", `asset · ACME · ${tokenAddress("ASSET", "ACME")}`),
                info("initCalls", 'updateExtraMetadata("cusip", "38259P508")'),
              ],
              caption: "One factory call, with no contract to write or audit.",
            };
          },
        },
        {
          label: "Shareholders hold ACME.",
          action: "Distribute shares",
          run: (s) => ({
            entries: runOps(s, [
              { as: "Issuer", type: "mint", to: "Alice", amt: 100 },
              { as: "Issuer", type: "mint", to: "Bob", amt: 50 },
            ]),
          }),
        },
        {
          label: "The board declares a 2-for-1 split.",
          action: "Run the split",
          run: (s) => ({
            entries: runOps(s, [{ as: "Issuer", type: "updateMultiplier", value: 2.0 }]),
            caption: "Every balance doubles in one call, without a migration or a new contract.",
          }),
        },
        {
          label: "A dividend goes out with public disclosure.",
          action: "Announce & distribute",
          run: (s) => ({
            entries: runOps(s, [{ as: "Issuer", type: "announceBatchMint", recipients: ["Alice", "Bob"], amt: 10, id: 7 }]),
            caption: "Disclosure and distribution land in the same transaction.",
          }),
        },
      ],
    },
  };

  const f = FLOWS[flow] || FLOWS.seize;

  // ----- widget state -----
  const [sim, setSim] = useState(freshSim);
  const [results, setResults] = useState([]); // one entry per completed step
  const stepIndex = results.length;
  const done = stepIndex >= f.steps.length;

  const runStep = () => {
    if (done) return;
    const s = cloneSim(sim);
    const out = f.steps[stepIndex].run(s);
    setSim(s);
    setResults(r => [...r, out]);
  };
  const reset = () => { setSim(freshSim()); setResults([]); };

  // ----- flow-specific live readout -----
  const Readout = () => {
    if (!f.readout || !sim.token) return null;
    if (f.readout === "allowance") {
      return (
        <div style={{ fontFamily: mono, fontSize: 11, color: c.muted, display: "flex", flexWrap: "wrap", gap: "2px 16px" }}>
          <span>allowance(Alice → Processor) <span style={{ color: c.body }}>{sim.allowances["Alice→Processor"] || 0}</span></span>
          <span>nonce(Alice) <span style={{ color: c.body }}>{sim.nonces["Alice"] || 0}</span></span>
        </div>
      );
    }
    const scaled = f.readout === "scaled";
    const frozen = f.readout === "balances" && sim.scopes.TRANSFER_SENDER !== 0;
    const holders = Object.keys(sim.balances).length ? Object.keys(sim.balances) : [];
    if (!holders.length) return null;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", alignItems: "center" }}>
        {holders.map(a => (
          <span key={a} style={{ fontFamily: sans, fontSize: 11.5, color: c.muted, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: acctDot[a] || c.dim, display: "inline-block" }} />
            {a} <span style={{ fontFamily: mono, color: c.body }}>{sim.balances[a] || 0}</span>
            {scaled && sim.token.multiplier !== 1 && (
              <span style={{ fontFamily: mono, color: c.accent }}>→ {((sim.balances[a] || 0) * sim.token.multiplier).toFixed(0)} scaled</span>
            )}
            {frozen && a === "Bob" && (
              <span style={{ fontFamily: mono, fontSize: 10, color: c.error, border: `1px solid ${c.error}`, borderRadius: 5, padding: "0px 5px" }}>frozen</span>
            )}
          </span>
        ))}
        {scaled && sim.token.multiplier !== 1 && (
          <span style={{ fontFamily: mono, fontSize: 10.5, color: c.dim }}>multiplier() = {sim.token.multiplier}×</span>
        )}
      </div>
    );
  };

  return (
    <div className="b20f-card" style={{ margin: "20px 0", borderRadius: 12, border: `1px solid ${c.border}`, background: c.bg, overflow: "hidden" }}>
      <style>{`
        .b20f-card{
          --b20-bg:#ffffff; --b20-panel:#eef0f3; --b20-border:#dee1e7;
          --b20-text:#0a0b0d; --b20-body:#32353d; --b20-muted:#5b616e; --b20-dim:#717886;
          --b20-accent:#0000ff; --b20-accent-contrast:#ffffff;
          --b20-success:#66c800; --b20-error:#fc401f;
        }
        html.dark .b20f-card, [data-theme="dark"] .b20f-card{
          --b20-bg:#0a0b0d; --b20-panel:rgba(255,255,255,0.05); --b20-border:#32353d;
          --b20-text:#ffffff; --b20-body:#dee1e7; --b20-muted:#b1b7c3; --b20-dim:#717886;
          --b20-accent:#578BFA; --b20-accent-contrast:#0a0b0d;
        }
        .b20f-btn{font-family:${sans};font-size:12.5px;font-weight:500;border-radius:8px;padding:6px 14px;cursor:pointer;transition:all 0.15s ease;white-space:nowrap}
        .b20f-btn-now{color:var(--b20-accent-contrast);background:var(--b20-accent);border:1px solid var(--b20-accent)}
        .b20f-btn-now:hover{filter:brightness(1.15)}
        .b20f-btn-future{color:var(--b20-dim);background:transparent;border:1px dashed var(--b20-border);cursor:default}
        .b20f-reset{font-family:${sans};font-size:11px;color:var(--b20-dim);background:transparent;border:none;cursor:pointer;padding:0}
        .b20f-reset:hover{color:var(--b20-body)}
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: c.panel, borderBottom: `1px solid ${c.border}` }}>
        <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", color: c.text }}>{f.title}</span>
        <span style={{ fontFamily: mono, fontSize: 9.5, fontWeight: 500, letterSpacing: "0.8px", color: c.dim, border: `1px solid ${c.border}`, borderRadius: 4, padding: "1px 6px" }}>SIMULATED</span>
        <div style={{ flex: 1 }} />
        {results.length > 0 && <button className="b20f-reset" onClick={reset}>reset</button>}
      </div>

      {/* Steps */}
      <div style={{ padding: "6px 16px 12px" }}>
        {f.steps.map((step, i) => {
          const state = i < stepIndex ? "done" : i === stepIndex ? "now" : "future";
          const res = results[i];
          return (
            <div key={i} style={{ padding: "10px 0", borderBottom: i < f.steps.length - 1 ? `1px solid ${c.border}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{
                  width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontFamily: sans, fontSize: 11, fontWeight: 600,
                  color: state === "done" ? c.success : state === "now" ? c.accentContrast : c.dim,
                  border: `1px solid ${state === "now" ? c.accent : c.border}`,
                  background: state === "now" ? c.accent : "transparent",
                }}>
                  {state === "done" ? "✓" : i + 1}
                </span>
                <span style={{
                  flex: 1, fontFamily: sans, fontSize: 13, lineHeight: 1.45,
                  color: state === "future" ? c.dim : state === "now" ? c.text : c.body,
                  fontWeight: state === "now" ? 600 : 400,
                }}>
                  {step.label}
                </span>
                {state !== "done" && (
                  <button
                    className={state === "now" ? "b20f-btn b20f-btn-now" : "b20f-btn b20f-btn-future"}
                    onClick={state === "now" ? runStep : undefined}
                    disabled={state !== "now"}>
                    {step.action}
                  </button>
                )}
              </div>
              {res && (
                <div style={{ margin: "7px 0 0 34px", display: "grid", gap: 3 }}>
                  {res.entries.map((e, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                      <span style={{ flexShrink: 0, width: 12, marginTop: 2 }}>
                        {e.kind === "event" && <svg viewBox="0 0 24 24" width="11" height="11" fill="none" style={{ stroke: c.success }} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
                        {e.kind === "revert" && <svg viewBox="0 0 24 24" width="11" height="11" fill="none" style={{ stroke: c.error }} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>}
                        {e.kind === "info" && <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: c.dim, marginLeft: 3, marginTop: 3 }} />}
                      </span>
                      <span style={{ fontFamily: mono, fontSize: 11, lineHeight: 1.5 }}>
                        {e.logIndex !== null && e.logIndex !== undefined && <span style={{ color: c.dim }}>[{e.logIndex}] </span>}
                        <span style={{ color: e.kind === "revert" ? c.error : e.kind === "info" ? c.muted : c.body, fontWeight: e.kind === "info" ? 400 : 600 }}>{e.name}</span>
                        {e.args && <span style={{ color: c.dim }}> · {e.args}</span>}
                      </span>
                    </div>
                  ))}
                  {res.caption && (
                    <div style={{ fontFamily: sans, fontSize: 11.5, color: c.muted, lineHeight: 1.45, marginTop: 2, borderLeft: `2px solid ${c.accent}`, paddingLeft: 8 }}>{res.caption}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Live readout */}
        {(f.readout && Object.keys(sim.balances).length > 0) && (
          <div style={{ marginTop: 10, padding: "8px 12px", background: c.panel, border: `1px solid ${c.border}`, borderRadius: 8 }}>
            <Readout />
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "8px 16px", background: c.panel, borderTop: `1px solid ${c.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: sans, fontSize: 11, color: c.dim, lineHeight: 1.4 }}>{f.erc20}</span>
        <div style={{ flex: 1 }} />
        {done && <span style={{ fontFamily: sans, fontSize: 11, color: c.success, whiteSpace: "nowrap" }}>✓ flow complete</span>}
      </div>
    </div>
  );
};
