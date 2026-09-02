export const StablecoinDemo = ({ flow }) => {
  // No imports allowed in Mintlify snippets: useState/useEffect/useRef are injected globally.

  // Mintlify intercepts import(url), and snippets cannot import other snippets or
  // npm packages. The live engine therefore ships as .txt, is converted to a Blob
  // module on first interaction, and publishes its API on window.
  const loadVibenetEngine = () => {
    if (window.__baseDocsVibenetEngineV2) return Promise.resolve(window.__baseDocsVibenetEngineV2);
    if (window.__baseDocsVibenetEnginePromiseV2) return window.__baseDocsVibenetEnginePromiseV2;

    window.__baseDocsVibenetEnginePromiseV2 = new Promise((resolve, reject) => {
      const onReady = () => {
        cleanup();
        resolve(window.__baseDocsVibenetEngineV2);
      };
      const cleanup = () => window.removeEventListener("base-docs-vibenet-engine:v2-ready", onReady);
      window.addEventListener("base-docs-vibenet-engine:v2-ready", onReady, { once: true });

      (async () => {
        try {
          const fetchText = async (path) => {
            const response = await fetch(path, { cache: "force-cache" });
            if (!response.ok) throw new Error(`${path} returned ${response.status}`);
            return response.text();
          };
          const moduleUrl = (source) => URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
          const [aaSource, engineSource] = await Promise.all([
            fetchText("/static/aa.txt"),
            fetchText("/static/vibenet-engine.txt?v=2"),
          ]);
          const aaUrl = moduleUrl(aaSource);
          const rewritten = engineSource.replace('"./aa.txt"', JSON.stringify(aaUrl));
          if (rewritten === engineSource) throw new Error("Could not connect the Vibenet engine to the AA bundle");
          const tag = document.createElement("script");
          tag.type = "module";
          tag.src = moduleUrl(rewritten);
          tag.dataset.baseDocsVibenetEngine = "true";
          tag.onerror = () => {
            cleanup();
            window.__baseDocsVibenetEnginePromiseV2 = null;
            reject(new Error("Failed to evaluate the Vibenet engine"));
          };
          document.head.appendChild(tag);
        } catch (error) {
          cleanup();
          window.__baseDocsVibenetEnginePromiseV2 = null;
          reject(error);
        }
      })();
    });
    return window.__baseDocsVibenetEnginePromiseV2;
  };

  // Lightweight capability probe. This deliberately does not load aa.txt: the
  // ~minified bundle is fetched only when a reader presses a write-action button.
  const probeVibenet = async () => {
    const rpc = async (method, params = []) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4_000);
      try {
        const response = await fetch("https://api.vibes.base.org/api/vibenet/account/rpc", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
          signal: controller.signal,
        });
        const body = await response.json().catch(() => null);
        if (!response.ok || body?.error) throw new Error(body?.error?.message || `Vibenet returned ${response.status}`);
        return body.result;
      } finally {
        clearTimeout(timeout);
      }
    };
    const isActivated = async (feature) => {
      const data = `0xba87af80${feature.slice(2)}`;
      const result = await rpc("eth_call", [{ to: "0x8453000000000000000000000000000000000001", data }, "latest"]);
      return BigInt(result) === 1n;
    };
    const [chainId, blockNumber, genesis, stablecoin, policy] = await Promise.all([
      rpc("eth_chainId"),
      rpc("eth_blockNumber"),
      rpc("eth_getBlockByNumber", ["0x0", false]),
      isActivated("0xecfa0def2c10020caaf65e6155aa69c84b24892aaef76eeac52e0e2b3a0b8601"),
      isActivated("0xb582ebae03f16fee49a6763f78df482fb11ae73f103ed0d330bbe556aa90a43f"),
    ]);
    return {
      live: BigInt(chainId) === 84538453n && stablecoin && policy,
      blockNumber: Number(BigInt(blockNumber)),
      genesisHash: genesis?.hash || null,
      reason: !stablecoin ? "B20 stablecoins are not activated" : !policy ? "Policy writes are not activated" : null,
    };
  };

  // ----------------------------------------------------------------------
  // Color roles map to CSS custom properties defined in the <style> block,
  // so a single dark-theme block flips the whole demo. Values resolve at
  // render time; keep using C.* in inline styles exactly as before.
  // ----------------------------------------------------------------------
  const C = {
    blue: "var(--wf-blue)", onBlue: "var(--wf-on-blue)", cerulean: "var(--wf-cerulean)",
    ink: "var(--wf-ink)", body: "var(--wf-body)", sec: "var(--wf-sec)", sub: "var(--wf-sub)",
    border: "var(--wf-border)", panel: "var(--wf-panel)", white: "var(--wf-surface)",
    success: "var(--wf-success)", lime: "var(--wf-lime)", error: "var(--wf-error)", warn: "var(--wf-warn)",
    blueSoft: "var(--wf-blue-soft)", successSoft: "var(--wf-success-soft)", errorSoft: "var(--wf-error-soft)",
  };
  // Account markers use fixed brand hues that read on either theme.
  const dot = { Issuer: "#3c8aff", Alice: "#66c800", Bob: "#ffd12f", Merchant: "#3c8aff" };

  const TOKEN = "aUSD";
  const NETWORK = "Base Vibenet";

  // ---- result-line helpers ----
  const ok = (name, detail, href) => ({ kind: "ok", name, detail: detail || "", href });
  const err = (name, detail, href) => ({ kind: "err", name, detail: detail || "", href });
  const nfo = (name, detail, href) => ({ kind: "info", name, detail: detail || "", href });
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const M = (v) => ({ v, mono: true });

  const freshSim = () => ({ balances: {}, blocked: null });

  // ======================================================================
  // Scripted flows. Each step mutates a cloned sim and returns log lines.
  // ======================================================================
  const MOCK_FLOWS = {
    issue: {
      label: "Issue", title: "Issue a stablecoin in one call", readout: false,
      erc20: "On plain ERC-20 you write, deploy, and audit a token contract.",
      steps: [
        { stage: "Create", action: "Create token",
          text: "Create a fiat-backed token. Name, currency, and admin are set at creation.",
          summary: [["Operation", "Create token"], ["Token", TOKEN], ["Standard", "B20"], ["Network", NETWORK]],
          run: () => ({ entries: [ok("createB20", "stablecoin · aUSD · 0xB20…a1c9"), nfo("initCalls", "grantRole(MINT_ROLE, Issuer)")], caption: "One factory call, with no contract to write or audit." }) },
        { stage: "Confirm", action: "Confirm",
          text: "It's live and fully B20 compatible.",
          summary: [["currency()", M('"USD"')], ["decimals()", M("6")], ["Network", NETWORK]],
          run: () => ({ entries: [nfo("currency()", '"USD"'), nfo("decimals()", "6")], caption: "Every wallet and exchange that speaks ERC-20 works with it unchanged." }) },
      ],
    },
    mint: {
      label: "Mint", title: "Mint as reserves grow", readout: true,
      erc20: "On plain ERC-20, mint permissions and supply caps are custom code.",
      steps: [
        { stage: "Mint", action: "Mint 1,000",
          text: "1,000 in fiat lands in reserves. Mint matching supply.",
          summary: [["Operation", "Mint"], ["To", "Alice"], ["Amount", M("1,000 aUSD")], ["Network", NETWORK]],
          run: (s) => { s.balances.Alice = (s.balances.Alice || 0) + 1000; return { entries: [ok("Transfer", "0x0 → Alice · 1,000")] }; } },
        { stage: "Cap", action: "Cap at 1,200",
          text: "Cap supply so circulation can't exceed reserves.",
          summary: [["Operation", "Set supply cap"], ["Cap", M("1,200 aUSD")], ["Network", NETWORK]],
          run: () => ({ entries: [ok("SupplyCapUpdated", "cap 1,200")] }) },
        { stage: "Enforce", action: "Try minting 500",
          text: "A mint past the cap is rejected by the protocol.",
          summary: [["Operation", "Mint"], ["Amount", M("500 aUSD")], ["Guard", "Supply cap 1,200"], ["Network", NETWORK]],
          run: () => ({ entries: [err("SupplyCapExceeded", "cap 1,200 · supply 1,000")], caption: "Supply can never exceed the cap you set." }) },
      ],
    },
    burn: {
      label: "Burn", title: "Burn on redemption", readout: true,
      erc20: "On plain ERC-20, redemption bookkeeping is custom code.",
      steps: [
        { stage: "Fund", action: "Fund Alice",
          text: "Alice holds 1,000 aUSD.",
          summary: [["Operation", "Mint"], ["To", "Alice"], ["Amount", M("1,000 aUSD")]],
          run: (s) => { s.balances.Alice = 1000; return { entries: [ok("Transfer", "0x0 → Alice · 1,000")] }; } },
        { stage: "Return", action: "Return 400",
          text: "Alice redeems 400 for fiat and returns the tokens.",
          summary: [["Operation", "Transfer"], ["From", "Alice"], ["To", "Issuer"], ["Amount", M("400 aUSD")]],
          run: (s) => { s.balances.Alice -= 400; s.balances.Issuer = (s.balances.Issuer || 0) + 400; return { entries: [ok("Transfer", "Alice → Issuer · 400")] }; } },
        { stage: "Burn", action: "Burn 400",
          text: "Retire the returned tokens so supply matches reserves.",
          summary: [["Operation", "Burn"], ["From", "Issuer"], ["Amount", M("400 aUSD")], ["Memo", M('"redeem-8842"')]],
          run: (s) => { s.balances.Issuer -= 400; return { entries: [ok("Transfer", "Issuer → 0x0 · 400"), ok("Memo", '"redeem-8842"')], caption: "The burned tokens leave circulation for good." }; } },
      ],
    },
    restrict: {
      label: "Restrict", title: "Only approved accounts can hold it", readout: true,
      erc20: "On plain ERC-20, KYC gating is a custom transfer hook you build and audit.",
      steps: [
        { stage: "Enable", action: "Enable allowlist",
          text: "Turn on your KYC allowlist. Approve Alice and your merchant.",
          summary: [["Operation", "Enable allowlist"], ["Policy", "#2 · ALLOWLIST"], ["Approved", "Alice, Merchant"], ["Network", NETWORK]],
          run: () => ({ entries: [ok("PolicyCreated", "#2 · ALLOWLIST"), ok("updateAllowlist", "allow Alice, Merchant"), ok("PolicyUpdated", "TRANSFER_SENDER, TRANSFER_RECEIVER → #2")], caption: "Every account is denied until you approve it." }) },
        { stage: "Transact", action: "Alice pays merchant",
          text: "Approved accounts transact normally.",
          summary: [["Operation", "Transfer"], ["From", "Alice"], ["To", "Merchant"], ["Amount", M("40 aUSD")]],
          run: (s) => { s.balances.Alice = 100 - 40; s.balances.Merchant = 40; return { entries: [ok("Transfer", "0x0 → Alice · 100"), ok("Transfer", "Alice → Merchant · 40")] }; } },
        { stage: "Enforce", action: "Try paying Bob",
          text: "An account you haven't approved is turned away.",
          summary: [["Operation", "Transfer"], ["To", "Bob"], ["Policy", "Allowlist #2"], ["Status", "Denied"]],
          run: () => ({ entries: [err("PolicyForbids", "TRANSFER_RECEIVER · Bob")], caption: "Bob isn't on the allowlist, so the transfer can't land." }) },
      ],
    },
    block: {
      label: "Block", title: "Block one address, leave everyone else", readout: true,
      erc20: "On plain ERC-20, a blocklist is custom contract code.",
      steps: [
        { stage: "Fund", action: "Mint to Bob",
          text: "Bob holds 50 aUSD.",
          summary: [["Operation", "Mint"], ["To", "Bob"], ["Amount", M("50 aUSD")]],
          run: (s) => { s.balances.Bob = 50; return { entries: [ok("Transfer", "0x0 → Bob · 50")] }; } },
        { stage: "Block", action: "Block address",
          text: "A compliance hold comes in for Bob's address.",
          summary: [["Operation", "Block"], ["Account", "Bob"], ["Policy", "Blocklist"], ["Network", NETWORK]],
          run: (s) => { s.blocked = "Bob"; return { entries: [ok("updateBlocklist", "add Bob"), ok("PolicyUpdated", "TRANSFER_SENDER → blocklist")], caption: "Only Bob is affected. The token keeps trading for everyone else." }; } },
        { stage: "Enforce", action: "Bob tries to pay",
          text: "Bob can no longer move funds.",
          summary: [["Operation", "Transfer"], ["From", "Bob"], ["Policy", "Blocklist"], ["Status", "Denied"]],
          run: () => ({ entries: [err("PolicyForbids", "TRANSFER_SENDER · Bob")], caption: "Blocked by the protocol, not by custom contract code." }) },
        { stage: "Unblock", action: "Unblock",
          text: "When the hold clears, unblock the address.",
          summary: [["Operation", "Unblock"], ["Account", "Bob"], ["Policy", "Blocklist"]],
          run: (s) => { s.blocked = null; return { entries: [ok("updateBlocklist", "remove Bob")], caption: "Bob can transact again." }; } },
      ],
    },
    recover: {
      label: "Recover", title: "Recover funds from a blocked account", readout: true,
      erc20: "On plain ERC-20, there's no safe recovery path without custom code.",
      steps: [
        { stage: "Setup", action: "Set up",
          text: "Bob's address is blocked and holds 50 aUSD.",
          summary: [["Operation", "Block + fund"], ["Account", "Bob"], ["Amount", M("50 aUSD")]],
          run: (s) => { s.balances.Bob = 50; s.blocked = "Bob"; return { entries: [ok("Transfer", "0x0 → Bob · 50"), ok("updateBlocklist", "add Bob")] }; } },
        { stage: "Reclaim", action: "Reclaim funds",
          text: "A holder lost their keys. Reclaim the balance.",
          summary: [["Operation", "Recover"], ["From", "Bob (blocked)"], ["Amount", M("50 aUSD")]],
          run: (s) => { s.balances.Bob = 0; return { entries: [ok("Transfer", "Bob → 0x0 · 50 (recovered)")], caption: "Recovery only works on an account that's already blocked." }; } },
        { stage: "Reissue", action: "Reissue",
          text: "Reissue to the holder's new address.",
          summary: [["Operation", "Mint"], ["To", "Alice"], ["Amount", M("50 aUSD")]],
          run: (s) => { s.balances.Alice = (s.balances.Alice || 0) + 50; return { entries: [ok("Transfer", "0x0 → Alice · 50")], caption: "Circulating supply is unchanged: reclaimed, then reissued." }; } },
      ],
    },
    pause: {
      label: "Pause", title: "Halt activity in an incident", readout: true,
      erc20: "On plain ERC-20, a pause switch is custom code, usually all-or-nothing.",
      steps: [
        { stage: "Fund", action: "Fund Alice",
          text: "Alice holds 100 aUSD. Everything is running normally.",
          summary: [["Operation", "Mint"], ["To", "Alice"], ["Amount", M("100 aUSD")]],
          run: (s) => { s.balances.Alice = 100; return { entries: [ok("Transfer", "0x0 → Alice · 100")] }; } },
        { stage: "Pause", action: "Pause transfers",
          text: "An incident hits. Halt transfers instantly.",
          summary: [["Operation", "Pause"], ["Scope", "TRANSFER"], ["Network", NETWORK]],
          run: () => ({ entries: [ok("Paused", "TRANSFER")], caption: "Only transfers stop. Pausing is granular." }) },
        { stage: "Enforce", action: "Try a transfer",
          text: "No one can move funds while transfers are paused.",
          summary: [["Operation", "Transfer"], ["Scope", "TRANSFER (paused)"], ["Status", "Blocked"]],
          run: () => ({ entries: [err("EnforcedPause", "TRANSFER is paused")] }) },
        { stage: "Resume", action: "Resume",
          text: "Resume once the incident is resolved.",
          summary: [["Operation", "Unpause"], ["Scope", "TRANSFER"]],
          run: () => ({ entries: [ok("Unpaused", "TRANSFER")], caption: "Transfers work again." }) },
      ],
    },
    reconcile: {
      label: "Reconcile", title: "Match a payment to an order", readout: false,
      erc20: "On plain ERC-20, transfers carry no reference, so you run a deposit address per customer.",
      steps: [
        { stage: "Pay", action: "Pay with memo",
          text: "Alice pays your processor 25 aUSD, tagged with the invoice.",
          summary: [["Operation", "Transfer"], ["From", "Alice"], ["To", "Merchant"], ["Amount", M("25 aUSD")], ["Memo", M('"invoice-8842"')]],
          run: () => ({ entries: [ok("Transfer", "Alice → Merchant · 25"), ok("Memo", '"invoice-8842"')], caption: "One transaction carries both the payment and the reference." }) },
        { stage: "Match", action: "Match payment",
          text: "The back office matches the payment to the order.",
          summary: [["Operation", "Reconcile"], ["Query", M("(txHash, logIndex−1)")], ["Matched", "invoice-8842 → 25 aUSD"]],
          run: () => ({ entries: [nfo("query", "Transfer at (txHash, Memo.logIndex − 1)"), nfo("matched", '"invoice-8842" → 25 aUSD ✓')], caption: "Reconciliation is one log query, not a deposit address per customer." }) },
      ],
    },
  };

  const order = ["issue", "mint", "burn", "restrict", "block", "recover", "pause", "reconcile"];
  const pinned = flow && MOCK_FLOWS[flow] ? flow : null;

  const [active, setActive] = useState(pinned || "issue");
  const [sim, setSim] = useState(freshSim);
  const [results, setResults] = useState([]);
  const [liveState, setLiveState] = useState("probing");
  const [probeInfo, setProbeInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [accountAddress, setAccountAddress] = useState(null);
  const [accountCopied, setAccountCopied] = useState(false);
  const [accountTokenBalance, setAccountTokenBalance] = useState(null);
  const liveContext = useRef(null);

  useEffect(() => {
    let cancelled = false;
    probeVibenet()
      .then((info) => {
        if (cancelled) return;
        setProbeInfo(info);
        setLiveState(info.live ? "live" : "offline");
        if (info.live && info.genesisHash) {
          try {
            const stored = JSON.parse(localStorage.getItem("base.docs.vibenet.account.v1") || "null");
            if (stored?.genesisHash === info.genesisHash && stored.address) setAccountAddress(stored.address);
          } catch {
            // The engine will replace corrupt or stale state on first use.
          }
        }
      })
      .catch(() => {
        if (!cancelled) setLiveState("offline");
      });
    return () => { cancelled = true; };
  }, []);

  const f = MOCK_FLOWS[active] || MOCK_FLOWS.issue;
  const stepIndex = results.length;
  const done = stepIndex >= f.steps.length;

  // Copy changes only where the real flow must describe what actually happens.
  // The offline path continues to render the original mock copy and mutations.
  const LIVE_COPY = {
    burn: [
      {
        action: "Fund issuer",
        text: "Mint 1,000 aUSD into the issuer account so it has redeemed supply to burn.",
        summary: [["Operation", "Mint"], ["To", "Issuer"], ["Amount", M("1,000 aUSD")], ["Network", NETWORK]],
      },
      {
        action: "Confirm redemption",
        text: "Confirm the returned tokens are in the issuer account. Fiat settlement happens offchain.",
        summary: [["Operation", "Balance check"], ["Holder", "Issuer"], ["Available", M("1,000 aUSD")], ["Network", NETWORK]],
      },
    ],
  };
  const displayStep = (index) => {
    const base = f.steps[index];
    return liveState === "live" && LIVE_COPY[active]?.[index]
      ? { ...base, ...LIVE_COPY[active][index] }
      : base;
  };
  const cur = displayStep(done ? f.steps.length - 1 : stepIndex);

  const short = (address) => `${address.slice(0, 6)}…${address.slice(-4)}`;
  const txOk = (engine, name, detail, tx) => ok(name, detail, engine.explorerTx(tx.hash));

  const ensureLiveContext = async (engine) => {
    if (liveContext.current) return liveContext.current;
    const shared = await engine.getSharedAccount();
    setAccountAddress(shared.account.address);
    liveContext.current = {
      account: shared.account.address,
      token: null,
      policyId: null,
      addresses: {
        Issuer: shared.account.address,
        Alice: shared.account.address,
        Bob: engine.randomAddress(),
        Merchant: engine.randomAddress(),
      },
    };
    return liveContext.current;
  };

  const setBalance = async (engine, ctx, state, label) => {
    state.balances[label] = engine.displayUnits(await engine.balanceOf(ctx.token, ctx.addresses[label]));
  };

  const createToken = async (engine, ctx, options = {}) => {
    const created = await engine.createStablecoin({
      name: `Docs ${active[0].toUpperCase()}${active.slice(1)} Dollar`,
      symbol: TOKEN,
      currency: "USD",
      ...options,
    });
    ctx.token = created.token;
    ctx.createTx = created;
    return created;
  };

  const LIVE_RUNNERS = {
    issue: [
      async (engine, ctx) => {
        const created = await createToken(engine, ctx);
        return {
          entries: [
            txOk(engine, "B20Created", `stablecoin · ${TOKEN} · ${short(created.token)}`, created),
            nfo("DEFAULT_ADMIN_ROLE", short(ctx.account), engine.explorerAddress(ctx.account)),
          ],
          caption: "A real stablecoin was created through the Vibenet B20 factory.",
        };
      },
      async (engine, ctx) => {
        const details = await engine.tokenDetails(ctx.token);
        return {
          entries: [
            nfo("currency()", `"${details.currency}"`, engine.explorerAddress(ctx.token)),
            nfo("decimals()", String(details.decimals), engine.explorerAddress(ctx.token)),
          ],
          caption: `Read directly from ${short(ctx.token)} on Vibenet.`,
        };
      },
    ],
    mint: [
      async (engine, ctx, state) => {
        const created = await createToken(engine, ctx, { initialMint: engine.units(1000), mintTo: ctx.addresses.Alice });
        await setBalance(engine, ctx, state, "Alice");
        return {
          entries: [
            txOk(engine, "B20Created", short(created.token), created),
            txOk(engine, "Transfer", "0x0 → Alice · 1,000", created),
          ],
        };
      },
      async (engine, ctx) => {
        const tx = await engine.setSupplyCap({ token: ctx.token, amount: engine.units(1200) });
        return { entries: [txOk(engine, "SupplyCapUpdated", "cap 1,200", tx)] };
      },
      async (engine, ctx) => {
        const rejected = await engine.expectRevert({
          from: ctx.account,
          token: ctx.token,
          functionName: "mint",
          args: [ctx.addresses.Alice, engine.units(500)],
          expected: "SupplyCapExceeded",
        });
        return {
          entries: [err(rejected.name, "Vibenet eth_call · cap 1,200 · supply 1,000")],
          caption: "The live B20 precompile rejected the over-cap mint during execution simulation.",
        };
      },
    ],
    burn: [
      async (engine, ctx, state) => {
        const created = await createToken(engine, ctx, { initialMint: engine.units(1000), mintTo: ctx.account });
        state.balances = {};
        await setBalance(engine, ctx, state, "Issuer");
        return { entries: [txOk(engine, "Transfer", "0x0 → Issuer · 1,000", created)] };
      },
      async (engine, ctx, state) => {
        await setBalance(engine, ctx, state, "Issuer");
        return {
          entries: [nfo("balanceOf", `Issuer · ${fmt(state.balances.Issuer)} aUSD`, engine.explorerAddress(ctx.token))],
          caption: "The burn account already holds the returned supply; reserve settlement is offchain.",
        };
      },
      async (engine, ctx, state) => {
        const tx = await engine.burn({ token: ctx.token, amount: engine.units(400), memo: "redeem-8842" });
        await setBalance(engine, ctx, state, "Issuer");
        return {
          entries: [
            txOk(engine, "Transfer", "Issuer → 0x0 · 400", tx),
            txOk(engine, "Memo", '"redeem-8842"', tx),
          ],
          caption: "The live total supply and issuer balance both fell by 400 aUSD.",
        };
      },
    ],
    restrict: [
      async (engine, ctx, state) => {
        const policy = await engine.createPolicy({
          kind: "allowlist",
          accounts: [ctx.addresses.Alice, ctx.addresses.Merchant],
        });
        ctx.policyId = policy.id;
        const created = await createToken(engine, ctx, {
          initialMint: engine.units(100),
          mintTo: ctx.addresses.Alice,
          policies: [
            { scope: "TRANSFER_SENDER_POLICY", id: policy.id },
            { scope: "TRANSFER_RECEIVER_POLICY", id: policy.id },
          ],
        });
        await Promise.all([
          setBalance(engine, ctx, state, "Alice"),
          setBalance(engine, ctx, state, "Merchant"),
        ]);
        return {
          entries: [
            txOk(engine, "PolicyCreated", `#${policy.id} · ALLOWLIST`, policy),
            txOk(engine, "PolicyUpdated", `TRANSFER_SENDER, TRANSFER_RECEIVER → #${policy.id}`, created),
            txOk(engine, "Transfer", "0x0 → Alice · 100", created),
          ],
          caption: "The allowlist and both token policy scopes are live on Vibenet.",
        };
      },
      async (engine, ctx, state) => {
        const tx = await engine.transfer({ token: ctx.token, to: ctx.addresses.Merchant, amount: engine.units(40) });
        await Promise.all([
          setBalance(engine, ctx, state, "Alice"),
          setBalance(engine, ctx, state, "Merchant"),
        ]);
        return { entries: [txOk(engine, "Transfer", "Alice → Merchant · 40", tx)] };
      },
      async (engine, ctx) => {
        const rejected = await engine.expectRevert({
          from: ctx.addresses.Alice,
          token: ctx.token,
          functionName: "transfer",
          args: [ctx.addresses.Bob, engine.units(1)],
          expected: "PolicyForbids",
        });
        return {
          entries: [err(rejected.name, "TRANSFER_RECEIVER · Bob · Vibenet eth_call")],
          caption: "Bob is absent from the live allowlist, so the B20 precompile rejected the transfer.",
        };
      },
    ],
    block: [
      async (engine, ctx, state) => {
        const created = await createToken(engine, ctx, { initialMint: engine.units(50), mintTo: ctx.addresses.Bob });
        await setBalance(engine, ctx, state, "Bob");
        return { entries: [txOk(engine, "Transfer", "0x0 → Bob · 50", created)] };
      },
      async (engine, ctx, state) => {
        const policy = await engine.createPolicy({ kind: "blocklist", accounts: [ctx.addresses.Bob] });
        ctx.policyId = policy.id;
        const attached = await engine.attachPolicy({ token: ctx.token, scope: "TRANSFER_SENDER_POLICY", id: policy.id });
        state.blocked = "Bob";
        return {
          entries: [
            txOk(engine, "PolicyCreated", `#${policy.id} · BLOCKLIST`, policy),
            txOk(engine, "PolicyUpdated", "TRANSFER_SENDER → blocklist", attached),
          ],
          caption: "Only Bob is denied by the live sender policy.",
        };
      },
      async (engine, ctx) => {
        const rejected = await engine.expectRevert({
          from: ctx.addresses.Bob,
          token: ctx.token,
          functionName: "transfer",
          args: [ctx.addresses.Merchant, engine.units(1)],
          expected: "PolicyForbids",
        });
        return {
          entries: [err(rejected.name, "TRANSFER_SENDER · Bob · Vibenet eth_call")],
          caption: "The call executes against Vibenet state with Bob as msg.sender and is rejected by policy.",
        };
      },
      async (engine, ctx, state) => {
        const tx = await engine.updateBlocklist({ id: ctx.policyId, blocked: false, accounts: [ctx.addresses.Bob] });
        state.blocked = null;
        return { entries: [txOk(engine, "BlocklistUpdated", "remove Bob", tx)], caption: "Bob is authorized again." };
      },
    ],
    recover: [
      async (engine, ctx, state) => {
        const policy = await engine.createPolicy({ kind: "blocklist", accounts: [ctx.addresses.Bob] });
        ctx.policyId = policy.id;
        const created = await createToken(engine, ctx, {
          initialMint: engine.units(50),
          mintTo: ctx.addresses.Bob,
          policies: [{ scope: "TRANSFER_SENDER_POLICY", id: policy.id }],
        });
        state.blocked = "Bob";
        await setBalance(engine, ctx, state, "Bob");
        return {
          entries: [
            txOk(engine, "PolicyCreated", `#${policy.id} · BLOCKLIST`, policy),
            txOk(engine, "Transfer", "0x0 → Bob · 50", created),
            txOk(engine, "PolicyUpdated", "TRANSFER_SENDER → blocklist", created),
          ],
        };
      },
      async (engine, ctx, state) => {
        const tx = await engine.burnBlocked({ token: ctx.token, from: ctx.addresses.Bob, amount: engine.units(50) });
        await setBalance(engine, ctx, state, "Bob");
        return {
          entries: [
            txOk(engine, "Transfer", "Bob → 0x0 · 50", tx),
            txOk(engine, "BurnedBlocked", "Bob · 50", tx),
          ],
          caption: "Recovery uses the stablecoin flow documented above: burnBlocked, then reissue.",
        };
      },
      async (engine, ctx, state) => {
        const tx = await engine.mint({ token: ctx.token, to: ctx.addresses.Alice, amount: engine.units(50) });
        await setBalance(engine, ctx, state, "Alice");
        return { entries: [txOk(engine, "Transfer", "0x0 → Alice · 50", tx)], caption: "The replacement balance is live on Vibenet." };
      },
    ],
    pause: [
      async (engine, ctx, state) => {
        const created = await createToken(engine, ctx, { initialMint: engine.units(100), mintTo: ctx.addresses.Alice });
        await setBalance(engine, ctx, state, "Alice");
        return { entries: [txOk(engine, "Transfer", "0x0 → Alice · 100", created)] };
      },
      async (engine, ctx) => {
        const tx = await engine.setTransfersPaused({ token: ctx.token, paused: true });
        const paused = await engine.isTransferPaused(ctx.token);
        return { entries: [txOk(engine, "Paused", paused ? "TRANSFER" : "unexpected state", tx)], caption: "Only the TRANSFER feature is paused." };
      },
      async (engine, ctx) => {
        const rejected = await engine.expectRevert({
          from: ctx.addresses.Alice,
          token: ctx.token,
          functionName: "transfer",
          args: [ctx.addresses.Bob, engine.units(1)],
          expected: "ContractPaused",
        });
        return { entries: [err(rejected.name, "TRANSFER · Vibenet eth_call")] };
      },
      async (engine, ctx) => {
        const tx = await engine.setTransfersPaused({ token: ctx.token, paused: false });
        const paused = await engine.isTransferPaused(ctx.token);
        return { entries: [txOk(engine, "Unpaused", paused ? "unexpected state" : "TRANSFER", tx)], caption: "Transfers are enabled again." };
      },
    ],
    reconcile: [
      async (engine, ctx) => {
        const created = await createToken(engine, ctx, { initialMint: engine.units(25), mintTo: ctx.addresses.Alice });
        const payment = await engine.transfer({
          token: ctx.token,
          to: ctx.addresses.Merchant,
          amount: engine.units(25),
          memo: "invoice-8842",
        });
        ctx.payment = payment;
        return {
          entries: [
            txOk(engine, "B20Created", short(created.token), created),
            txOk(engine, "Transfer", "Alice → Merchant · 25", payment),
            txOk(engine, "Memo", '"invoice-8842"', payment),
          ],
          caption: "The payment and bytes32 invoice reference are both in the Vibenet receipt.",
        };
      },
      async (engine, ctx) => {
        const memo = engine.readMemoFromReceipt(ctx.payment.receipt);
        const paid = engine.displayUnits(await engine.balanceOf(ctx.token, ctx.addresses.Merchant));
        return {
          entries: [
            nfo("query", `Memo at log ${memo.logIndex}; Transfer at log ${memo.logIndex - 1}`, engine.explorerTx(ctx.payment.hash)),
            nfo("matched", `"${memo.text}" → ${paid} aUSD ✓`, engine.explorerTx(ctx.payment.hash)),
          ],
          caption: "Reconciliation was derived from the real transaction logs.",
        };
      },
    ],
  };

  const select = (k) => {
    setActive(k);
    setSim(freshSim());
    setResults([]);
    setActionError(null);
    setAccountTokenBalance(null);
    liveContext.current = null;
  };
  const reset = () => {
    setSim(freshSim());
    setResults([]);
    setActionError(null);
    setAccountTokenBalance(null);
    liveContext.current = null;
  };
  const runMockStep = () => {
    if (done) return;
    const s = { balances: { ...sim.balances }, blocked: sim.blocked };
    const out = f.steps[stepIndex].run(s) || { entries: [] };
    setSim(s);
    setResults((r) => [...r, out]);
  };
  const runStep = async () => {
    if (done || busy || liveState === "probing") return;
    if (liveState === "offline") {
      runMockStep();
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      const engine = await loadVibenetEngine();
      const ctx = await ensureLiveContext(engine);
      const state = { balances: { ...sim.balances }, blocked: sim.blocked };
      const out = await LIVE_RUNNERS[active][stepIndex](engine, ctx, state);
      if (ctx.token) {
        try {
          setAccountTokenBalance(engine.displayUnits(await engine.balanceOf(ctx.token, ctx.account)));
        } catch {
          setAccountTokenBalance(null);
        }
      }
      setSim(state);
      setResults((current) => [...current, out || { entries: [] }]);
    } catch (error) {
      // If the devnet or its gated features disappeared before the first write,
      // degrade to the unchanged scripted flow instead of surfacing a broken demo.
      if (results.length === 0) {
        try {
          const latest = await probeVibenet();
          if (!latest.live) {
            setProbeInfo(latest);
            setLiveState("offline");
            setAccountTokenBalance(null);
            liveContext.current = null;
            runMockStep();
            return;
          }
        } catch {
          setLiveState("offline");
          setAccountTokenBalance(null);
          liveContext.current = null;
          runMockStep();
          return;
        }
      }
      setActionError(error?.message || String(error));
    } finally {
      setBusy(false);
    }
  };
  const back = () => {
    if (liveState === "live") return;
    const n = results.length - 1;
    if (n < 0) return;
    let s = freshSim();
    for (let i = 0; i < n; i++) f.steps[i].run(s);
    setSim(s);
    setResults((r) => r.slice(0, -1));
  };

  // ---- event log (flatten results + pending, deterministic timestamps) ----
  const pad = (n) => String(n).padStart(2, "0");
  const ts = (n) => { const t = (42 * 60 + 11) + n; return `10:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}`; };
  const logRows = [];
  let sec = 0;
  results.forEach((res) => {
    (res.entries || []).forEach((e) => {
      logRows.push({ t: ts(sec++), level: e.kind === "err" ? "ERROR" : e.kind === "info" ? "INFO" : "EVENT", name: e.name, detail: e.detail, kind: e.kind, href: e.href });
    });
  });
  f.steps.slice(stepIndex).forEach((_, offset) => { logRows.push({ t: ts(sec++), level: "PENDING", name: displayStep(stepIndex + offset).action, detail: "", kind: "pending" }); });

  const holders = Object.keys(sim.balances);

  // ---- small building blocks ----
  const StatusTag = ({ state }) => {
    const map = { done: [C.success, "Complete"], now: [C.blue, "In progress"], future: [C.sub, "Pending"] };
    const [col, txt] = map[state];
    return <span className="wf-t-footnote" style={{ color: col }}>{txt}</span>;
  };

  const levelColor = { EVENT: C.blue, INFO: C.sec, ERROR: C.error, PENDING: C.sub };
  const copyAccountAddress = async () => {
    if (!accountAddress) return;
    try {
      await navigator.clipboard.writeText(accountAddress);
    } catch {
      const input = document.createElement("textarea");
      input.value = accountAddress;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setAccountCopied(true);
    setTimeout(() => setAccountCopied(false), 1_500);
  };
  const badge = liveState === "live"
    ? { text: accountAddress ? short(accountAddress) : "Vibenet account", color: C.sub, border: C.border }
    : liveState === "offline"
      ? { text: "Offline mock", color: C.warn, border: C.warn }
      : { text: "Checking Vibenet", color: C.sub, border: C.border };

  return (
    <div className="wf" style={{ margin: "22px 0", maxWidth: 760, borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, overflow: "hidden", boxShadow: "var(--wf-shadow)" }}>
      <style>{`
        /* ---- Base design system: color tokens (light) ---- */
        .wf {
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
          .wf {
            --wf-blue: #4d6bff; --wf-on-blue: #ffffff; --wf-cerulean: #6ea8ff;
            --wf-ink: #ffffff; --wf-body: #dee1e7; --wf-sec: #b1b7c3; --wf-sub: #8a91a0; --wf-muted: #787878;
            --wf-border: #2b2f36; --wf-panel: #17181b; --wf-surface: #0f1012;
            --wf-success: #7cd442; --wf-lime: #b6f569; --wf-error: #ff6a4d; --wf-warn: #ffd12f;
            --wf-blue-soft: rgba(77,107,255,.16); --wf-success-soft: rgba(124,212,66,.16); --wf-error-soft: rgba(255,106,77,.16);
            --wf-shadow: 0 1px 2px rgba(0,0,0,.4);
          }
        }
        /* ---- Dark theme: docs explicit toggle wins over system ---- */
        html.dark .wf, :root[data-theme="dark"] .wf, [data-theme="dark"] .wf {
          --wf-blue: #4d6bff; --wf-on-blue: #ffffff; --wf-cerulean: #6ea8ff;
          --wf-ink: #ffffff; --wf-body: #dee1e7; --wf-sec: #b1b7c3; --wf-sub: #8a91a0; --wf-muted: #787878;
          --wf-border: #2b2f36; --wf-panel: #17181b; --wf-surface: #0f1012;
          --wf-success: #7cd442; --wf-lime: #b6f569; --wf-error: #ff6a4d; --wf-warn: #ffd12f;
          --wf-blue-soft: rgba(77,107,255,.16); --wf-success-soft: rgba(124,212,66,.16); --wf-error-soft: rgba(255,106,77,.16);
          --wf-shadow: 0 1px 2px rgba(0,0,0,.4);
        }
        /* ---- Light theme: docs explicit toggle wins over system dark ---- */
        html.light .wf, :root[data-theme="light"] .wf, [data-theme="light"] .wf {
          --wf-blue: #0000ff; --wf-on-blue: #ffffff; --wf-cerulean: #3c8aff;
          --wf-ink: #0a0b0d; --wf-body: #32353d; --wf-sec: #5b616e; --wf-sub: #717886; --wf-muted: #787878;
          --wf-border: #dee1e7; --wf-panel: #eef0f3; --wf-surface: #ffffff;
          --wf-success: #66c800; --wf-lime: #b6f569; --wf-error: #fc401f; --wf-warn: #ffd12f;
          --wf-blue-soft: rgba(0,0,255,.06); --wf-success-soft: rgba(102,200,0,.12); --wf-error-soft: rgba(252,64,31,.10);
          --wf-shadow: 0 1px 2px rgba(10,11,13,.04);
        }

        .wf, .wf * { box-sizing: border-box; }

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

        .wf-nav { display: flex; gap: 20px; }
        .wf-split { display: grid; grid-template-columns: 43% 57%; }
        .wf-rail { border-right: 1px solid ${C.border}; }
        @keyframes wf-in { from { opacity: 0; transform: translateY(3px);} to { opacity: 1; transform: none; } }
        .wf-anim { animation: wf-in .26s ease both; }
        .wf-btn { font-family: var(--wf-sans); font-size: 14px; font-weight: 500; letter-spacing: -0.01em; border-radius: 6px; padding: 10px 14px; cursor: pointer; transition: filter .15s ease; border: 1px solid ${C.blue}; background: ${C.blue}; color: ${C.onBlue}; width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 7px; }
        .wf-btn:hover { filter: brightness(1.1); }
        .wf-btn:disabled { background: ${C.panel}; border-color: ${C.border}; color: ${C.sub}; cursor: default; filter: none; }
        a.wf-btn, a.wf-btn:visited { color: ${C.onBlue}; }
        .wf-btn2 { font-family: var(--wf-sans); font-size: 14px; font-weight: 500; letter-spacing: -0.01em; border-radius: 6px; padding: 10px 14px; cursor: pointer; background: ${C.white}; border: 1px solid ${C.border}; color: ${C.body}; width: 100%; transition: background .15s ease; }
        .wf-btn2:hover { background: ${C.panel}; }
        .wf-pill { font-family: var(--wf-sans); font-size: 12px; font-weight: 500; border-radius: 6px; padding: 5px 10px; cursor: pointer; white-space: nowrap; color: ${C.sec}; background: ${C.white}; border: 1px solid ${C.border}; transition: all .12s ease; }
        .wf-pill:not(.wf-pill-on):hover { color: ${C.ink}; border-color: ${C.sub}; }
        .wf-pill-on { color: ${C.onBlue}; background: ${C.blue}; border-color: ${C.blue}; }
        .wf-stage { font-family: var(--wf-sans); font-size: 12.5px; white-space: nowrap; padding: 11px 2px; border-bottom: 2px solid transparent; display: inline-flex; align-items: center; gap: 7px; }
        .wf .wf-log-link, .wf .wf-log-link:visited { text-decoration: none !important; border-bottom: 0 !important; background-image: none !important; box-shadow: none !important; }
        .wf .wf-log-link:hover .wf-log-label { color: ${C.blue}; }
        @media (max-width: 640px) {
          .wf-split { grid-template-columns: 1fr; }
          .wf-rail { border-right: none; border-bottom: 1px solid ${C.border}; }
          .wf-nav { display: none; }
          .wf-stages { overflow-x: auto; }
        }
        @media (prefers-reduced-motion: reduce) { .wf-anim { animation: none !important; } }
      `}</style>

      {/* Scenario selector (only when not pinned) */}
      {!pinned && (
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, padding: "10px 16px", borderBottom: `1px solid ${C.border}`, background: C.panel }}>
          <span className="wf-t-caption" style={{ color: C.sub, marginRight: 4 }}>Scenario</span>
          {order.map((k) => (
            <button key={k} className={k === active ? "wf-pill wf-pill-on" : "wf-pill"} onClick={() => select(k)}>{MOCK_FLOWS[k].label}</button>
          ))}
        </div>
      )}

      {/* Stage navigation + demo tag + reset */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px", borderBottom: `1px solid ${C.border}`, background: C.white }}>
        <div className="wf-stages" style={{ display: "flex", gap: 22, flex: 1, minWidth: 0, overflowX: "auto" }}>
          {f.steps.map((_, i) => {
            const st = displayStep(i);
            const state = i < stepIndex ? "done" : i === stepIndex ? "now" : "future";
            const col = state === "future" ? C.sub : state === "now" ? C.blue : C.ink;
            return (
              <span key={i} className="wf-stage" style={{ color: col, borderBottomColor: state === "now" ? C.blue : "transparent", fontWeight: state === "now" ? 600 : 500 }}>
                <span style={{ fontFamily: "var(--wf-mono)", fontSize: 11, opacity: .7 }}>{i + 1}</span>{st.stage}
                {state === "done" && <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke={C.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
              </span>
            );
          })}
        </div>
        <div
          title={liveState === "live" && accountAddress ? `Vibenet demo account: ${accountAddress}${accountTokenBalance !== null ? ` · ${fmt(accountTokenBalance)} ${TOKEN}` : ""}` : liveState === "offline" ? (probeInfo?.reason || "Vibenet is unavailable") : NETWORK}
          style={{ display: "inline-flex", alignItems: "center", gap: 3, color: badge.color, border: `1px solid ${badge.border}`, borderRadius: 5, padding: accountAddress && liveState === "live" ? "2px 3px 2px 6px" : "2px 6px", flexShrink: 0 }}
        >
          <span className="wf-t-caption" style={accountAddress && liveState === "live" ? { fontFamily: "var(--wf-mono)", textTransform: "none", letterSpacing: 0 } : undefined}>{badge.text}</span>
          {liveState === "live" && accountAddress && accountTokenBalance !== null && (
            <>
              <span aria-hidden="true" style={{ color: C.border }}>·</span>
              <span className="wf-t-caption" style={{ color: C.body, fontFamily: "var(--wf-mono)", textTransform: "none", letterSpacing: 0, whiteSpace: "nowrap" }}>{fmt(accountTokenBalance)} {TOKEN}</span>
            </>
          )}
          {liveState === "live" && accountAddress && (
            <button
              type="button"
              aria-label={accountCopied ? "Account address copied" : "Copy account address"}
              title={accountCopied ? "Copied" : "Copy address"}
              onClick={copyAccountAddress}
              style={{ width: 19, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", color: accountCopied ? C.success : C.sub, background: "transparent", border: 0, borderRadius: 3, padding: 0, cursor: "pointer" }}
            >
              {accountCopied ? (
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></svg>
              )}
            </button>
          )}
        </div>
        {results.length > 0 && (
          <button onClick={reset} title="Reset" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 24, borderRadius: 6, background: "transparent", border: `1px solid ${C.border}`, cursor: "pointer", color: C.sec, flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
          </button>
        )}
      </div>

      {/* Split workspace */}
      <div className="wf-split">
        {/* Left progress rail */}
        <div className="wf-rail" style={{ padding: "16px 16px 14px", background: C.white }}>
          {f.steps.map((_, i) => {
            const st = displayStep(i);
            const state = i < stepIndex ? "done" : i === stepIndex ? "now" : "future";
            const last = i === f.steps.length - 1;
            return (
              <div key={i} style={{ display: "flex", gap: 11 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 24, flexShrink: 0 }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--wf-sans)", fontSize: 11.5, fontWeight: 600,
                    color: state === "future" ? C.sub : C.onBlue,
                    background: state === "done" ? C.success : state === "now" ? C.blue : "transparent",
                    border: `1.5px solid ${state === "done" ? C.success : state === "future" ? C.border : C.blue}`,
                  }}>
                    {state === "done" ? <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke={C.onBlue} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg> : i + 1}
                  </span>
                  {!last && <div style={{ flex: 1, width: 2, minHeight: 22, marginTop: 4, marginBottom: 2, background: i < stepIndex ? C.blue : C.border }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: last ? 0 : 14, minWidth: 0 }}>
                  <div className="wf-t-body" style={{ fontWeight: state === "future" ? 400 : 500, color: state === "future" ? C.sub : C.ink }}>{st.action}</div>
                  <div style={{ marginTop: 2 }}><StatusTag state={state} /></div>
                </div>
              </div>
            );
          })}

          {/* Balances readout */}
          {f.readout && holders.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              <div className="wf-t-caption" style={{ color: C.sub, marginBottom: 8 }}>Balances</div>
              <div style={{ display: "grid", gap: 6 }}>
                {holders.map((a) => (
                  <div key={a} className="wf-t-body" style={{ display: "flex", alignItems: "center", gap: 8, color: C.body }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot[a] || C.sub, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{a}</span>
                    {sim.blocked === a && <span className="wf-t-caption" style={{ color: C.error, border: `1px solid ${C.error}`, borderRadius: 4, padding: "0 4px" }}>Blocked</span>}
                    <span style={{ fontFamily: "var(--wf-mono)", fontSize: 12.5, fontWeight: 600, color: C.ink }}>{fmt(sim.balances[a] || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right inspector */}
        <div style={{ padding: "16px 18px", background: C.white, minWidth: 0 }}>
          {done ? (
            <div className="wf-anim">
              <div className="wf-t-footnote" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontWeight: 600, color: C.success, background: C.successSoft, borderRadius: 6, padding: "5px 10px" }}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke={C.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                Flow complete
              </div>
              <div className="wf-t-body" style={{ color: C.body, margin: "12px 0 16px" }}>
                {f.title} — {liveState === "live" ? "the write steps ran on Base Vibenet." : "the scripted offline fallback completed."}
              </div>
              <button className="wf-btn2" onClick={reset}>Run again</button>
              <a className="wf-btn" href="/base-chain/network-information/b20-token-standard" style={{ textDecoration: "none", color: C.onBlue, marginTop: 8, display: "flex", boxSizing: "border-box" }}>See technical details →</a>
            </div>
          ) : (
            <div className="wf-anim" key={stepIndex}>
              <div className="wf-t-headline" style={{ color: C.ink }}>{cur.action}</div>
              <div className="wf-t-body" style={{ color: C.sec, marginTop: 5 }}>{cur.text}</div>

              <div style={{ marginTop: 14, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
                {cur.summary.map(([k, val], i) => {
                  const isM = val && typeof val === "object" && val.mono;
                  const v = isM ? val.v : val;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "9px 12px", borderTop: i ? `1px solid ${C.border}` : "none" }}>
                      <span className="wf-t-footnote" style={{ color: C.sec }}>{k}</span>
                      <span style={{ fontFamily: isM ? "var(--wf-mono)" : "var(--wf-sans)", fontSize: isM ? 12 : 12.5, fontWeight: isM ? 500 : 600, color: C.ink, textAlign: "right", wordBreak: "break-word" }}>
                        {k === "Network" && <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: C.cerulean, marginRight: 6 }} />}
                        {v}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
                <button className="wf-btn" onClick={runStep} disabled={busy || liveState === "probing"}>
                  {liveState === "probing" ? "Checking Vibenet…" : busy ? "Submitting…" : cur.action}
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </button>
                {actionError && <div className="wf-t-footnote" role="alert" style={{ color: C.error, background: C.errorSoft, borderRadius: 6, padding: "8px 10px" }}>{actionError}</div>}
                {results.length > 0 && liveState !== "live" && <button className="wf-btn2" onClick={back}>Back</button>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Event log */}
      <div style={{ borderTop: `1px solid ${C.border}`, background: C.white }}>
        <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", borderBottom: `1px solid ${C.border}` }}>
          <span className="wf-t-headline" style={{ fontSize: 13, color: C.ink }}>Transaction event log</span>
        </div>
        <div style={{ maxHeight: 168, overflowY: "auto", padding: "6px 0" }}>
          {logRows.map((r, i) => (
            <div key={i} className={r.kind === "pending" ? "" : "wf-anim"} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 16px", opacity: r.kind === "pending" ? 0.5 : 1 }}>
              <span style={{ fontFamily: "var(--wf-mono)", fontSize: 11, color: C.sub, flexShrink: 0 }}>{r.t}</span>
              <span style={{ fontFamily: "var(--wf-mono)", fontSize: 10.5, fontWeight: 600, color: levelColor[r.level], flexShrink: 0, width: 58 }}>[{r.level}]</span>
              {r.href ? (
                <a className="wf-log-link" href={r.href} target="_blank" rel="noreferrer" style={{ fontFamily: "var(--wf-mono)", fontSize: 11.5, color: r.kind === "err" ? C.error : C.body, flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="wf-log-label" style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.name}{r.detail ? <span style={{ color: C.sub }}> · {r.detail}</span> : null}
                  </span>
                  <span aria-hidden="true" style={{ color: C.sub, flexShrink: 0 }}>↗</span>
                </a>
              ) : (
                <span style={{ fontFamily: "var(--wf-mono)", fontSize: 11.5, color: r.kind === "err" ? C.error : C.body, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.name}{r.detail ? <span style={{ color: C.sub }}> · {r.detail}</span> : null}
                </span>
              )}
              <span style={{ flexShrink: 0, width: 14, display: "inline-flex", justifyContent: "center" }}>
                {r.kind === "err" ? <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke={C.error} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  : r.kind === "pending" ? <span style={{ width: 9, height: 9, borderRadius: "50%", border: `1.5px solid ${C.border}` }} />
                  : <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke={C.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 16px", background: C.panel, borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <span className="wf-t-footnote" style={{ color: C.sub, flex: 1 }}>{f.erc20}</span>
        <span className="wf-t-footnote" style={{ color: C.sub, whiteSpace: "nowrap" }}>
          {liveState === "live" ? "Real Vibenet transactions" : liveState === "offline" ? "Illustrative fallback" : "Network check"}
        </span>
      </div>
    </div>
  );
};
