
export const B20PlaygroundDemo = () => {
  const sans  = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  const serif = "'Tiempos Headline','Iowan Old Style','Source Serif Pro',ui-serif,Georgia,serif";
  const mono  = "ui-monospace,'SF Mono','Cascadia Code',Menlo,Monaco,Consolas,monospace";

  const c = {
    bg: "#1f1e1d", header: "#262624", border: "#34322f", inputBg: "#2a2926",
    text: "#f5f4ed", body: "#e8e4dc", muted: "#a8a39d", dim: "#6b6663",
    accent: "#D97757", bubble: "#2c2b28", bubbleText: "#f5f4ed",
    code: "#e89972", codeBg: "rgba(217,119,87,0.12)",
    toolBg: "#272622", toolBorder: "#3a3835", success: "#a3c585",
    error: "#e57373", errorBg: "rgba(229,115,115,0.10)",
  };

  // ----- Preset accounts -----
  const ACCOUNTS = [
    { key: "Issuer",    label: "Issuer",    addr: "0x155e…d001", dot: "#D97757" },
    { key: "Processor", label: "Processor", addr: "0x9r0c…d002", dot: "#7c9fe8" },
    { key: "Alice",     label: "Alice",     addr: "0xA11c…e001", dot: "#a3c585" },
    { key: "Bob",       label: "Bob",       addr: "0xB0b0…e002", dot: "#e5c07b" },
    { key: "Carol",     label: "Carol",     addr: "0xCar0…e003", dot: "#c586d9" },
  ];
  const acctOf = (k) => ACCOUNTS.find(a => a.key === k) || { key: k, label: k, addr: "0x0000…0000", dot: c.dim };

  const ROLE_NAMES_BASE = [
    "DEFAULT_ADMIN_ROLE", "MINT_ROLE", "BURN_ROLE", "BURN_BLOCKED_ROLE",
    "PAUSE_ROLE", "UNPAUSE_ROLE", "METADATA_ROLE",
  ];
  const SCOPES = ["TRANSFER_SENDER", "TRANSFER_RECEIVER", "TRANSFER_EXECUTOR", "MINT_RECEIVER"];

  // Built-in policy IDs. ALWAYS_ALLOW = 0. ALWAYS_BLOCK = (ALLOWLIST(=1) << 56) | 1.
  const ALWAYS_ALLOW = 0;
  const ALWAYS_BLOCK = "ALWAYS_BLOCK"; // sentinel token used internally for the built-in block id
  // Rendered composed form of ALWAYS_BLOCK, i.e. 0x0100…01.
  const ALWAYS_BLOCK_RENDER = "0x0100…01";

  const UINT128_MAX = "type(uint128).max (no cap)";

  // ----- djb2-style deterministic string hash (simulated keccak) -----
  const hashHex = (deployer, salt) => {
    let h = 5381;
    const s = deployer + "|" + salt;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    }
    // spread into 9 bytes deterministically
    let out = "";
    let x = h;
    for (let i = 0; i < 9; i++) {
      x = (x * 1103515245 + 12345 + i * 7) >>> 0;
      const b = (x >>> ((i % 4) * 8)) & 0xff;
      out += b.toString(16).padStart(2, "0");
    }
    return out; // 18 hex chars = 9 bytes
  };

  const deriveAddress = (variant, deployer, salt) => {
    const prefix = "b2000000000000000000";        // 10-byte B20 prefix
    const vByte = variant === "STABLECOIN" ? "01" : "00";
    const tail = hashHex(deployer, salt);          // 9 bytes
    return { prefix, vByte, tail };
  };

  // ----- state -----
  const [token, setToken]         = useState(null);
  const [balances, setBalances]   = useState({});
  const [roles, setRoles]         = useState({});
  const [policies, setPolicies]   = useState({});
  const [nextPolicyId, setNextPolicyId] = useState(2);
  const [scopes, setScopes]       = useState({ TRANSFER_SENDER: 0, TRANSFER_RECEIVER: 0, TRANSFER_EXECUTOR: 0, MINT_RECEIVER: 0 });
  const [paused, setPaused]       = useState({ TRANSFER: false, MINT: false, BURN: false });
  const [allowances, setAllowances] = useState({});
  const [nonces, setNonces]       = useState({});
  const [eventLog, setEventLog]   = useState([]);
  const [activeTab, setActiveTab] = useState("Create");
  const [actingAs, setActingAs]   = useState("Issuer");

  const idRef  = useRef(0);
  const logRef = useRef(null);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [eventLog]);

  // ----- Create-tab form state -----
  const [cVariant, setCVariant]   = useState("STABLECOIN");
  const [cName, setCName]         = useState("Acme Dollar");
  const [cSymbol, setCSymbol]     = useState("aUSD");
  const [cDecimals, setCDecimals] = useState(6);
  const [cCurrency, setCCurrency] = useState("USD");
  const [cSalt, setCSalt]         = useState("0x01");
  const [cInitialAdminZero, setCInitialAdminZero] = useState(false);

  const totalSupply = () => Object.values(balances).reduce((a, b) => a + b, 0);

  // ----- log helpers -----
  const pushLog = (entries) => {
    setEventLog(prev => {
      const tag = "0x" + (prev.length % 16).toString(16) + "f4…" + ((prev.length * 7) % 256).toString(16).padStart(2, "0");
      const withIds = entries.map((e, i) => ({
        id: ++idRef.current,
        logIndex: e.logIndex,
        txTag: tag,
        kind: e.kind,
        name: e.name,
        args: e.args || "",
      }));
      return [...prev, ...withIds];
    });
  };
  const emit = (name, args, logIndex) => ({ kind: "event", name, args, logIndex });
  const revert = (name, args) => ({ kind: "revert", name, args: args || "", logIndex: null });
  const info = (name, args) => ({ kind: "info", name, args: args || "", logIndex: null });

  // ----- authorization helper (never throws) -----
  const isAuthorized = (policyId, account) => {
    if (policyId === 0 || policyId === undefined || policyId === null) return true;
    if (policyId === ALWAYS_BLOCK) return false;
    const p = policies[policyId];
    if (!p) {
      // non-existent id collapses to empty-set semantics.
      // We cannot know the intended type; spec: non-existent BLOCKLIST authorizes,
      // non-existent ALLOWLIST denies. Encoded type is in the top byte of the id.
      // Our simulated ids carry their type on the policy object only; for a missing
      // object we decode by convention: ids created as ALLOWLIST were tracked, so a
      // truly-missing id is treated as an empty ALLOWLIST (denies everyone).
      return false;
    }
    if (p.type === "BLOCKLIST") return !p.members.includes(account);
    if (p.type === "ALLOWLIST") return p.members.includes(account);
    return true;
  };

  const roleHas = (roleName, account) => (roles[roleName] || []).includes(account);
  const adminLess = () => token && (token.adminRenounced || token.initialAdminZero);
  const isAdmin = (account) => !adminLess() && roleHas("DEFAULT_ADMIN_ROLE", account);

  // ----- create token -----
  const createToken = () => {
    const deployer = acctOf(actingAs).addr;
    const dec = cVariant === "STABLECOIN" ? 6 : cDecimals;
    const t = {
      variant: cVariant,
      name: cName,
      symbol: cSymbol,
      decimals: dec,
      currency: cVariant === "STABLECOIN" ? cCurrency : null,
      supplyCap: null,
      salt: cSalt,
      deployer,
      contractURI: "",
      multiplier: 1.0,
      extraMetadata: {},
      adminRenounced: false,
      initialAdminZero: cInitialAdminZero,
    };
    const roleMap = {};
    ROLE_NAMES_BASE.forEach(r => { roleMap[r] = []; });
    if (cVariant === "ASSET") roleMap["OPERATOR_ROLE"] = [];
    // initialAdmin gets every gate role for a friendly playground, unless admin-less.
    if (!cInitialAdminZero) {
      const admin = actingAs;
      Object.keys(roleMap).forEach(r => { roleMap[r] = [admin]; });
    }
    setToken(t);
    setRoles(roleMap);
    setBalances({});
    setPolicies({});
    setNextPolicyId(2);
    setScopes({ TRANSFER_SENDER: 0, TRANSFER_RECEIVER: 0, TRANSFER_EXECUTOR: 0, MINT_RECEIVER: 0 });
    setPaused({ TRANSFER: false, MINT: false, BURN: false });
    setAllowances({});
    setNonces({});
    setEventLog([]);
    idRef.current = 0;
    setActiveTab("Supply");
    setTimeout(() => pushLog([
      info("B20Created", `${cVariant.toLowerCase()} · ${cSymbol} · deployer ${acctOf(actingAs).label}`),
      cInitialAdminZero
        ? info("admin", "initialAdmin == address(0) — launched admin-less")
        : emit("RoleGranted", `DEFAULT_ADMIN_ROLE → ${acctOf(actingAs).label}`, 0),
    ]), 0);
  };

  const resetAll = () => {
    setToken(null);
    setBalances({}); setRoles({}); setPolicies({}); setNextPolicyId(2);
    setScopes({ TRANSFER_SENDER: 0, TRANSFER_RECEIVER: 0, TRANSFER_EXECUTOR: 0, MINT_RECEIVER: 0 });
    setPaused({ TRANSFER: false, MINT: false, BURN: false });
    setAllowances({}); setNonces({}); setEventLog([]); idRef.current = 0;
    setActiveTab("Create"); setActingAs("Issuer");
  };

  // ----- capacity check for supply cap -----
  const capExceeded = (addAmount) => {
    if (!token || token.supplyCap === null) return false;
    return totalSupply() + addAmount > token.supplyCap;
  };

  // ---------------------------------------------------------------
  // Single write path. Validates in spec order, appends events/reverts.
  // ---------------------------------------------------------------
  const execute = (op) => {
    const me = actingAs;
    const A = (k) => acctOf(k).label;

    switch (op.type) {
      // -------- transfer(from, to, amt) --------
      case "transfer": {
        const { from, to, amt, memo } = op;
        if (paused.TRANSFER) return pushLog([revert("EnforcedPause", "feature: TRANSFER")]);
        if (!isAuthorized(scopes.TRANSFER_SENDER, from)) return pushLog([revert("PolicyForbids", `TRANSFER_SENDER · ${A(from)}`)]);
        if (!isAuthorized(scopes.TRANSFER_RECEIVER, to)) return pushLog([revert("PolicyForbids", `TRANSFER_RECEIVER · ${A(to)}`)]);
        if ((balances[from] || 0) < amt) return pushLog([revert("ERC20InsufficientBalance", `${A(from)} has ${balances[from] || 0}`)]);
        setBalances(b => ({ ...b, [from]: (b[from] || 0) - amt, [to]: (b[to] || 0) + amt }));
        if (memo !== undefined) {
          return pushLog([emit("Transfer", `${A(from)} → ${A(to)} · ${amt}`, 0), emit("Memo", `${A(me)} · ${memo}`, 1)]);
        }
        return pushLog([emit("Transfer", `${A(from)} → ${A(to)} · ${amt}`, 0)]);
      }

      // -------- transferFrom(exec, from, to, amt) --------
      case "transferFrom": {
        const { from, to, amt, memo } = op;
        const exec = me;
        const key = from + "→" + exec;
        if (paused.TRANSFER) return pushLog([revert("EnforcedPause", "feature: TRANSFER")]);
        if ((allowances[key] || 0) < amt) return pushLog([revert("ERC20InsufficientAllowance", `${A(exec)} allowance ${allowances[key] || 0} < ${amt}`)]);
        if (exec !== from && !isAuthorized(scopes.TRANSFER_EXECUTOR, exec)) return pushLog([revert("PolicyForbids", `TRANSFER_EXECUTOR · ${A(exec)}`)]);
        if (!isAuthorized(scopes.TRANSFER_SENDER, from)) return pushLog([revert("PolicyForbids", `TRANSFER_SENDER · ${A(from)}`)]);
        if (!isAuthorized(scopes.TRANSFER_RECEIVER, to)) return pushLog([revert("PolicyForbids", `TRANSFER_RECEIVER · ${A(to)}`)]);
        if ((balances[from] || 0) < amt) return pushLog([revert("ERC20InsufficientBalance", `${A(from)} has ${balances[from] || 0}`)]);
        setBalances(b => ({ ...b, [from]: (b[from] || 0) - amt, [to]: (b[to] || 0) + amt }));
        setAllowances(al => ({ ...al, [key]: (al[key] || 0) - amt }));
        if (memo !== undefined) {
          return pushLog([emit("Transfer", `${A(from)} → ${A(to)} · ${amt}`, 0), emit("Memo", `${A(me)} · ${memo}`, 1)]);
        }
        return pushLog([emit("Transfer", `${A(from)} → ${A(to)} · ${amt} (by ${A(exec)})`, 0)]);
      }

      // -------- approve(owner, spender, amt) : never gated --------
      case "approve": {
        const { owner, spender, amt } = op;
        const key = owner + "→" + spender;
        setAllowances(al => ({ ...al, [key]: amt }));
        return pushLog([emit("Approval", `${A(owner)} → ${A(spender)} · ${amt}`, 0)]);
      }

      // -------- mint(caller, to, amt) --------
      case "mint": {
        const { to, amt, memo } = op;
        if (paused.MINT) return pushLog([revert("EnforcedPause", "feature: MINT")]);
        if (!roleHas("MINT_ROLE", me)) return pushLog([revert("AccessControlUnauthorizedAccount", `${A(me)} lacks MINT_ROLE`)]);
        if (!isAuthorized(scopes.MINT_RECEIVER, to)) return pushLog([revert("PolicyForbids", `MINT_RECEIVER · ${A(to)}`)]);
        if (capExceeded(amt)) return pushLog([revert("SupplyCapExceeded", `${totalSupply() + amt} > cap ${token.supplyCap}`)]);
        setBalances(b => ({ ...b, [to]: (b[to] || 0) + amt }));
        if (memo !== undefined) {
          return pushLog([emit("Transfer", `0x0 → ${A(to)} · ${amt}`, 0), emit("Memo", `${A(me)} · ${memo}`, 1)]);
        }
        return pushLog([emit("Transfer", `0x0 → ${A(to)} · ${amt}`, 0)]);
      }

      // -------- burn(caller, amt) --------
      case "burn": {
        const { amt, memo } = op;
        if (paused.BURN) return pushLog([revert("EnforcedPause", "feature: BURN")]);
        if (!roleHas("BURN_ROLE", me)) return pushLog([revert("AccessControlUnauthorizedAccount", `${A(me)} lacks BURN_ROLE`)]);
        if ((balances[me] || 0) < amt) return pushLog([revert("ERC20InsufficientBalance", `${A(me)} has ${balances[me] || 0}`)]);
        setBalances(b => ({ ...b, [me]: (b[me] || 0) - amt }));
        if (memo !== undefined) {
          return pushLog([emit("Transfer", `${A(me)} → 0x0 · ${amt}`, 0), emit("Memo", `${A(me)} · ${memo}`, 1)]);
        }
        return pushLog([emit("Transfer", `${A(me)} → 0x0 · ${amt}`, 0)]);
      }

      // -------- burnBlocked(caller, target, amt) --------
      case "burnBlocked": {
        const { target, amt } = op;
        if (paused.BURN) return pushLog([revert("EnforcedPause", "feature: BURN")]);
        if (!roleHas("BURN_BLOCKED_ROLE", me)) return pushLog([revert("AccessControlUnauthorizedAccount", `${A(me)} lacks BURN_BLOCKED_ROLE`)]);
        if (isAuthorized(scopes.TRANSFER_SENDER, target)) return pushLog([revert("AccountNotBlocked", `${A(target)} not denied by TRANSFER_SENDER`)]);
        if ((balances[target] || 0) < amt) return pushLog([revert("ERC20InsufficientBalance", `${A(target)} has ${balances[target] || 0}`)]);
        setBalances(b => ({ ...b, [target]: (b[target] || 0) - amt }));
        return pushLog([emit("Transfer", `${A(target)} → 0x0 · ${amt} (seized)`, 0)]);
      }

      // -------- grantRole --------
      case "grantRole": {
        const { role, account } = op;
        if (!isAdmin(me)) return pushLog([revert("AccessControlUnauthorizedAccount", `${A(me)} is not DEFAULT_ADMIN_ROLE`)]);
        if (roleHas(role, account)) return pushLog([info("grantRole", `${A(account)} already holds ${role}`)]);
        setRoles(r => ({ ...r, [role]: [...(r[role] || []), account] }));
        return pushLog([emit("RoleGranted", `${role} → ${A(account)}`, 0)]);
      }

      // -------- revokeRole --------
      case "revokeRole": {
        const { role, account } = op;
        if (!isAdmin(me)) return pushLog([revert("AccessControlUnauthorizedAccount", `${A(me)} is not DEFAULT_ADMIN_ROLE`)]);
        if (role === "DEFAULT_ADMIN_ROLE" && (roles["DEFAULT_ADMIN_ROLE"] || []).length <= 1 && roleHas(role, account)) {
          return pushLog([revert("LastAdminCannotRenounce", "cannot remove the last admin")]);
        }
        setRoles(r => ({ ...r, [role]: (r[role] || []).filter(a => a !== account) }));
        return pushLog([emit("RoleRevoked", `${role} ✕ ${A(account)}`, 0)]);
      }

      // -------- renounceRole (self) --------
      case "renounceRole": {
        const { role } = op;
        // self-renounce does not require admin
        if (!roleHas(role, me)) return pushLog([info("renounceRole", `${A(me)} does not hold ${role}`)]);
        if (role === "DEFAULT_ADMIN_ROLE" && (roles["DEFAULT_ADMIN_ROLE"] || []).length <= 1) {
          return pushLog([revert("LastAdminCannotRenounce", "use renounceLastAdmin() instead")]);
        }
        setRoles(r => ({ ...r, [role]: (r[role] || []).filter(a => a !== me) }));
        return pushLog([emit("RoleRevoked", `${role} ✕ ${A(me)} (renounced)`, 0)]);
      }

      // -------- renounceLastAdmin --------
      case "renounceLastAdmin": {
        if (!roleHas("DEFAULT_ADMIN_ROLE", me)) return pushLog([revert("AccessControlUnauthorizedAccount", `${A(me)} is not DEFAULT_ADMIN_ROLE`)]);
        setRoles(r => ({ ...r, DEFAULT_ADMIN_ROLE: (r["DEFAULT_ADMIN_ROLE"] || []).filter(a => a !== me) }));
        setToken(t => ({ ...t, adminRenounced: true }));
        return pushLog([emit("RoleRevoked", `DEFAULT_ADMIN_ROLE ✕ ${A(me)}`, 0), info("admin", "token is now permanently admin-less")]);
      }

      // -------- updateSupplyCap --------
      case "updateSupplyCap": {
        const { newCap } = op; // number or null
        if (!isAdmin(me)) return pushLog([revert("AccessControlUnauthorizedAccount", `${A(me)} is not DEFAULT_ADMIN_ROLE`)]);
        if (newCap !== null && newCap < totalSupply()) return pushLog([revert("InvalidSupplyCap", `${newCap} < totalSupply ${totalSupply()}`)]);
        setToken(t => ({ ...t, supplyCap: newCap }));
        return pushLog([emit("SupplyCapUpdated", newCap === null ? UINT128_MAX : String(newCap), 0)]);
      }

      // -------- updatePolicy(scope, policyId) --------
      case "updatePolicy": {
        const { scope, policyId } = op;
        if (!isAdmin(me)) return pushLog([revert("AccessControlUnauthorizedAccount", `${A(me)} is not DEFAULT_ADMIN_ROLE`)]);
        setScopes(s => ({ ...s, [scope]: policyId }));
        const label = policyId === 0 ? "ALWAYS_ALLOW (0)" : policyId === ALWAYS_BLOCK ? `ALWAYS_BLOCK (${ALWAYS_BLOCK_RENDER})` : `#${policyId}`;
        return pushLog([emit("PolicyUpdated", `${scope} → ${label}`, 0)]);
      }

      // -------- createPolicy(type) --------
      case "createPolicy": {
        const { policyType } = op;
        const id = nextPolicyId;
        setPolicies(p => ({ ...p, [id]: { type: policyType, members: [] } }));
        setNextPolicyId(n => n + 1);
        return pushLog([emit("PolicyCreated", `#${id} · ${policyType} · admin ${A(me)}`, 0)]);
      }

      // -------- updateBlocklist / updateAllowlist (membership toggle) --------
      case "togglePolicyMember": {
        const { policyId, account } = op;
        const p = policies[policyId];
        if (!p) return pushLog([revert("PolicyDoesNotExist", `#${policyId}`)]);
        const has = p.members.includes(account);
        setPolicies(prev => ({
          ...prev,
          [policyId]: { ...prev[policyId], members: has ? prev[policyId].members.filter(a => a !== account) : [...prev[policyId].members, account] },
        }));
        const setter = p.type === "BLOCKLIST" ? "updateBlocklist" : "updateAllowlist";
        return pushLog([emit(setter, `#${policyId} · ${has ? "remove" : "add"} ${A(account)}`, 0)]);
      }

      // -------- pause / unpause --------
      case "pause": {
        const { feature } = op;
        if (!roleHas("PAUSE_ROLE", me)) return pushLog([revert("AccessControlUnauthorizedAccount", `${A(me)} lacks PAUSE_ROLE`)]);
        setPaused(p => ({ ...p, [feature]: true }));
        return pushLog([emit("Paused", `feature: ${feature}`, 0)]);
      }
      case "unpause": {
        const { feature } = op;
        if (!roleHas("UNPAUSE_ROLE", me)) return pushLog([revert("AccessControlUnauthorizedAccount", `${A(me)} lacks UNPAUSE_ROLE`)]);
        setPaused(p => ({ ...p, [feature]: false }));
        return pushLog([emit("Unpaused", `feature: ${feature}`, 0)]);
      }

      // -------- metadata --------
      case "updateName": {
        if (!roleHas("METADATA_ROLE", me)) return pushLog([revert("AccessControlUnauthorizedAccount", `${A(me)} lacks METADATA_ROLE`)]);
        setToken(t => ({ ...t, name: op.value }));
        return pushLog([
          emit("NameUpdated", op.value, 0),
          info("EIP712DomainChanged", "domain separator rotated"),
        ]);
      }
      case "updateSymbol": {
        if (!roleHas("METADATA_ROLE", me)) return pushLog([revert("AccessControlUnauthorizedAccount", `${A(me)} lacks METADATA_ROLE`)]);
        setToken(t => ({ ...t, symbol: op.value }));
        return pushLog([emit("SymbolUpdated", op.value, 0)]);
      }
      case "updateContractURI": {
        if (!roleHas("METADATA_ROLE", me)) return pushLog([revert("AccessControlUnauthorizedAccount", `${A(me)} lacks METADATA_ROLE`)]);
        setToken(t => ({ ...t, contractURI: op.value }));
        return pushLog([emit("ContractURIUpdated", op.value, 0)]);
      }

      // -------- permit --------
      case "permit": {
        const { owner, spender, amt, nonce } = op;
        const current = nonces[owner] || 0;
        if (nonce !== current) return pushLog([revert("ERC2612InvalidSigner", `stale nonce ${nonce} ≠ ${current} — replay rejected`)]);
        const key = owner + "→" + spender;
        setAllowances(al => ({ ...al, [key]: amt }));
        setNonces(n => ({ ...n, [owner]: current + 1 }));
        return pushLog([emit("Approval", `${A(owner)} → ${A(spender)} · ${amt} (permit, relayed by ${A(me)})`, 0)]);
      }

      // -------- ASSET: updateMultiplier --------
      case "updateMultiplier": {
        if (!roleHas("OPERATOR_ROLE", me)) return pushLog([revert("AccessControlUnauthorizedAccount", `${A(me)} lacks OPERATOR_ROLE`)]);
        setToken(t => ({ ...t, multiplier: op.value }));
        return pushLog([emit("MultiplierUpdated", `${op.value}× (WAD)`, 0)]);
      }

      // -------- ASSET: batchMint --------
      case "batchMint": {
        const { recipients, amt } = op;
        if (!roleHas("MINT_ROLE", me)) return pushLog([revert("AccessControlUnauthorizedAccount", `${A(me)} lacks MINT_ROLE`)]);
        const total = recipients.length * amt;
        if (capExceeded(total)) return pushLog([revert("SupplyCapExceeded", `${totalSupply() + total} > cap ${token.supplyCap}`)]);
        setBalances(b => {
          const nb = { ...b };
          recipients.forEach(r => { nb[r] = (nb[r] || 0) + amt; });
          return nb;
        });
        return pushLog(recipients.map((r, i) => emit("Transfer", `0x0 → ${A(r)} · ${amt}`, i)));
      }

      // -------- ASSET: announce(batchMint) --------
      case "announceBatchMint": {
        const { recipients, amt, id } = op;
        if (!roleHas("OPERATOR_ROLE", me)) return pushLog([revert("AccessControlUnauthorizedAccount", `${A(me)} lacks OPERATOR_ROLE`)]);
        if (!roleHas("MINT_ROLE", me)) return pushLog([revert("AccessControlUnauthorizedAccount", `inner batchMint needs MINT_ROLE`)]);
        const total = recipients.length * amt;
        if (capExceeded(total)) return pushLog([revert("SupplyCapExceeded", `${totalSupply() + total} > cap ${token.supplyCap}`)]);
        setBalances(b => {
          const nb = { ...b };
          recipients.forEach(r => { nb[r] = (nb[r] || 0) + amt; });
          return nb;
        });
        const inner = recipients.map((r, i) => emit("Transfer", `0x0 → ${A(r)} · ${amt}`, i + 1));
        return pushLog([
          emit("Announcement", `id ${id} · scheduled batchMint`, 0),
          ...inner,
          emit("EndAnnouncement", `id ${id}`, inner.length + 1),
        ]);
      }

      // -------- ASSET: updateExtraMetadata --------
      case "updateExtraMetadata": {
        const { mkey, value } = op;
        if (!roleHas("METADATA_ROLE", me)) return pushLog([revert("AccessControlUnauthorizedAccount", `${A(me)} lacks METADATA_ROLE`)]);
        setToken(t => {
          const em = { ...t.extraMetadata };
          if (value === "") delete em[mkey]; else em[mkey] = value;
          return { ...t, extraMetadata: em };
        });
        return pushLog([emit("ExtraMetadataUpdated", value === "" ? `${mkey} (removed)` : `${mkey} = ${value}`, 0)]);
      }

      default:
        return;
    }
  };

  // ======================================================================
  // UI PRIMITIVES
  // ======================================================================
  const TrafficLights = () => (
    <div style={{ display: "flex", gap: 6, marginRight: 14 }}>
      <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#ed6a5e", display: "inline-block" }} />
      <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#f5bf4f", display: "inline-block" }} />
      <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#61c554", display: "inline-block" }} />
    </div>
  );

  const Dot = ({ color, size }) => (
    <span style={{ width: size || 9, height: size || 9, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
  );

  const Btn = ({ onClick, children, tone, disabled, title }) => {
    const [hover, setHover] = useState(false);
    const base = tone === "accent" ? c.accent : c.toolBorder;
    return (
      <button
        onClick={disabled ? undefined : onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        title={title}
        className="b20d-btn"
        style={{
          fontFamily: sans, fontSize: 12.5, fontWeight: 600,
          color: disabled ? c.dim : hover ? c.text : c.body,
          background: disabled ? "transparent" : hover ? c.toolBg : c.header,
          border: `1px solid ${disabled ? c.toolBorder : hover ? base : c.toolBorder}`,
          borderRadius: 8, padding: "7px 11px",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "all 0.15s ease", opacity: disabled ? 0.5 : 1,
        }}>
        {children}
      </button>
    );
  };

  const Chip = ({ active, onClick, children, dot, disabled }) => {
    const [hover, setHover] = useState(false);
    return (
      <button
        onClick={disabled ? undefined : onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="b20d-chip"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontFamily: sans, fontSize: 12, fontWeight: 600,
          color: active ? c.text : disabled ? c.dim : hover ? c.text : c.body,
          background: active ? c.codeBg : hover ? c.toolBg : "transparent",
          border: `1px solid ${active ? c.accent : c.toolBorder}`,
          borderRadius: 20, padding: "5px 10px",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "all 0.15s ease", opacity: disabled ? 0.5 : 1,
        }}>
        {dot && <Dot color={dot} />}
        {children}
      </button>
    );
  };

  const Field = ({ label, children }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontFamily: sans, fontSize: 10.5, color: c.muted, fontWeight: 600, letterSpacing: "0.4px", textTransform: "uppercase" }}>{label}</span>
      {children}
    </div>
  );

  const TextInput = ({ value, onChange, width, placeholder, mono: isMono }) => (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        fontFamily: isMono ? mono : sans, fontSize: 12.5, color: c.text,
        background: c.inputBg, border: `1px solid ${c.toolBorder}`, borderRadius: 8,
        padding: "7px 10px", width: width || 140, outline: "none",
      }}
    />
  );

  const Box = ({ title, children, muted, hint }) => (
    <div style={{ background: c.header, border: `1px solid ${c.border}`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
      {title && <div style={{ fontFamily: sans, fontSize: 12.5, fontWeight: 700, color: muted ? c.muted : c.text, marginBottom: hint ? 3 : 9 }}>{title}</div>}
      {hint && <div style={{ fontFamily: sans, fontSize: 11, color: c.dim, marginBottom: 9, lineHeight: 1.4 }}>{hint}</div>}
      {children}
    </div>
  );

  const Row = ({ children, wrap }) => (
    <div style={{ display: "flex", flexWrap: wrap ? "wrap" : "nowrap", gap: 8, alignItems: "center" }}>{children}</div>
  );

  const Pill = ({ on, children }) => (
    <span style={{
      fontFamily: mono, fontSize: 10.5, fontWeight: 700,
      color: on ? c.error : c.success,
      background: on ? c.errorBg : "rgba(163,197,133,0.10)",
      border: `1px solid ${on ? c.error : c.success}`,
      borderRadius: 6, padding: "2px 6px",
    }}>{children}</span>
  );

  // ----- account selector row (small) -----
  const AccountPicker = ({ value, onChange, exclude }) => (
    <Row wrap>
      {ACCOUNTS.filter(a => !exclude || !exclude.includes(a.key)).map(a => (
        <Chip key={a.key} active={value === a.key} dot={a.dot} onClick={() => onChange(a.key)}>{a.label}</Chip>
      ))}
    </Row>
  );

  // ======================================================================
  // TOKEN SUMMARY STRIP
  // ======================================================================
  const derived = token ? deriveAddress(token.variant, token.deployer, token.salt) : null;

  const AddressRender = ({ d }) => (
    <span style={{ fontFamily: mono, fontSize: 11.5, color: c.body }}>
      <span style={{ color: c.dim }}>0x{d.prefix.slice(0, 8)}…</span>
      <span style={{ color: c.accent, fontWeight: 700, background: c.codeBg, padding: "1px 3px", borderRadius: 3 }}>{d.vByte}</span>
      <span style={{ color: c.dim }}>{d.tail.slice(0, 4)}…{d.tail.slice(-4)}</span>
    </span>
  );

  const SummaryStrip = () => {
    if (!token) return null;
    return (
      <div style={{ background: c.header, borderBottom: `1px solid ${c.border}`, padding: "10px 14px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", alignItems: "center" }}>
          <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: c.text }}>{token.name}</span>
          <span style={{ fontFamily: mono, fontSize: 11.5, color: c.code, background: c.codeBg, padding: "1px 6px", borderRadius: 4 }}>{token.symbol}</span>
          <span style={{
            fontFamily: sans, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.5px",
            color: token.variant === "STABLECOIN" ? "#7c9fe8" : c.accent,
            border: `1px solid ${token.variant === "STABLECOIN" ? "#7c9fe8" : c.accent}`,
            borderRadius: 5, padding: "1px 6px",
          }}>{token.variant}</span>
          <AddressRender d={derived} />
          {token.currency && <span style={{ fontFamily: sans, fontSize: 11.5, color: c.muted }}>currency() = <span style={{ color: c.body, fontWeight: 600 }}>{token.currency}</span></span>}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", alignItems: "center", marginTop: 7 }}>
          <span style={{ fontFamily: sans, fontSize: 11.5, color: c.muted }}>
            totalSupply <span style={{ fontFamily: mono, color: c.body }}>{totalSupply()}</span> / cap <span style={{ fontFamily: mono, color: c.body }}>{token.supplyCap === null ? "∞" : token.supplyCap}</span>
          </span>
          {token.variant === "ASSET" && <span style={{ fontFamily: sans, fontSize: 11.5, color: c.muted }}>multiplier() <span style={{ fontFamily: mono, color: c.body }}>{token.multiplier}×</span></span>}
          <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
            {["TRANSFER", "MINT", "BURN"].map(f => <Pill key={f} on={paused[f]}>{f}{paused[f] ? " ⏸" : ""}</Pill>)}
          </span>
          <span style={{ fontFamily: sans, fontSize: 11.5, color: c.muted }}>
            {adminLess()
              ? <span style={{ color: c.error, fontWeight: 600 }}>admin-less</span>
              : <>admin: <span style={{ color: c.body, fontWeight: 600 }}>{(roles["DEFAULT_ADMIN_ROLE"] || []).map(a => acctOf(a).label).join(", ") || "—"}</span></>}
          </span>
        </div>
      </div>
    );
  };

  // ======================================================================
  // TABS
  // ======================================================================
  const TABS = ["Create", "Policies", "Freeze & seize", "Roles", "Supply", "Pause", "Memos", "Permit"];

  // ----- balances mini-table used in several tabs -----
  const BalanceTable = ({ scaled }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
      {ACCOUNTS.map(a => (
        <span key={a.key} style={{ fontFamily: sans, fontSize: 11.5, color: c.muted, display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Dot color={a.dot} />{a.label}
          <span style={{ fontFamily: mono, color: c.body }}>{balances[a.key] || 0}</span>
          {scaled && token && token.variant === "ASSET" && (
            <span style={{ fontFamily: mono, color: c.accent }}>({((balances[a.key] || 0) * token.multiplier).toFixed(2)})</span>
          )}
        </span>
      ))}
    </div>
  );

  // ---------- CREATE TAB ----------
  const CreateTab = () => {
    if (token) {
      return (
        <div>
          <Box title="Token created" hint="This playground simulates B20 semantics client-side. Operate on the token through the other tabs; every event and revert appears in the log below.">
            <div style={{ display: "grid", gap: 6, fontFamily: sans, fontSize: 12.5, color: c.body }}>
              <div>Variant: <b>{token.variant}</b> · decimals <b>{token.decimals}</b>{token.currency ? <> · currency <b>{token.currency}</b></> : null}</div>
              <div>Address: <AddressRender d={derived} /></div>
              <div style={{ fontFamily: sans, fontSize: 11, color: c.dim }}>prefix | variant | keccak256(deployer, salt) — hash simulated</div>
            </div>
          </Box>
          <Btn tone="accent" onClick={resetAll}>Reset playground</Btn>
        </div>
      );
    }
    const dprefix = deriveAddress(cVariant, acctOf(actingAs).addr, cSalt);
    return (
      <div>
        <Box title="1 · Variant">
          <Row>
            <Chip active={cVariant === "STABLECOIN"} onClick={() => setCVariant("STABLECOIN")}>Stablecoin (6 decimals)</Chip>
            <Chip active={cVariant === "ASSET"} onClick={() => setCVariant("ASSET")}>Asset (6–18 decimals)</Chip>
          </Row>
        </Box>
        <Box title="2 · Parameters">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            <Field label="name"><TextInput value={cName} onChange={setCName} width={150} /></Field>
            <Field label="symbol"><TextInput value={cSymbol} onChange={setCSymbol} width={90} /></Field>
            {cVariant === "ASSET" ? (
              <Field label="decimals">
                <Row>
                  {[6, 8, 12, 18].map(d => <Chip key={d} active={cDecimals === d} onClick={() => setCDecimals(d)}>{d}</Chip>)}
                </Row>
              </Field>
            ) : (
              <Field label="currency (A–Z)"><TextInput value={cCurrency} onChange={v => setCCurrency(v.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 4))} width={70} /></Field>
            )}
          </div>
          <div style={{ marginTop: 10 }}>
            <Chip active={cInitialAdminZero} onClick={() => setCInitialAdminZero(!cInitialAdminZero)}>
              initialAdmin == address(0) — launch admin-less
            </Chip>
          </div>
        </Box>
        <Box title="3 · Salt & address derivation" hint="prefix | variant | keccak256(deployer, salt) — hash simulated. Edit the salt to watch bytes 11–19 change; the variant byte (10) flips with the variant.">
          <Row wrap>
            <Field label="salt"><TextInput value={cSalt} onChange={setCSalt} width={110} mono /></Field>
            <div style={{ marginTop: 14 }}><AddressRender d={dprefix} /></div>
          </Row>
        </Box>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Btn tone="accent" onClick={createToken}>createB20({cVariant.toLowerCase()}, …)</Btn>
          <span style={{ fontFamily: sans, fontSize: 11, color: c.dim }}>deployer = {acctOf(actingAs).label} (acting-as)</span>
        </div>
      </div>
    );
  };

  // ---------- POLICIES TAB ----------
  const PoliciesTab = () => (
    <div>
      <Box title="Create a policy" hint="ALWAYS_ALLOW = 0 · ALWAYS_BLOCK = 0x0100…01 (built-in, no creation). New IDs count up from 2; the top byte encodes the type.">
        <Row>
          <Btn onClick={() => execute({ type: "createPolicy", policyType: "ALLOWLIST" })}>createPolicy(ALLOWLIST)</Btn>
          <Btn onClick={() => execute({ type: "createPolicy", policyType: "BLOCKLIST" })}>createPolicy(BLOCKLIST)</Btn>
        </Row>
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {Object.keys(policies).length === 0 && <span style={{ fontFamily: sans, fontSize: 11.5, color: c.dim }}>No custom policies yet.</span>}
          {Object.entries(policies).map(([id, p]) => (
            <div key={id} style={{ border: `1px solid ${c.toolBorder}`, borderRadius: 8, padding: 9 }}>
              <div style={{ fontFamily: mono, fontSize: 11.5, color: c.body, marginBottom: 6 }}>
                #{id} · <span style={{ color: p.type === "BLOCKLIST" ? c.error : c.success }}>{p.type}</span>
                <span style={{ color: c.dim }}> · default {p.type === "BLOCKLIST" ? "authorized" : "denied"}</span>
              </div>
              <Row wrap>
                {ACCOUNTS.map(a => (
                  <Chip key={a.key} active={p.members.includes(a.key)} dot={a.dot}
                    onClick={() => execute({ type: "togglePolicyMember", policyId: Number(id), account: a.key })}>
                    {a.label}
                  </Chip>
                ))}
              </Row>
            </div>
          ))}
        </div>
      </Box>

      <Box title="Bind a policy to a scope" hint="updatePolicy is admin-gated. Validate policyExists first — binding a non-existent ALLOWLIST id silently denies everyone.">
        {SCOPES.map(s => (
          <div key={s} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 7 }}>
            <span style={{ fontFamily: mono, fontSize: 11, color: c.muted, minWidth: 145 }}>{s}</span>
            <Chip active={scopes[s] === 0} onClick={() => execute({ type: "updatePolicy", scope: s, policyId: 0 })}>ALWAYS_ALLOW</Chip>
            <Chip active={scopes[s] === ALWAYS_BLOCK} onClick={() => execute({ type: "updatePolicy", scope: s, policyId: ALWAYS_BLOCK })}>ALWAYS_BLOCK</Chip>
            {Object.keys(policies).map(id => (
              <Chip key={id} active={scopes[s] === Number(id)} onClick={() => execute({ type: "updatePolicy", scope: s, policyId: Number(id) })}>#{id}</Chip>
            ))}
          </div>
        ))}
      </Box>

      <Box title="Try it" muted>
        <Row wrap>
          <Btn onClick={() => execute({ type: "transfer", from: "Alice", to: "Bob", amt: 10 })}>transfer Alice→Bob (10)</Btn>
          <Btn onClick={() => { execute({ type: "approve", owner: "Alice", spender: "Processor", amt: 10 }); execute({ type: "transferFrom", from: "Alice", to: "Bob", amt: 10 }); }}>transferFrom Processor (Alice→Bob)</Btn>
          <Btn onClick={() => execute({ type: "mint", to: "Carol", amt: 10 })}>mint → Carol (10)</Btn>
        </Row>
        <div style={{ marginTop: 9 }}><BalanceTable /></div>
      </Box>
    </div>
  );

  // ---------- FREEZE & SEIZE TAB ----------
  const FreezeTab = () => {
    const blocklistId = Object.entries(policies).find(([, p]) => p.type === "BLOCKLIST" && p.members.includes("Bob"));
    const bound = blocklistId && scopes.TRANSFER_SENDER === Number(blocklistId[0]);
    return (
      <div>
        <Box title="The freeze-and-seize path" hint="burnBlocked lets BURN_BLOCKED_ROLE burn a third party's balance, but only if that account is denied by TRANSFER_SENDER_POLICY.">
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <div style={{ fontFamily: sans, fontSize: 11.5, color: c.muted, marginBottom: 5 }}>Step 1 — freeze: create a blocklist with Bob and bind it to TRANSFER_SENDER</div>
              <Btn tone="accent" onClick={() => {
                const id = nextPolicyId;
                execute({ type: "createPolicy", policyType: "BLOCKLIST" });
                execute({ type: "togglePolicyMember", policyId: id, account: "Bob" });
                execute({ type: "updatePolicy", scope: "TRANSFER_SENDER", policyId: id });
              }}>Freeze Bob (create + block + bind)</Btn>
            </div>
            <div>
              <div style={{ fontFamily: sans, fontSize: 11.5, color: c.muted, marginBottom: 5 }}>Step 2 — Bob attempts a transfer → PolicyForbids</div>
              <Btn onClick={() => execute({ type: "transfer", from: "Bob", to: "Alice", amt: 5 })}>transfer Bob→Alice (5)</Btn>
            </div>
            <div>
              <div style={{ fontFamily: sans, fontSize: 11.5, color: c.muted, marginBottom: 5 }}>Step 3 — seize: grant BURN_BLOCKED_ROLE, then burnBlocked(Bob)</div>
              <Row wrap>
                <Btn onClick={() => execute({ type: "grantRole", role: "BURN_BLOCKED_ROLE", account: actingAs })}>grantRole BURN_BLOCKED_ROLE → {acctOf(actingAs).label}</Btn>
                <Btn tone="accent" onClick={() => execute({ type: "burnBlocked", target: "Bob", amt: 5 })}>burnBlocked(Bob, 5)</Btn>
              </Row>
            </div>
          </div>
        </Box>
        <Box title="Failure paths" muted hint="burnBlocked reverts if the caller lacks BURN_BLOCKED_ROLE, or if the target is NOT denied by TRANSFER_SENDER (AccountNotBlocked).">
          <Row wrap>
            <Btn onClick={() => execute({ type: "burnBlocked", target: "Alice", amt: 5 })}>burnBlocked(Alice) — not blocked</Btn>
            <Btn onClick={() => { execute({ type: "revokeRole", role: "BURN_BLOCKED_ROLE", account: actingAs }); execute({ type: "burnBlocked", target: "Bob", amt: 5 }); }}>burnBlocked without role</Btn>
          </Row>
        </Box>
        <div style={{ fontFamily: sans, fontSize: 11, color: bound ? c.success : c.dim, marginBottom: 8 }}>
          {bound ? "Bob is currently frozen (denied by TRANSFER_SENDER)." : "Bob is not yet frozen."}
        </div>
        <Box muted><BalanceTable /></Box>
      </div>
    );
  };

  // ---------- ROLES TAB ----------
  const RolesTab = () => {
    const allRoles = Object.keys(roles);
    const gatedTry = {
      MINT_ROLE: { label: "mint → Carol (5)", op: { type: "mint", to: "Carol", amt: 5 } },
      BURN_ROLE: { label: "burn (5)", op: { type: "burn", amt: 5 } },
      PAUSE_ROLE: { label: "pause TRANSFER", op: { type: "pause", feature: "TRANSFER" } },
      UNPAUSE_ROLE: { label: "unpause TRANSFER", op: { type: "unpause", feature: "TRANSFER" } },
    };
    const [mkey, setMkey] = useState("prospectus");
    const [mval, setMval] = useState("ipfs://Qm…");
    const [emKey, setEmKey] = useState("cusip");
    const [emVal, setEmVal] = useState("38259P508");
    return (
      <div>
        <Box title="Role × account grant matrix" hint="grantRole / revokeRole require DEFAULT_ADMIN_ROLE. Custom roles carry no built-in effect.">
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontFamily: sans, fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "4px 8px", color: c.muted, fontWeight: 600 }}>role</th>
                  {ACCOUNTS.map(a => <th key={a.key} style={{ padding: "4px 6px", color: c.muted, fontWeight: 600 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Dot color={a.dot} />{a.label}</span></th>)}
                </tr>
              </thead>
              <tbody>
                {allRoles.map(r => (
                  <tr key={r}>
                    <td style={{ padding: "3px 8px", fontFamily: mono, fontSize: 10.5, color: c.body, whiteSpace: "nowrap" }}>{r}</td>
                    {ACCOUNTS.map(a => {
                      const has = roleHas(r, a.key);
                      return (
                        <td key={a.key} style={{ padding: "3px 6px", textAlign: "center" }}>
                          <Chip active={has} onClick={() => execute(has
                            ? { type: "revokeRole", role: r, account: a.key }
                            : { type: "grantRole", role: r, account: a.key })}>
                            {has ? "✓" : "+"}
                          </Chip>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Box>

        <Box title="Try a gated action" muted>
          <Row wrap>
            {Object.entries(gatedTry).map(([role, g]) => <Btn key={role} onClick={() => execute(g.op)}>{g.label}</Btn>)}
          </Row>
        </Box>

        <Box title="Metadata (METADATA_ROLE)" hint="updateName also rotates the EIP-712 domain separator (EIP712DomainChanged).">
          <Row wrap>
            <Btn onClick={() => execute({ type: "updateName", value: token.name + " v2" })}>updateName</Btn>
            <Btn onClick={() => execute({ type: "updateSymbol", value: token.symbol + "x" })}>updateSymbol</Btn>
            <Btn onClick={() => execute({ type: "updateContractURI", value: "ipfs://Qm…/contract.json" })}>updateContractURI</Btn>
          </Row>
        </Box>

        <Box title="Admin renunciation" hint="renounceRole on the last admin reverts (LastAdminCannotRenounce). renounceLastAdmin() is the only permanent path; afterwards grantRole reverts but existing roles keep working.">
          <Row wrap>
            <Btn onClick={() => execute({ type: "renounceRole", role: "DEFAULT_ADMIN_ROLE" })}>renounceRole(DEFAULT_ADMIN_ROLE)</Btn>
            <Btn tone="accent" onClick={() => execute({ type: "renounceLastAdmin" })}>renounceLastAdmin()</Btn>
            <Btn onClick={() => execute({ type: "grantRole", role: "MINT_ROLE", account: "Carol" })}>grantRole MINT_ROLE → Carol</Btn>
            <Btn onClick={() => execute({ type: "mint", to: "Alice", amt: 5 })}>existing MINT_ROLE still mints</Btn>
          </Row>
        </Box>

        {token && token.variant === "ASSET" && (
          <Box title="Extra metadata (Asset · METADATA_ROLE)" hint="updateExtraMetadata writes an arbitrary key/value. An empty value removes the entry.">
            <Row wrap>
              <Field label="key"><TextInput value={emKey} onChange={setEmKey} width={90} /></Field>
              <Field label="value (empty = remove)"><TextInput value={emVal} onChange={setEmVal} width={120} /></Field>
              <div style={{ marginTop: 14 }}><Btn onClick={() => execute({ type: "updateExtraMetadata", mkey: emKey, value: emVal })}>updateExtraMetadata</Btn></div>
            </Row>
            <div style={{ marginTop: 8, fontFamily: mono, fontSize: 11, color: c.muted }}>
              {Object.keys(token.extraMetadata).length === 0 ? "extraMetadata: {}" : Object.entries(token.extraMetadata).map(([k, v]) => <span key={k} style={{ marginRight: 12 }}>{k}={v}</span>)}
            </div>
          </Box>
        )}
      </div>
    );
  };

  // ---------- SUPPLY TAB ----------
  const SupplyTab = () => {
    const [mintTo, setMintTo] = useState("Alice");
    const [mintAmt, setMintAmt] = useState(100);
    const [capVal, setCapVal] = useState(1000);
    return (
      <div>
        <Box title="Mint (MINT_ROLE)" hint="Recipient is checked against MINT_RECEIVER_POLICY; reverts SupplyCapExceeded past the cap.">
          <Row wrap>
            <Field label="to"><AccountPicker value={mintTo} onChange={setMintTo} /></Field>
          </Row>
          <Row wrap>
            {[10, 50, 100, 500].map(v => <Chip key={v} active={mintAmt === v} onClick={() => setMintAmt(v)}>{v}</Chip>)}
            <Btn tone="accent" onClick={() => execute({ type: "mint", to: mintTo, amt: mintAmt })}>mint({acctOf(mintTo).label}, {mintAmt})</Btn>
          </Row>
          <div style={{ marginTop: 9 }}><BalanceTable scaled /></div>
        </Box>

        <Box title="Supply cap (admin-gated)" hint="Sentinel type(uint128).max = no cap. updateSupplyCap reverts InvalidSupplyCap if newCap < totalSupply.">
          <Row wrap>
            {[500, 1000, 5000].map(v => <Chip key={v} active={capVal === v} onClick={() => setCapVal(v)}>{v}</Chip>)}
            <Btn onClick={() => execute({ type: "updateSupplyCap", newCap: capVal })}>updateSupplyCap({capVal})</Btn>
            <Btn onClick={() => execute({ type: "updateSupplyCap", newCap: null })}>updateSupplyCap(no cap)</Btn>
          </Row>
          <div style={{ marginTop: 6, fontFamily: sans, fontSize: 11, color: c.dim }}>
            Set the cap below totalSupply ({totalSupply()}) to see InvalidSupplyCap; mint past it to see SupplyCapExceeded.
          </div>
        </Box>

        <Box title="Burn (BURN_ROLE)" muted>
          <Row wrap>
            {[10, 50].map(v => <Btn key={v} onClick={() => execute({ type: "burn", amt: v })}>burn({v}) as {acctOf(actingAs).label}</Btn>)}
          </Row>
        </Box>

        {token && token.variant === "ASSET" && (
          <>
            <Box title="Multiplier (Asset · OPERATOR_ROLE)" hint="A WAD rebase multiplier scaling all balance reads. Raw balances are unchanged; scaledBalanceOf = raw × multiplier.">
              <Row wrap>
                {[1.0, 1.05, 1.25, 0.9].map(v => <Chip key={v} active={token.multiplier === v} onClick={() => execute({ type: "updateMultiplier", value: v })}>{v}×</Chip>)}
              </Row>
              <div style={{ marginTop: 8, fontFamily: sans, fontSize: 11, color: c.muted }}>raw (scaled) shown side by side:</div>
              <div style={{ marginTop: 4 }}><BalanceTable scaled /></div>
            </Box>
            <Box title="Batch mint (Asset · MINT_ROLE)" hint="Mints to several recipients in one call. Cap-checked against the sum. Best wrapped in announce().">
              <Row wrap>
                <Btn onClick={() => execute({ type: "batchMint", recipients: ["Alice", "Bob", "Carol"], amt: 25 })}>batchMint([Alice,Bob,Carol], 25)</Btn>
                <Btn tone="accent" onClick={() => execute({ type: "announceBatchMint", recipients: ["Alice", "Bob", "Carol"], amt: 25, id: 1 })}>announce(batchMint…) (OPERATOR_ROLE)</Btn>
              </Row>
            </Box>
          </>
        )}
      </div>
    );
  };

  // ---------- PAUSE TAB ----------
  const PauseTab = () => (
    <div>
      <Box title="Granular pause" hint="pause needs PAUSE_ROLE; unpause needs UNPAUSE_ROLE — distinct roles, enforced separately. Each feature pauses independently.">
        {["TRANSFER", "MINT", "BURN"].map(f => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontFamily: mono, fontSize: 12, color: c.body, minWidth: 80 }}>{f}</span>
            <Pill on={paused[f]}>{paused[f] ? "paused" : "live"}</Pill>
            <Btn onClick={() => execute({ type: "pause", feature: f })} disabled={paused[f]}>pause</Btn>
            <Btn onClick={() => execute({ type: "unpause", feature: f })} disabled={!paused[f]}>unpause</Btn>
          </div>
        ))}
      </Box>
      <Box title="Unrelated operations still work" muted hint="Pausing TRANSFER does not stop mint/burn (unless those are paused too).">
        <Row wrap>
          <Btn onClick={() => execute({ type: "mint", to: "Alice", amt: 10 })}>mint → Alice (10)</Btn>
          <Btn onClick={() => execute({ type: "transfer", from: "Alice", to: "Bob", amt: 5 })}>transfer Alice→Bob (5)</Btn>
          <Btn onClick={() => execute({ type: "approve", owner: "Alice", spender: "Processor", amt: 20 })}>approve (never pause-gated)</Btn>
        </Row>
      </Box>
    </div>
  );

  // ---------- MEMOS TAB ----------
  const MemosTab = () => {
    const [memo, setMemo] = useState("invoice-8842");
    const asHex = "0x" + Array.from(memo).map(ch => ch.charCodeAt(0).toString(16).padStart(2, "0")).join("").slice(0, 20).padEnd(20, "0") + "…";
    return (
      <div>
        <Box title="Memos" hint="Every memo-emitting op emits Memo(caller, memo) immediately after the primary event. Indexers join via (txHash, logIndex − 1).">
          <Row wrap>
            <Field label="memo (bytes32)"><TextInput value={memo} onChange={setMemo} width={160} /></Field>
            <div style={{ marginTop: 14, fontFamily: mono, fontSize: 11, color: c.code, background: c.codeBg, padding: "4px 8px", borderRadius: 5 }}>{asHex}</div>
          </Row>
          <div style={{ marginTop: 10 }}>
            <Row wrap>
              <Btn onClick={() => execute({ type: "transfer", from: "Alice", to: "Bob", amt: 10, memo })}>transferWithMemo Alice→Bob (10)</Btn>
              <Btn onClick={() => execute({ type: "mint", to: "Carol", amt: 10, memo })}>mintWithMemo → Carol (10)</Btn>
              <Btn onClick={() => execute({ type: "burn", amt: 10, memo })}>burnWithMemo (10) as {acctOf(actingAs).label}</Btn>
            </Row>
          </div>
        </Box>
        <Box title="Joined events" muted hint="The primary event at logIndex n and Memo at n+1 are one logical operation. Highlighted pairs below show the join.">
          <MemoJoinView />
        </Box>
      </div>
    );
  };

  const MemoJoinView = () => {
    const pairs = [];
    for (let i = 0; i < eventLog.length - 1; i++) {
      const a = eventLog[i], b = eventLog[i + 1];
      if (b.kind === "event" && b.name === "Memo" && b.logIndex === (a.logIndex + 1) && a.kind === "event") {
        pairs.push([a, b]);
      }
    }
    if (pairs.length === 0) return <span style={{ fontFamily: sans, fontSize: 11.5, color: c.dim }}>Fire a *WithMemo op to see the join.</span>;
    return (
      <div style={{ display: "grid", gap: 8 }}>
        {pairs.slice(-4).map(([a, b], i) => (
          <div key={i} style={{ display: "flex", gap: 8 }}>
            <div style={{ width: 3, borderRadius: 3, background: c.accent }} />
            <div style={{ flex: 1, display: "grid", gap: 3 }}>
              <div style={{ fontFamily: mono, fontSize: 11, color: c.body }}><span style={{ color: c.dim }}>[{a.logIndex}]</span> {a.name} <span style={{ color: c.muted }}>{a.args}</span></div>
              <div style={{ fontFamily: mono, fontSize: 11, color: c.body }}><span style={{ color: c.accent }}>[{b.logIndex}]</span> {b.name} <span style={{ color: c.muted }}>{b.args}</span> <span style={{ color: c.dim }}>← join on logIndex − 1</span></div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ---------- PERMIT TAB ----------
  const PermitTab = () => {
    const [pOwner, setPOwner] = useState("Alice");
    const [pSpender, setPSpender] = useState("Processor");
    const [pValue, setPValue] = useState(100);
    const [signed, setSigned] = useState(null);
    const ownerNonce = nonces[pOwner] || 0;
    const key = pOwner + "→" + pSpender;
    return (
      <div>
        <Box title="1 · Sign as holder" hint="ERC-2612 signed approval over an EIP-712 domain. ECDSA only — ERC-1271 contract signatures are rejected.">
          <Row wrap>
            <Field label="owner"><AccountPicker value={pOwner} onChange={setPOwner} /></Field>
          </Row>
          <Row wrap>
            <Field label="spender"><AccountPicker value={pSpender} onChange={setPSpender} /></Field>
          </Row>
          <Row wrap>
            {[50, 100, 250].map(v => <Chip key={v} active={pValue === v} onClick={() => setPValue(v)}>{v}</Chip>)}
            <Btn tone="accent" onClick={() => setSigned({ owner: pOwner, spender: pSpender, value: pValue, nonce: ownerNonce })}>Sign permit</Btn>
          </Row>
          {signed && (
            <div style={{ marginTop: 10, border: `1px solid ${c.accent}`, background: c.codeBg, borderRadius: 8, padding: 10, fontFamily: mono, fontSize: 11, color: c.body, lineHeight: 1.7 }}>
              <div style={{ color: c.accent, fontWeight: 700, marginBottom: 4 }}>✎ signed payload</div>
              owner: {acctOf(signed.owner).label} · spender: {acctOf(signed.spender).label}<br />
              value: {signed.value} · nonce: {signed.nonce} · deadline: ∞<br />
              <span style={{ color: c.dim }}>v,r,s: 0x{(signed.nonce * 7 + 12).toString(16)}…ecdsa</span>
            </div>
          )}
        </Box>

        <Box title="2 · Submit as relayer" hint="Any account may relay the signed permit. A stale nonce reverts (replay protection).">
          <Row wrap>
            <Btn tone="accent" disabled={!signed} onClick={() => signed && execute({ type: "permit", owner: signed.owner, spender: signed.spender, amt: signed.value, nonce: signed.nonce })}>
              Submit permit as {acctOf(actingAs).label}
            </Btn>
            <Btn disabled={!signed} onClick={() => signed && execute({ type: "permit", owner: signed.owner, spender: signed.spender, amt: signed.value, nonce: signed.nonce })}>
              Replay same signature (stale nonce → revert)
            </Btn>
          </Row>
          <div style={{ marginTop: 9, fontFamily: sans, fontSize: 11.5, color: c.muted }}>
            allowance({acctOf(pOwner).label} → {acctOf(pSpender).label}) = <span style={{ fontFamily: mono, color: c.body }}>{allowances[key] || 0}</span>
            <span style={{ marginLeft: 14 }}>nonce({acctOf(pOwner).label}) = <span style={{ fontFamily: mono, color: c.body }}>{ownerNonce}</span></span>
          </div>
        </Box>
      </div>
    );
  };

  // ----- tab dispatcher -----
  const renderTab = () => {
    if (activeTab === "Create") return <CreateTab />;
    if (!token) return <div style={{ fontFamily: sans, fontSize: 13, color: c.dim, padding: 12 }}>Create a token first.</div>;
    if (activeTab === "Policies") return <PoliciesTab />;
    if (activeTab === "Freeze & seize") return <FreezeTab />;
    if (activeTab === "Roles") return <RolesTab />;
    if (activeTab === "Supply") return <SupplyTab />;
    if (activeTab === "Pause") return <PauseTab />;
    if (activeTab === "Memos") return <MemosTab />;
    if (activeTab === "Permit") return <PermitTab />;
    return null;
  };

  // ======================================================================
  // RENDER
  // ======================================================================
  return (
    <div style={{ margin: "28px 0", borderRadius: 14, overflow: "hidden", border: `1px solid ${c.border}`, background: c.bg, boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
      <style>{`
        @keyframes b20d-pulse{0%,100%{opacity:0.35}50%{opacity:1}}
        .b20d-body{padding:16px 18px}
        .b20d-tabs{padding:0 12px}
        .b20d-log{height:160px}
        @media(max-width:640px){
          .b20d-body{padding:12px 12px}
          .b20d-log{height:150px}
          .b20d-tabbtn{font-size:11px !important;padding:8px 8px !important}
        }
      `}</style>

      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "center", padding: "11px 14px", background: c.header, borderBottom: `1px solid ${c.border}` }}>
        <TrafficLights />
        <span style={{ fontFamily: sans, fontSize: 13, color: c.text, fontWeight: 600 }}>B20 Playground</span>
        <span style={{ fontFamily: sans, fontSize: 11, color: c.dim, marginLeft: 8 }}>simulated · client-side</span>
        <div style={{ flex: 1 }} />
        <button onClick={resetAll} title="Reset" style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 28, height: 24, borderRadius: 6, background: "transparent",
          border: "1px solid transparent", cursor: "pointer", color: c.dim,
        }}
          onMouseEnter={e => { e.currentTarget.style.color = c.text; e.currentTarget.style.borderColor = c.toolBorder; }}
          onMouseLeave={e => { e.currentTarget.style.color = c.dim; e.currentTarget.style.borderColor = "transparent"; }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>
        </button>
      </div>

      {/* Token summary strip */}
      <SummaryStrip />

      {/* Acting-as selector */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, padding: "9px 14px", borderBottom: `1px solid ${c.border}`, background: c.bg }}>
        <span style={{ fontFamily: sans, fontSize: 11, color: c.muted, fontWeight: 600 }}>acting as (msg.sender):</span>
        {ACCOUNTS.map(a => (
          <Chip key={a.key} active={actingAs === a.key} dot={a.dot} onClick={() => setActingAs(a.key)}>{a.label}</Chip>
        ))}
      </div>

      {/* Tab bar */}
      <div className="b20d-tabs" style={{ display: "flex", flexWrap: "wrap", borderBottom: `1px solid ${c.border}`, background: c.header }}>
        {TABS.map(t => {
          const disabled = t !== "Create" && !token;
          const active = activeTab === t;
          return (
            <button key={t}
              onClick={disabled ? undefined : () => setActiveTab(t)}
              title={disabled ? "create a token first" : undefined}
              className="b20d-tabbtn"
              style={{
                fontFamily: sans, fontSize: 12, fontWeight: active ? 700 : 500,
                color: active ? c.text : disabled ? c.dim : c.muted,
                background: "transparent", border: "none",
                borderBottom: `2px solid ${active ? c.accent : "transparent"}`,
                padding: "10px 12px", cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.45 : 1, whiteSpace: "nowrap",
              }}>
              {t}
            </button>
          );
        })}
      </div>

      {/* Tab body */}
      <div className="b20d-body" style={{ maxHeight: 420, overflowY: "auto" }}>
        {renderTab()}
      </div>

      {/* Event log */}
      <div style={{ borderTop: `1px solid ${c.border}`, background: c.header }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 14px 4px" }}>
          <span style={{ fontFamily: sans, fontSize: 11, color: c.muted, fontWeight: 700, letterSpacing: "0.4px" }}>EVENT LOG</span>
          {eventLog.length > 0 && (
            <button onClick={() => setEventLog([])} style={{ fontFamily: sans, fontSize: 11, color: c.dim, background: "transparent", border: "none", cursor: "pointer" }}>clear</button>
          )}
        </div>
        <div ref={logRef} className="b20d-log" style={{ overflowY: "auto", padding: "0 14px 10px" }}>
          {eventLog.length === 0 && <div style={{ fontFamily: sans, fontSize: 12, color: c.dim, padding: "8px 0" }}>Emitted events and reverts appear here.</div>}
          {eventLog.map(e => (
            <div key={e.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "3px 0", borderBottom: `1px solid rgba(52,50,47,0.5)` }}>
              <span style={{ fontFamily: mono, fontSize: 10.5, color: c.dim, minWidth: 22, textAlign: "right", flexShrink: 0 }}>
                {e.logIndex !== null && e.logIndex !== undefined ? e.logIndex : "·"}
              </span>
              <span style={{ flexShrink: 0, width: 12, marginTop: 1 }}>
                {e.kind === "event" && <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke={c.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
                {e.kind === "revert" && <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke={c.error} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>}
                {e.kind === "info" && <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: c.dim, marginLeft: 3, marginTop: 4 }} />}
              </span>
              <span style={{ fontFamily: mono, fontSize: 11.5, lineHeight: 1.4 }}>
                <span style={{ color: e.kind === "revert" ? c.error : e.kind === "info" ? c.muted : c.body, fontWeight: e.kind === "info" ? 400 : 600 }}>{e.name}</span>
                {e.args && <span style={{ color: c.dim }}> · {e.args}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
