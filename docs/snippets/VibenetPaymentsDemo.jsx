// A real onchain payment, running inside a Mintlify page.
//
// Two steps, deliberately separated so it is clear which one is a payment:
//   1. The faucet funds your account. This is setup, not a payment — the faucet
//      mints USDV rather than sending it from anyone's balance.
//   2. You transfer USDV to a random address. This is the payment: a real
//      ERC-20 movement out of your funded balance.
//
// The account is a native EIP-8130 smart account created in the page. There is
// no wallet, no extension, and no connect prompt anywhere in this flow.
//
// Mintlify snippets cannot import anything, so the client is loaded at runtime
// from /static/aa-payments.mjs via a module script tag. That file is only
// fetched when this component mounts — the 836 KB bundle behind it never loads
// on any other page.

export const VibenetPaymentsDemo = () => {
  const [aa, setAa] = useState(null);
  const [error, setError] = useState(null);
  const [account, setAccount] = useState(null); // { address }
  const [recipient, setRecipient] = useState(null);
  const [accountBalance, setAccountBalance] = useState(0n);
  const [recipientBalance, setRecipientBalance] = useState(0n);
  const [deployed, setDeployed] = useState(false);
  const [steps, setSteps] = useState([]);
  const [busy, setBusy] = useState(false);

  const accountRef = useRef(null); // the live signer object — not renderable

  const log = (text, state, href) =>
    setSteps((prev) => [...prev, { id: prev.length, text, state, href }]);
  const patchLast = (patch) =>
    setSteps((prev) => prev.map((s, i) => (i === prev.length - 1 ? { ...s, ...patch } : s)));

  // --- load the EIP-8130 client --------------------------------------------
  useEffect(() => {
    let alive = true;
    const done = (mod) => alive && setAa(mod);
    if (window.__vibenetAa) { done(window.__vibenetAa); return; }
    const onReady = () => done(window.__vibenetAa);
    window.addEventListener("vibenet-aa:ready", onReady, { once: true });
    if (!document.querySelector("script[data-vibenet-aa]")) {
      const tag = document.createElement("script");
      tag.type = "module";
      tag.src = "/static/aa-payments.mjs";
      tag.dataset.vibenetAa = "true";
      tag.onerror = () => alive && setError("Could not load /static/aa-payments.mjs");
      document.head.appendChild(tag);
    }
    return () => { alive = false; window.removeEventListener("vibenet-aa:ready", onReady); };
  }, []);

  // --- create the account as soon as the client is ready --------------------
  useEffect(() => {
    if (!aa || accountRef.current) return;
    let alive = true;
    aa.createAccount()
      .then((created) => {
        if (!alive) return;
        accountRef.current = created;
        setAccount({ address: created.address });
        setRecipient(aa.randomAddress());
      })
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [aa]);

  const refreshBalances = async () => {
    const [mine, theirs, isUp] = await Promise.all([
      aa.usdvBalanceOf(accountRef.current.address),
      aa.usdvBalanceOf(recipient),
      aa.isDeployed(accountRef.current.address),
    ]);
    setAccountBalance(mine);
    setRecipientBalance(theirs);
    setDeployed(isUp);
  };

  // --- step 1: fund ---------------------------------------------------------
  const fund = async () => {
    setBusy(true);
    setSteps([]);
    try {
      log("Requesting a drip from the Vibenet faucet…", "pending");
      const hashes = await aa.fundAccount(accountRef.current.address);
      patchLast({
        text: "Faucet minted 1,000 USDV and sent test ETH for gas",
        state: "done",
        href: `https://chain.base.org/vibenet/explorer/tx/${hashes[1]}`,
      });
      await refreshBalances();
      log("Account funded — it still has no code on chain yet", "done");
    } catch (e) {
      patchLast({ text: e.message, state: "error" });
    } finally {
      setBusy(false);
    }
  };

  // --- step 2: transfer -----------------------------------------------------
  const transfer = async () => {
    setBusy(true);
    setSteps([]);
    try {
      let current = null;
      const result = await aa.sendUsdv({
        account: accountRef.current,
        to: recipient,
        amount: 1000000n, // 1 USDV
        onStep: (text, extra) => {
          if (text !== current) { current = text; log(text, "pending"); }
          if (extra?.hash) {
            patchLast({ href: `https://chain.base.org/vibenet/explorer/tx/${extra.hash}` });
          }
        },
      });
      patchLast({
        text: `Confirmed in block ${result.blockNumber.toLocaleString()} · ${result.gasUsed.toLocaleString()} gas · phase ${result.phases.join(", ")}`,
        state: "done",
        href: `https://chain.base.org/vibenet/explorer/tx/${result.hash}`,
      });
      if (result.deployedByThisTx) {
        log("The account deployed itself in that same transaction", "done");
      }
      await refreshBalances();
      log("1 USDV moved out of your balance and into the recipient's", "done");
    } catch (e) {
      patchLast({ text: e.message, state: "error" });
    } finally {
      setBusy(false);
    }
  };

  const newRecipient = () => {
    setRecipient(aa.randomAddress());
    setRecipientBalance(0n);
    setSteps([]);
  };

  // --- styling --------------------------------------------------------------
  const mono = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace";
  const card = { border: "1px solid rgba(128,128,128,0.28)", borderRadius: 12, padding: 20, fontSize: 14, lineHeight: 1.5 };
  const label = { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.6 };
  const btn = (disabled, primary) => ({
    padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600,
    border: "1px solid rgba(128,128,128,0.35)",
    background: primary && !disabled ? "#578BFA" : "transparent",
    color: primary && !disabled ? "#fff" : "inherit",
    opacity: disabled ? 0.45 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  });
  const dot = (state) => ({
    width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 6,
    background: state === "done" ? "#3fb950" : state === "error" ? "#f85149" : "#d29922",
  });
  const pane = { flex: "1 1 220px", border: "1px solid rgba(128,128,128,0.2)", borderRadius: 10, padding: 14 };

  if (error) return <div style={{ ...card, color: "#f85149" }}>{error}</div>;
  if (!aa || !account) return <div style={{ ...card, opacity: 0.6 }}>Creating a smart account…</div>;

  const funded = accountBalance > 0n;

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <strong>Fund an account, then pay from it</strong>
        <span style={{ ...label, fontFamily: mono }}>
          vibenet · {deployed ? "account deployed" : "not yet deployed"}
        </span>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        <div style={pane}>
          <div style={label}>Your EIP-8130 account</div>
          <div style={{ fontFamily: mono, fontSize: 12, wordBreak: "break-all", marginTop: 4, opacity: 0.85 }}>
            {account.address}
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, fontFamily: mono, marginTop: 8 }}>
            {aa.formatUnits(accountBalance)}
            <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.6 }}> USDV</span>
          </div>
        </div>

        <div style={pane}>
          <div style={label}>Random recipient</div>
          <div style={{ fontFamily: mono, fontSize: 12, wordBreak: "break-all", marginTop: 4, opacity: 0.85 }}>
            {recipient}
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, fontFamily: mono, marginTop: 8 }}>
            {aa.formatUnits(recipientBalance)}
            <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.6 }}> USDV</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        <button onClick={fund} disabled={busy} style={btn(busy, !funded)}>
          1 · Get a faucet drip
        </button>
        <button onClick={transfer} disabled={busy || !funded} style={btn(busy || !funded, funded)}>
          2 · Send 1 USDV to the random address
        </button>
        <button onClick={newRecipient} disabled={busy} style={btn(busy)}>
          New recipient
        </button>
      </div>

      {steps.length > 0 && (
        <div style={{ marginTop: 18, borderTop: "1px solid rgba(128,128,128,0.2)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {steps.map((step) => (
            <div key={step.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={dot(step.state)} />
              <span style={{ fontFamily: mono, fontSize: 13, color: step.state === "error" ? "#f85149" : "inherit" }}>
                {step.href ? <a href={step.href} target="_blank" rel="noreferrer">{step.text}</a> : step.text}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 12, opacity: 0.55 }}>
        Real transactions on the Vibenet devnet. USDV is unbacked test currency —
        the faucet mints it. The faucet allows one request per address every 10 seconds.
      </div>
    </div>
  );
};
