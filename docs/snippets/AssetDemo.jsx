export const AssetDemo = ({ flow }) => {
  // No imports allowed in Mintlify snippets: useState/useEffect/useRef are injected globally.

  // Mintlify snippets cannot import npm packages or sibling modules. Load the
  // shared .txt engine and vendored AA client as Blob ES modules on first use.
  const loadVibenetEngine = () => {
    if (window.__baseDocsVibenetEngineV1) return Promise.resolve(window.__baseDocsVibenetEngineV1);
    if (window.__baseDocsVibenetEnginePromiseV1) return window.__baseDocsVibenetEnginePromiseV1;

    window.__baseDocsVibenetEnginePromiseV1 = new Promise((resolve, reject) => {
      const onReady = () => {
        cleanup();
        resolve(window.__baseDocsVibenetEngineV1);
      };
      const cleanup = () => window.removeEventListener("base-docs-vibenet-engine:ready", onReady);
      window.addEventListener("base-docs-vibenet-engine:ready", onReady, { once: true });

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
            fetchText("/static/vibenet-engine.txt"),
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
            window.__baseDocsVibenetEnginePromiseV1 = null;
            reject(new Error("Failed to evaluate the Vibenet engine"));
          };
          document.head.appendChild(tag);
        } catch (error) {
          cleanup();
          window.__baseDocsVibenetEnginePromiseV1 = null;
          reject(error);
        }
      })();
    });
    return window.__baseDocsVibenetEnginePromiseV1;
  };

  // Capability-only check; it intentionally avoids downloading the AA bundle.
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
    const [chainId, blockNumber, genesis, asset, policy] = await Promise.all([
      rpc("eth_chainId"),
      rpc("eth_blockNumber"),
      rpc("eth_getBlockByNumber", ["0x0", false]),
      isActivated("0xcdcc772fe4cbdb1029f822861176d09e646db96723d4c1e82ddfdeb8163ef54c"),
      isActivated("0xb582ebae03f16fee49a6763f78df482fb11ae73f103ed0d330bbe556aa90a43f"),
    ]);
    return {
      live: BigInt(chainId) === 84538453n && asset && policy,
      blockNumber: Number(BigInt(blockNumber)),
      genesisHash: genesis?.hash || null,
      reason: !asset ? "B20 Asset creation is not activated" : !policy ? "Policy writes are not activated" : null,
    };
  };
  const sans = "'Base Sans','Inter Tight',Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  const mono = "'Base Mono','Roboto Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace";

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
  const dot = { Issuer: C.blue, Alice: "#66c800", Bob: "#ffd12f", Carol: "#fc401f" };

  const TOKEN = "EXM";
  const NETWORK = "Base Vibenet";

  // ---- result-line helpers ----
  const ok = (name, detail, href) => ({ kind: "ok", name, detail: detail || "", href });
  const err = (name, detail, href) => ({ kind: "err", name, detail: detail || "", href });
  const nfo = (name, detail, href) => ({ kind: "info", name, detail: detail || "", href });
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const M = (v) => ({ v, mono: true });

  const freshSim = () => ({ balances: {}, blocked: null, multiplier: 1, paused: false });

  // ======================================================================
  // Scripted flows. Each step mutates a cloned sim and returns log lines.
  // ======================================================================
  const MOCK_FLOWS = {
    create: {
      label: "Create", title: "Create a stock token", readout: false,
      erc20: "B20 supplies a shared Asset standard instead of a custom token contract.",
      steps: [
        { stage: "Create", action: "Create EXM",
          text: "Define Example Corp Class A with six-decimal share precision.",
          summary: [["Operation", "Create token"], ["Symbol", TOKEN], ["Standard", "B20 Asset"], ["Network", NETWORK]],
          run: () => ({ entries: [ok("createB20", "ASSET · EXM · 0xB200…e7a1"), nfo("decimals()", "6")], caption: "The factory creates an ERC-20-compatible B20 Asset token." }) },
        { stage: "Controls", action: "Apply controls",
          text: "Set issuer roles and a technical issuance ceiling in the same transaction.",
          summary: [["Operation", "Apply controls"], ["Roles", "MINT, OPERATOR, METADATA"], ["Supply cap", M("1,000,000 EXM")], ["Network", NETWORK]],
          run: () => ({ entries: [ok("grantRole", "MINT_ROLE, OPERATOR_ROLE, METADATA_ROLE → Issuer"), ok("SupplyCapUpdated", "1,000,000 EXM")], caption: "The ceiling limits token supply; it does not define legally authorized shares." }) },
        { stage: "Identify", action: "Add identifier",
          text: "Attach an issuer-defined identifier for integrations and records.",
          summary: [["Operation", "Set metadata"], ["Field", M("asset-id")], ["Value", M('"EXAMPLE-CLASS-A"')], ["Network", NETWORK]],
          run: () => ({ entries: [ok("ExtraMetadataUpdated", 'asset-id → "EXAMPLE-CLASS-A"')], caption: "B20 stores the issuer-defined value without validating an external registry." }) },
      ],
    },
    issue: {
      label: "Issue", title: "Issue shares to approved holders", readout: true,
      erc20: "The Asset variant batches a cap-table distribution into one transaction.",
      steps: [
        { stage: "Approve", action: "Approve holders",
          text: "Alice and Bob are approved to hold Example Corp shares.",
          summary: [["Operation", "Update allowlist"], ["Approved", "Alice, Bob"], ["Symbol", TOKEN], ["Network", NETWORK]],
          run: () => ({ entries: [ok("updateAllowlist", "allow Alice, Bob")], caption: "The same holder policy can govern issuance and transfers." }) },
        { stage: "Issue", action: "Issue 1,000",
          text: "Distribute 600 shares to Alice and 400 to Bob.",
          summary: [["Operation", "Batch mint"], ["Recipients", "Alice, Bob"], ["Share amount", M("1,000 EXM")], ["Network", NETWORK]],
          run: (s) => { s.balances.Alice = 600; s.balances.Bob = 400; return { entries: [ok("batchMint", "2 recipients · 1,000 EXM"), ok("Transfer", "0x0 → Alice · 600"), ok("Transfer", "0x0 → Bob · 400")], caption: "One batch records the initial distribution." }; } },
      ],
    },
    restrict: {
      label: "Restrict", title: "Keep shares with eligible holders", readout: true,
      erc20: "The shared Policy Registry gates issuance and transfers without a custom hook.",
      steps: [
        { stage: "Policy", action: "Enable policy",
          text: "Approve Alice and Bob, then bind the policy to mint and transfer scopes.",
          summary: [["Operation", "Enable policy"], ["Policy", "#2 · ALLOWLIST"], ["Scopes", "MINT, TRANSFER"], ["Approved", "Alice, Bob"]],
          run: () => ({ entries: [ok("PolicyCreated", "#2 · ALLOWLIST"), ok("PolicyUpdated", "MINT_RECEIVER, TRANSFER_SENDER, TRANSFER_RECEIVER → #2")], caption: "Accounts are denied until the policy admin approves them." }) },
        { stage: "Issue", action: "Issue 100",
          text: "Issue shares to approved holder Alice.",
          summary: [["Operation", "Mint"], ["Recipient", "Alice"], ["Share amount", M("100 EXM")], ["Network", NETWORK]],
          run: (s) => { s.balances.Alice = 100; return { entries: [ok("Transfer", "0x0 → Alice · 100 EXM")] }; } },
        { stage: "Enforce", action: "Try transfer",
          text: "Alice tries to transfer shares to unapproved holder Carol.",
          summary: [["Operation", "Transfer"], ["To", "Carol"], ["Policy", "Allowlist #2"], ["Status", "Denied"]],
          run: () => ({ entries: [err("PolicyForbids", "TRANSFER_RECEIVER · Carol")], caption: "Carol cannot receive shares until the policy admin approves her." }) },
      ],
    },
    cancel: {
      label: "Cancel", title: "Cancel shares from a blocked holder", readout: true,
      erc20: "B20 exposes a dedicated burn path for a holder denied by the sender policy.",
      steps: [
        { stage: "Fund", action: "Set position",
          text: "Bob holds 100 EXM and is currently eligible.",
          summary: [["Operation", "Mint"], ["Holder", "Bob"], ["Share amount", M("100 EXM")]],
          run: (s) => { s.balances.Bob = 100; return { entries: [ok("Transfer", "0x0 → Bob · 100 EXM")] }; } },
        { stage: "Block", action: "Block Bob",
          text: "Remove Bob from the holder allowlist before cancellation.",
          summary: [["Operation", "Block holder"], ["Holder", "Bob"], ["Policy", "Allowlist"], ["Status", "Denied"]],
          run: (s) => { s.blocked = "Bob"; return { entries: [ok("updateAllowlist", "remove Bob"), err("PolicyForbids", "TRANSFER_SENDER · Bob")], caption: "Bob is denied by the token's sender policy." }; } },
        { stage: "Cancel", action: "Cancel 100",
          text: "Cancel the blocked shares; they do not move to the issuer.",
          summary: [["Operation", "Burn blocked"], ["Holder", "Bob"], ["Share amount", M("100 EXM")]],
          run: (s) => { s.balances.Bob = 0; return { entries: [ok("burnBlocked", "Bob · 100 EXM"), ok("Transfer", "Bob → 0x0 · 100 EXM")], caption: "The shares are burned, reducing total supply." }; } },
      ],
    },
    dividend: {
      label: "Dividend", title: "Announce a stock dividend", readout: true,
      erc20: "B20 brackets the share distribution with an onchain description and URI.",
      steps: [
        { stage: "Record", action: "Load holders",
          text: "Alice holds 600 shares and Bob holds 400.",
          summary: [["Operation", "Record date"], ["Holders", "Alice, Bob"], ["Outstanding", M("1,000 EXM")]],
          run: (s) => { s.balances.Alice = 600; s.balances.Bob = 400; return { entries: [nfo("record date", "Alice 600 · Bob 400")], caption: "The example distributes a five-percent stock dividend." }; } },
        { stage: "Announce", action: "Announce & issue",
          text: "Publish the action details and distribute 30 shares to Alice and 20 to Bob.",
          summary: [["Operation", "Stock dividend"], ["Action id", M("2026-01")], ["Distributed", M("50 EXM")], ["Recipients", "Alice, Bob"]],
          run: (s) => { s.balances.Alice += 30; s.balances.Bob += 20; return { entries: [ok("Announcement", "id 2026-01 · stock dividend"), ok("batchMint", "Alice 30 · Bob 20"), ok("EndAnnouncement", "id 2026-01")], caption: "This issues additional shares; it does not pay a cash dividend." }; } },
      ],
    },
    split: {
      label: "Split", title: "Run a 2-for-1 stock split", readout: true,
      erc20: "The Asset multiplier changes displayed balances without migrating holders.",
      steps: [
        { stage: "Load", action: "Load balances",
          text: "Alice holds 100 raw shares and Bob holds 50.",
          summary: [["Operation", "Load balances"], ["Multiplier", M("1.0 WAD")], ["Holders", "Alice, Bob"]],
          run: (s) => { s.balances.Alice = 100; s.balances.Bob = 50; return { entries: [nfo("multiplier()", "1.0 WAD")], caption: "Raw balances and displayed balances currently match." }; } },
        { stage: "Split", action: "Run split",
          text: "Apply the board-approved 2-for-1 split.",
          summary: [["Operation", "2-for-1 split"], ["Multiplier", M("1.0 → 2.0 WAD")], ["Symbol", TOKEN], ["Network", NETWORK]],
          run: (s) => { s.multiplier = 2; return { entries: [ok("MultiplierUpdated", "1.0 → 2.0 WAD"), nfo("scaledBalanceOf(Alice)", "200 EXM")], caption: "Displayed balances double while raw balances remain unchanged." }; } },
      ],
    },
    pause: {
      label: "Pause", title: "Pause transfers without stopping issuance", readout: true,
      erc20: "B20 separates transfer, mint, and burn pause controls.",
      steps: [
        { stage: "Fund", action: "Load balance",
          text: "Alice holds 100 EXM before an incident begins.",
          summary: [["Operation", "Mint"], ["Holder", "Alice"], ["Share amount", M("100 EXM")]],
          run: (s) => { s.balances.Alice = 100; return { entries: [ok("Transfer", "0x0 → Alice · 100 EXM")] }; } },
        { stage: "Pause", action: "Pause transfers",
          text: "Pause transfers while the issuer investigates.",
          summary: [["Operation", "Pause"], ["Scope", "TRANSFER"], ["Symbol", TOKEN], ["Network", NETWORK]],
          run: (s) => { s.paused = true; return { entries: [ok("Paused", "TRANSFER")], caption: "Mint and burn remain available." }; } },
        { stage: "Enforce", action: "Try transfer",
          text: "Alice tries to transfer 10 shares to Bob.",
          summary: [["Operation", "Transfer"], ["Amount", M("10 EXM")], ["Scope", "TRANSFER (paused)"], ["Status", "Blocked"]],
          run: () => ({ entries: [err("EnforcedPause", "TRANSFER")], caption: "The transfer is rejected by the paused feature." }) },
        { stage: "Issue", action: "Issue 25",
          text: "The issuer can still issue 25 shares to approved holder Bob.",
          summary: [["Operation", "Mint"], ["Recipient", "Bob"], ["Share amount", M("25 EXM")], ["Note", "Mint unpaused"]],
          run: (s) => { s.balances.Bob = 25; return { entries: [ok("Transfer", "0x0 → Bob · 25 EXM")], caption: "Granular pause leaves unpaused operations available." }; } },
      ],
    },
  };

  const order = ["create", "issue", "restrict", "cancel", "dividend", "split", "pause"];
  const pinned = flow ? (MOCK_FLOWS[flow] ? flow : order[0]) : null;

  const [active, setActive] = useState(pinned || "create");
  const [sim, setSim] = useState(freshSim);
  const [results, setResults] = useState([]);
  const [liveState, setLiveState] = useState("probing");
  const [probeInfo, setProbeInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [accountAddress, setAccountAddress] = useState(null);
  const [accountCopied, setAccountCopied] = useState(false);
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

  const f = MOCK_FLOWS[active] || MOCK_FLOWS.create;
  const stepIndex = results.length;
  const done = stepIndex >= f.steps.length;
  const cur = done ? f.steps[f.steps.length - 1] : f.steps[stepIndex];

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
        Alice: engine.randomAddress(),
        Bob: engine.randomAddress(),
        Carol: engine.randomAddress(),
      },
    };
    return liveContext.current;
  };

  const setBalance = async (engine, ctx, state, label) => {
    state.balances[label] = engine.displayUnits(await engine.balanceOf(ctx.token, ctx.addresses[label]));
  };

  const createAsset = async (engine, ctx, options = {}) => {
    const created = await engine.createAsset({
      name: `Docs ${active[0].toUpperCase()}${active.slice(1)} Asset`,
      symbol: TOKEN,
      decimals: 6,
      ...options,
    });
    ctx.token = created.token;
    ctx.createTx = created;
    return created;
  };

  const createEligibilitySetup = async (engine, ctx, options = {}) => {
    const policy = await engine.createPolicy({
      kind: "allowlist",
      accounts: [ctx.addresses.Issuer, ctx.addresses.Alice, ctx.addresses.Bob],
    });
    ctx.policyId = policy.id;
    const created = await createAsset(engine, ctx, {
      policies: [
        { scope: "MINT_RECEIVER_POLICY", id: policy.id },
        { scope: "TRANSFER_SENDER_POLICY", id: policy.id },
        { scope: "TRANSFER_RECEIVER_POLICY", id: policy.id },
      ],
      ...options,
    });
    return { policy, created };
  };

  const LIVE_RUNNERS = {
    create: [
      async (engine, ctx) => {
        const created = await createAsset(engine, ctx, { roles: [] });
        const details = await engine.assetDetails(created.token);
        return {
          entries: [
            txOk(engine, "B20Created", `ASSET · ${TOKEN} · ${short(created.token)}`, created),
            nfo("decimals()", String(details.decimals), engine.explorerAddress(created.token)),
          ],
          caption: "The Vibenet B20 factory created the six-decimal Asset token.",
        };
      },
      async (engine, ctx) => {
        const tx = await engine.configureAssetControls({
          token: ctx.token,
          roles: ["MINT_ROLE", "OPERATOR_ROLE", "METADATA_ROLE"],
          supplyCap: engine.units(1_000_000),
        });
        return {
          entries: [
            txOk(engine, "RoleGranted", "MINT_ROLE, OPERATOR_ROLE, METADATA_ROLE → Issuer", tx),
            txOk(engine, "SupplyCapUpdated", "1,000,000 EXM", tx),
          ],
          caption: "The technical ceiling and issuer roles are now onchain.",
        };
      },
      async (engine, ctx) => {
        const tx = await engine.updateAssetMetadata({ token: ctx.token, key: "asset-id", value: "EXAMPLE-CLASS-A" });
        const value = await engine.assetMetadata(ctx.token, "asset-id");
        return {
          entries: [txOk(engine, "ExtraMetadataUpdated", `asset-id → "${value}"`, tx)],
          caption: "The issuer-defined identifier was read back from the live Asset token.",
        };
      },
    ],
    issue: [
      async (engine, ctx) => {
        const { policy, created } = await createEligibilitySetup(engine, ctx);
        return {
          entries: [
            txOk(engine, "PolicyCreated", `#${policy.id} · ALLOWLIST`, policy),
            txOk(engine, "PolicyUpdated", "MINT_RECEIVER, TRANSFER_SENDER, TRANSFER_RECEIVER", created),
          ],
          caption: "Alice and Bob are members of the live eligibility policy.",
        };
      },
      async (engine, ctx, state) => {
        const tx = await engine.batchMint({
          token: ctx.token,
          recipients: [ctx.addresses.Alice, ctx.addresses.Bob],
          amounts: [engine.units(600), engine.units(400)],
        });
        await Promise.all([setBalance(engine, ctx, state, "Alice"), setBalance(engine, ctx, state, "Bob")]);
        return {
          entries: [
            txOk(engine, "batchMint", "2 recipients · 1,000 EXM", tx),
            txOk(engine, "Transfer", "0x0 → Alice · 600", tx),
            txOk(engine, "Transfer", "0x0 → Bob · 400", tx),
          ],
          caption: "One atomic batch recorded the two-holder distribution.",
        };
      },
    ],
    restrict: [
      async (engine, ctx) => {
        const { policy, created } = await createEligibilitySetup(engine, ctx);
        return {
          entries: [
            txOk(engine, "PolicyCreated", `#${policy.id} · ALLOWLIST`, policy),
            txOk(engine, "PolicyUpdated", "MINT_RECEIVER, TRANSFER_SENDER, TRANSFER_RECEIVER", created),
          ],
          caption: "The same live policy now gates issuance and transfers.",
        };
      },
      async (engine, ctx, state) => {
        const tx = await engine.batchMint({ token: ctx.token, recipients: [ctx.addresses.Alice], amounts: [engine.units(100)] });
        await setBalance(engine, ctx, state, "Alice");
        return { entries: [txOk(engine, "Transfer", "0x0 → Alice · 100 EXM", tx)] };
      },
      async (engine, ctx) => {
        const rejected = await engine.expectRevert({
          from: ctx.addresses.Alice,
          token: ctx.token,
          functionName: "transfer",
          args: [ctx.addresses.Carol, engine.units(1)],
          expected: "PolicyForbids",
        });
        return {
          entries: [err(rejected.name, "TRANSFER_RECEIVER · Carol · Vibenet eth_call")],
          caption: "Carol is not in the live eligibility policy, so the B20 precompile rejected the transfer.",
        };
      },
    ],
    cancel: [
      async (engine, ctx, state) => {
        const { policy, created } = await createEligibilitySetup(engine, ctx, {
          initialMints: [{ to: ctx.addresses.Bob, amount: engine.units(100) }],
        });
        ctx.policyId = policy.id;
        await setBalance(engine, ctx, state, "Bob");
        return {
          entries: [
            txOk(engine, "PolicyCreated", `#${policy.id} · ALLOWLIST`, policy),
            txOk(engine, "Transfer", "0x0 → Bob · 100 EXM", created),
          ],
        };
      },
      async (engine, ctx, state) => {
        const tx = await engine.updateAllowlist({ id: ctx.policyId, allowed: false, accounts: [ctx.addresses.Bob] });
        const rejected = await engine.expectRevert({
          from: ctx.addresses.Bob,
          token: ctx.token,
          functionName: "transfer",
          args: [ctx.addresses.Alice, engine.units(1)],
          expected: "PolicyForbids",
        });
        state.blocked = "Bob";
        return {
          entries: [
            txOk(engine, "AllowlistUpdated", "remove Bob", tx),
            err(rejected.name, "TRANSFER_SENDER · Bob · Vibenet eth_call"),
          ],
          caption: "Bob is now denied by the sender policy.",
        };
      },
      async (engine, ctx, state) => {
        const tx = await engine.burnBlocked({ token: ctx.token, from: ctx.addresses.Bob, amount: engine.units(100) });
        await setBalance(engine, ctx, state, "Bob");
        return {
          entries: [
            txOk(engine, "burnBlocked", "Bob · 100 EXM", tx),
            txOk(engine, "Transfer", "Bob → 0x0 · 100 EXM", tx),
          ],
          caption: "Bob's balance and the Asset token's total supply both fell by 100.",
        };
      },
    ],
    dividend: [
      async (engine, ctx, state) => {
        const created = await createAsset(engine, ctx, {
          initialMints: [
            { to: ctx.addresses.Alice, amount: engine.units(600) },
            { to: ctx.addresses.Bob, amount: engine.units(400) },
          ],
        });
        await Promise.all([setBalance(engine, ctx, state, "Alice"), setBalance(engine, ctx, state, "Bob")]);
        return {
          entries: [
            txOk(engine, "B20Created", short(created.token), created),
            nfo("record date", "Alice 600 · Bob 400", engine.explorerAddress(created.token)),
          ],
          caption: "The live holder balances establish the distribution baseline.",
        };
      },
      async (engine, ctx, state) => {
        const id = `dividend-${Date.now()}`;
        const tx = await engine.announceDistribution({
          token: ctx.token,
          recipients: [ctx.addresses.Alice, ctx.addresses.Bob],
          amounts: [engine.units(30), engine.units(20)],
          id,
          description: "Five-percent stock dividend",
          uri: "https://example.com/actions/dividend",
        });
        const used = await engine.isAnnouncementIdUsed(ctx.token, id);
        await Promise.all([setBalance(engine, ctx, state, "Alice"), setBalance(engine, ctx, state, "Bob")]);
        return {
          entries: [
            txOk(engine, "Announcement", `${id} · stock dividend`, tx),
            txOk(engine, "batchMint", "Alice 30 · Bob 20", tx),
            txOk(engine, "EndAnnouncement", used ? id : "announcement not found", tx),
          ],
          caption: "The announcement brackets the two mint events in one Vibenet transaction.",
        };
      },
    ],
    split: [
      async (engine, ctx, state) => {
        const created = await createAsset(engine, ctx, {
          initialMints: [
            { to: ctx.addresses.Alice, amount: engine.units(100) },
            { to: ctx.addresses.Bob, amount: engine.units(50) },
          ],
        });
        await Promise.all([setBalance(engine, ctx, state, "Alice"), setBalance(engine, ctx, state, "Bob")]);
        const multiplier = await engine.assetMultiplier(ctx.token);
        state.multiplier = Number(multiplier / 10n ** 18n);
        return {
          entries: [
            txOk(engine, "B20Created", short(created.token), created),
            nfo("multiplier()", `${state.multiplier}.0 WAD`, engine.explorerAddress(ctx.token)),
          ],
          caption: "Raw and displayed balances currently match.",
        };
      },
      async (engine, ctx, state) => {
        const tx = await engine.updateMultiplier({ token: ctx.token, multiplier: 2n * 10n ** 18n });
        const [multiplier, displayed] = await Promise.all([
          engine.assetMultiplier(ctx.token),
          engine.scaledBalanceOf(ctx.token, ctx.addresses.Alice),
        ]);
        state.multiplier = Number(multiplier / 10n ** 18n);
        return {
          entries: [
            txOk(engine, "MultiplierUpdated", "1.0 → 2.0 WAD", tx),
            nfo("scaledBalanceOf(Alice)", `${engine.displayUnits(displayed)} EXM`, engine.explorerAddress(ctx.token)),
          ],
          caption: "Displayed balances doubled while the raw balances stayed unchanged.",
        };
      },
    ],
    pause: [
      async (engine, ctx, state) => {
        const created = await createAsset(engine, ctx, {
          initialMints: [{ to: ctx.addresses.Alice, amount: engine.units(100) }],
        });
        await setBalance(engine, ctx, state, "Alice");
        return { entries: [txOk(engine, "Transfer", "0x0 → Alice · 100 EXM", created)] };
      },
      async (engine, ctx, state) => {
        const tx = await engine.setTransfersPaused({ token: ctx.token, paused: true });
        state.paused = await engine.isTransferPaused(ctx.token);
        return { entries: [txOk(engine, "Paused", "TRANSFER", tx)], caption: "Mint and burn remain available." };
      },
      async (engine, ctx) => {
        const rejected = await engine.expectRevert({
          from: ctx.addresses.Alice,
          token: ctx.token,
          functionName: "transfer",
          args: [ctx.addresses.Bob, engine.units(10)],
          expected: "ContractPaused",
        });
        return {
          entries: [err(rejected.name, "TRANSFER · Vibenet eth_call")],
          caption: "The paused transfer path was rejected by the live precompile.",
        };
      },
      async (engine, ctx, state) => {
        const tx = await engine.batchMint({ token: ctx.token, recipients: [ctx.addresses.Bob], amounts: [engine.units(25)] });
        await setBalance(engine, ctx, state, "Bob");
        return {
          entries: [txOk(engine, "Transfer", "0x0 → Bob · 25 EXM", tx)],
          caption: "Issuance succeeded while the independent transfer feature remained paused.",
        };
      },
    ],
  };

  const select = (key) => {
    setActive(key);
    setSim(freshSim());
    setResults([]);
    setActionError(null);
    liveContext.current = null;
  };
  const reset = () => {
    setSim(freshSim());
    setResults([]);
    setActionError(null);
    liveContext.current = null;
  };
  const runMockStep = () => {
    if (done) return;
    const s = { balances: { ...sim.balances }, blocked: sim.blocked, multiplier: sim.multiplier, paused: sim.paused };
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
      const state = { balances: { ...sim.balances }, blocked: sim.blocked, multiplier: sim.multiplier, paused: sim.paused };
      const out = await LIVE_RUNNERS[active][stepIndex](engine, ctx, state);
      setSim(state);
      setResults((current) => [...current, out || { entries: [] }]);
    } catch (error) {
      if (results.length === 0) {
        try {
          const latest = await probeVibenet();
          if (!latest.live) {
            setProbeInfo(latest);
            setLiveState("offline");
            liveContext.current = null;
            runMockStep();
            return;
          }
        } catch {
          setLiveState("offline");
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
  f.steps.slice(stepIndex).forEach((st) => { logRows.push({ t: ts(sec++), level: "PENDING", name: st.action, detail: "", kind: "pending" }); });

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
        .wf-btn { font-family: ${sans}; font-size: 13px; font-weight: 600; border-radius: 6px; padding: 10px 14px; cursor: pointer; transition: filter .15s ease; border: 1px solid ${C.blue}; background: ${C.blue}; color: ${C.onBlue}; width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 7px; }
        .wf-btn:hover { filter: brightness(1.1); }
        .wf-btn:disabled { background: ${C.panel}; border-color: ${C.border}; color: ${C.sub}; cursor: default; filter: none; }
        a.wf-btn, a.wf-btn:visited { color: ${C.onBlue}; }
        .wf-btn2 { font-family: ${sans}; font-size: 13px; font-weight: 600; border-radius: 6px; padding: 10px 14px; cursor: pointer; background: ${C.white}; border: 1px solid ${C.border}; color: ${C.body}; width: 100%; transition: background .15s ease; }
        .wf-btn2:hover { background: ${C.panel}; }
        .wf-pill { font-family: ${sans}; font-size: 12px; font-weight: 500; border-radius: 6px; padding: 5px 10px; cursor: pointer; white-space: nowrap; color: ${C.sec}; background: ${C.white}; border: 1px solid ${C.border}; transition: all .12s ease; }
        .wf-pill:not(.wf-pill-on):hover { color: ${C.ink}; border-color: ${C.sub}; }
        .wf-pill-on { color: ${C.onBlue}; background: ${C.blue}; border-color: ${C.blue}; }
        .wf-stage { font-family: ${sans}; font-size: 12.5px; white-space: nowrap; padding: 11px 2px; border-bottom: 2px solid transparent; display: inline-flex; align-items: center; gap: 7px; }
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
          {f.steps.map((st, i) => {
            const state = i < stepIndex ? "done" : i === stepIndex ? "now" : "future";
            const col = state === "future" ? C.sub : state === "now" ? C.blue : C.ink;
            return (
              <span key={i} className="wf-stage" style={{ color: col, borderBottomColor: state === "now" ? C.blue : "transparent", fontWeight: state === "now" ? 600 : 500 }}>
                <span style={{ fontFamily: mono, fontSize: 11, opacity: .7 }}>{i + 1}</span>{st.stage}
                {state === "done" && <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke={C.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
              </span>
            );
          })}
        </div>
        <div
          title={liveState === "live" && accountAddress ? `Vibenet demo account: ${accountAddress}` : liveState === "offline" ? (probeInfo?.reason || "Vibenet is unavailable") : NETWORK}
          style={{ display: "inline-flex", alignItems: "center", gap: 3, color: badge.color, border: `1px solid ${badge.border}`, borderRadius: 5, padding: accountAddress && liveState === "live" ? "2px 3px 2px 6px" : "2px 6px", flexShrink: 0 }}
        >
          <span className="wf-t-caption" style={accountAddress && liveState === "live" ? { fontFamily: mono, textTransform: "none", letterSpacing: 0 } : undefined}>{badge.text}</span>
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
          {f.steps.map((st, i) => {
            const state = i < stepIndex ? "done" : i === stepIndex ? "now" : "future";
            const last = i === f.steps.length - 1;
            return (
              <div key={i} style={{ display: "flex", gap: 11 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 24, flexShrink: 0 }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontFamily: sans, fontSize: 11.5, fontWeight: 600,
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

          {/* Holdings readout */}
          {f.readout && holders.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              <div className="wf-t-caption" style={{ color: C.sub, marginBottom: 8 }}>{sim.multiplier === 1 ? "Holdings" : "Raw → displayed holdings"}</div>
              <div style={{ display: "grid", gap: 6 }}>
                {holders.map((a) => (
                  <div key={a} className="wf-t-body" style={{ display: "flex", alignItems: "center", gap: 8, color: C.body }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot[a] || C.sub, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{a}</span>
                    {sim.blocked === a && <span className="wf-t-caption" style={{ color: C.error, border: `1px solid ${C.error}`, borderRadius: 4, padding: "0 4px" }}>Blocked</span>}
                    {sim.paused && a === "Alice" && <span className="wf-t-caption" style={{ color: C.error, border: `1px solid ${C.error}`, borderRadius: 4, padding: "0 4px" }}>Paused</span>}
                    <span style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 600, color: C.ink }}>{fmt(sim.balances[a] || 0)}{sim.multiplier !== 1 && ` → ${fmt((sim.balances[a] || 0) * sim.multiplier)}`}</span>
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
              <span style={{ fontFamily: mono, fontSize: 11, color: C.sub, flexShrink: 0 }}>{r.t}</span>
              <span style={{ fontFamily: mono, fontSize: 10.5, fontWeight: 600, color: levelColor[r.level], flexShrink: 0, width: 58 }}>[{r.level}]</span>
              {r.href ? (
                <a className="wf-log-link" href={r.href} target="_blank" rel="noreferrer" style={{ fontFamily: mono, fontSize: 11.5, color: r.kind === "err" ? C.error : C.body, flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="wf-log-label" style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.name}{r.detail ? <span style={{ color: C.sub }}> · {r.detail}</span> : null}
                  </span>
                  <span aria-hidden="true" style={{ color: C.sub, flexShrink: 0 }}>↗</span>
                </a>
              ) : (
                <span style={{ fontFamily: mono, fontSize: 11.5, color: r.kind === "err" ? C.error : C.body, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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
