export const PaymentsDemo = ({ flow }) => {
  // No imports allowed in Mintlify snippets: useState/useEffect/useRef are injected globally.
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
  // Account markers use fixed brand hues that read on either theme.
  const dot = { Merchant: C.blue, Alice: "#66c800", Bob: "#8a63d2", Agent: "#3c8aff" };

  const NETWORK = "Base Vibenet";

  // ---- result-line helpers ----
  const ok = (name, detail) => ({ kind: "ok", name, detail: detail || "" });
  const err = (name, detail) => ({ kind: "err", name, detail: detail || "" });
  const nfo = (name, detail) => ({ kind: "info", name, detail: detail || "" });
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const M = (v) => ({ v, mono: true });

  const freshSim = () => ({ balances: {}, blocked: null });

  // ======================================================================
  // Scripted flows. Each step mutates a cloned sim and returns log lines.
  // ======================================================================
  const FLOWS = {
    simple: {
      label: "Transfer", title: "Send USDC directly to another wallet", readout: true,
      href: "https://developers.circle.com/stablecoins/usdc-contract-addresses",
      erc20: "A standard ERC-20 transfer moves USDC directly from the sender to the recipient.",
      steps: [
        { stage: "Prepare", action: "Enter payment",
          text: "Alice enters the recipient address and the amount of USDC to send.",
          summary: [["From", "Alice"], ["To", "Bob"], ["Amount", M("5.00 USDC")], ["Network", NETWORK]],
          run: (s) => { s.balances.Alice = 5; return { entries: [nfo("recipient", "Bob"), nfo("amount", "5.00 USDC")] }; } },
        { stage: "Send", action: "Send $5",
          text: "Alice signs the transfer and submits it directly to the USDC contract.",
          summary: [["Operation", "ERC-20 transfer"], ["From", "Alice"], ["To", "Bob"], ["Amount", M("5.00 USDC")]],
          run: (s) => { s.balances.Alice = 0; s.balances.Bob = 5; return { entries: [ok("Transfer", "Alice → Bob · 5.00 USDC"), ok("receipt", "confirmed")], caption: "Bob controls the USDC as soon as the transfer confirms." }; } }
      ],
    },
    accept: {
      label: "Accept", title: "Charge an escrow-backed payment", readout: true,
      href: "https://github.com/base/commerce-payments/blob/main/docs/operations/Charge.md",
      erc20: "The payer signs immutable terms; the operator collects and settles in one atomic transaction.",
      steps: [
        { stage: "Approve", action: "Approve $5",
          text: "Alice approves a 5 USDC protocol payment with the merchant, expiry, and fee bounds fixed.",
          summary: [["Operation", "Charge"], ["Receiver", "Merchant"], ["Payer", "Alice"], ["Maximum", M("5.00 USDC")], ["Network", NETWORK]],
          run: (s) => { s.balances.Alice = 5; return { entries: [ok("PaymentInfo", "terms fixed"), ok("collector signature", "5.00 USDC")], caption: "The signature authorizes collection; it is not settlement yet." }; } },
        { stage: "Charge", action: "Submit charge",
          text: "The operator submits charge, pays gas, and settles the payment atomically.",
          summary: [["Caller", "Operator"], ["From", "Alice"], ["To", "Merchant"], ["Amount", M("5.00 USDC")], ["State", "Refundable"]],
          run: (s) => { s.balances.Alice = 0; s.balances.Merchant = 5; s.refundable = 5; return { entries: [ok("PaymentCharged", "5.00 USDC"), nfo("refundableAmount", "5.00 USDC")], caption: "A successful PaymentCharged event is the settlement signal." }; } },
      ],
    },
    verify: {
      label: "Verify", title: "Confirm a protocol payment before you ship", readout: false,
      href: "https://github.com/base/commerce-payments/blob/main/src/AuthCaptureEscrow.sol",
      erc20: "Never trust the browser — confirm AuthCaptureEscrow events and payment state server-side.",
      steps: [
        { stage: "Receive", action: "Send hash",
          text: "Your frontend sends the settlement transaction and expected paymentInfoHash to your backend.",
          summary: [["Endpoint", M("POST /orders/confirm")], ["Transaction", M("0x9f…c2")], ["Payment hash", M("0xa7…91")]],
          run: () => ({ entries: [nfo("POST", "/orders/confirm"), nfo("paymentInfoHash", "0xa7…91")] }) },
        { stage: "Verify", action: "Decode event",
          text: "Confirm PaymentCharged or PaymentCaptured came from the v1.1 escrow and matches the order.",
          summary: [["Contract", "AuthCaptureEscrow"], ["Event", "PaymentCharged"], ["Amount", M("5.00 USDC")], ["State", "Refundable"]],
          run: () => ({ entries: [ok("PaymentCharged", "0xa7…91 · 5.00 USDC"), ok("paymentState", "refundable 5.00")], caption: "Protocol events identify the lifecycle operation; raw token transfers do not." }) },
        { stage: "Replay", action: "Replay event",
          text: "A database uniqueness constraint rejects the same event a second time.",
          summary: [["Event key", M("chain + tx + logIndex")], ["Result", "Already processed"], ["Fulfillment", "Rejected"]],
          run: () => ({ entries: [err("rejected", "event already processed")], caption: "Claim the event in the same durable workflow as fulfillment." }) },
      ],
    },
    b20: {
      label: "B20", title: "Accept and reconcile a B20 payment", readout: false,
      href: "https://github.com/base/commerce-payments/blob/main/docs/TokenCollectors.md",
      erc20: "A B20 memo ties the payment to your order without assigning a deposit address per customer.",
      steps: [
        { stage: "Pay", action: "Pay order",
          text: "Alice pays 25 EXM and includes the order reference in the same transaction.",
          summary: [["Payment type", "B20 transfer"], ["Payer", "Alice"], ["Merchant", "Merchant"], ["Amount", M("25 EXM")], ["Memo", M('"order-8842"')]],
          run: () => ({ entries: [ok("Transfer", "Alice → Merchant · 25 EXM"), ok("Memo", '"order-8842"')], caption: "transferWithMemo emits the standard transfer and its bytes32 reference together." }) },
        { stage: "Match", action: "Reconcile",
          text: "Your backend reads the receipt and matches the payment to the order.",
          summary: [["Operation", "Reconcile"], ["Source", M("parseEventLogs")], ["Matched", M("order-8842")], ["Amount", M("25 EXM")]],
          run: () => ({ entries: [nfo("parseEventLogs", "Transfer + Memo"), ok("matched", 'order-8842 · 25 EXM · Alice')], caption: "The payment can still be rejected by the token's holder policy or transfer pause." }) },
      ],
    },
    x402: {
      label: "Agent pays", title: "Let an agent pay per API call", readout: false,
      href: "https://github.com/base/commerce-payments",
      erc20: "Agents pay for data and services autonomously, one request at a time.",
      steps: [
        { stage: "Request", action: "Call API",
          text: "Your agent calls a paid API. It returns 402 Payment Required.",
          summary: [["Operation", "Agent request"], ["Endpoint", M("GET /v1/market-report")], ["Response", M("402 Payment Required")], ["Amount", M("0.02 USDC")]],
          run: () => ({ entries: [nfo("GET", "/v1/market-report"), err("402", "Payment Required · 0.02 USDC")] }) },
        { stage: "Pay", action: "Pay & retry",
          text: "The x402 client pays and retries automatically.",
          summary: [["Payment type", "x402"], ["Payer", "Agent"], ["Amount", M("0.02 USDC")], ["Response", M("200 OK")], ["Network", NETWORK]],
          run: () => ({ entries: [ok("x402", "paid 0.02 USDC on Base"), ok("200", "report delivered")], caption: "A wrapped fetch turns a 402 into a paid, completed request." }) },
        { stage: "Cap", action: "Enforce cap",
          text: "You cap spend so an agent never overpays.",
          summary: [["Operation", "Spend cap"], ["Requested", M("0.50 USDC")], ["maxValue", M("0.10 USDC")], ["Result", "Blocked"]],
          run: () => ({ entries: [err("blocked", "0.50 > maxValue 0.10")], caption: "Set a per-request cap; anything above it is refused." }) },
      ],
    },
    authorize: {
      label: "Authorize", title: "Reserve funds in protocol escrow", readout: false,
      href: "https://github.com/base/commerce-payments/blob/main/docs/operations/Authorize.md",
      metrics: (s) => [["Authorization", s.authorization || "Not submitted"], ["Capturable", M(`${s.capturable || 0}.00 USDC`)]],
      erc20: "The payer approves immutable terms; the operator moves funds into escrow before fulfillment.",
      steps: [
        { stage: "Terms", action: "Set terms", text: "Bind the operator, payer, receiver, maximum, expiries, fees, and a unique salt.",
          summary: [["Maximum", M("25.00 USDC")], ["Receiver", "Merchant"], ["Capture window", "7 days"], ["Payment hash", M("0xa7…91")]],
          run: (s) => { s.authorization = "Terms ready"; return { entries: [nfo("PaymentInfo", "25.00 USDC · expires in 7d")] }; } },
        { stage: "Approve", action: "Sign collector", text: "Alice signs the ERC-3009 collector authorization for this payment.",
          summary: [["Collector", "ERC-3009"], ["Signer", "Alice"], ["Maximum", M("25.00 USDC")], ["Settlement", "Not yet"]],
          run: (s) => { s.authorization = "Signed · not collected"; return { entries: [ok("collector signature", "stored"), nfo("capturableAmount", "0.00")], caption: "A signature alone does not reserve funds." }; } },
        { stage: "Escrow", action: "Authorize $25", text: "The operator submits authorize and the collector moves 25 USDC into its token store.",
          summary: [["Caller", "Operator"], ["Amount", M("25.00 USDC")], ["State", "Capturable"], ["Payer gas", M("0")]],
          run: (s) => { s.authorization = "Authorized"; s.capturable = 25; return { entries: [ok("PaymentAuthorized", "25.00 USDC"), ok("capturableAmount", "25.00")], caption: "The confirmed onchain authorization is the funds guarantee." }; } },
      ],
    },
    capture: {
      label: "Capture", title: "Capture an escrowed authorization", readout: true,
      href: "https://github.com/base/commerce-payments/blob/main/docs/operations/Capture.md",
      metrics: (s) => [["Capturable", M(`${s.capturable ?? 25}.00 USDC`)], ["Refundable", M(`${s.refundable || 0}.00 USDC`)]],
      erc20: "Capture settles funds already held in the operator token store; it does not contact the payer again.",
      steps: [
        { stage: "Check", action: "Check state", text: "Confirm the payment has 25 USDC capturable and has not reached authorization expiry.",
          summary: [["Payment hash", M("0xa7…91")], ["Capturable", M("25.00 USDC")], ["Expiry", "In 3 days"]],
          run: (s) => { s.capturable = 25; s.refundable = 0; return { entries: [ok("paymentState", "capturable 25.00"), ok("deadline", "open")] }; } },
        { stage: "Capture", action: "Capture $25", text: "The operator captures the gross amount and supplies an absolute fee within the payer-approved bounds.",
          summary: [["Gross", M("25.00 USDC")], ["Fee", M("0.00 USDC")], ["Receiver", "Merchant"], ["State", "Refundable"]],
          run: (s) => { s.capturable = 0; s.refundable = 25; s.balances.Merchant = 25; return { entries: [ok("PaymentCaptured", "25.00 USDC"), nfo("refundableAmount", "25.00")], caption: "Capture converts capturable value into refundable settled value." }; } },
      ],
    },
    partial: {
      label: "Variable", title: "Capture below the authorized amount", readout: true,
      href: "https://github.com/base/commerce-payments/blob/main/docs/operations/Capture.md",
      metrics: (s) => [["Capturable", M(`${s.capturable ?? 100}.00 USDC`)], ["Refundable", M(`${s.refundable || 0}.00 USDC`)]],
      erc20: "One authorization can settle through multiple captures; the escrow tracks the remainder onchain.",
      steps: [
        { stage: "Authorize", action: "Authorize max", text: "Alice authorizes 100 USDC and the operator moves it into escrow.",
          summary: [["Authorized", M("100.00 USDC")], ["Capturable", M("100.00 USDC")], ["Receiver", "Merchant"]],
          run: (s) => { s.capturable = 100; s.refundable = 0; return { entries: [ok("PaymentAuthorized", "100.00 USDC")] }; } },
        { stage: "Finalize", action: "Set total", text: "The merchant computes a final fulfilled total of 64 USDC.",
          summary: [["Authorized", M("100.00 USDC")], ["Final total", M("64.00 USDC")], ["Remainder", M("36.00 USDC")]],
          run: () => ({ entries: [nfo("order total", "64.00 USDC")], caption: "No new payer signature is required." }) },
        { stage: "Capture", action: "Capture $64", text: "Capture 64 USDC and leave 36 USDC available to capture or void.",
          summary: [["Captured", M("64.00 USDC")], ["Capturable", M("36.00 USDC")], ["Refundable", M("64.00 USDC")]],
          run: (s) => { s.capturable = 36; s.refundable = 64; s.balances.Merchant = 64; return { entries: [ok("PaymentCaptured", "64.00 USDC"), nfo("capturableAmount", "36.00")] }; } },
      ],
    },
    void: {
      label: "Void", title: "Return an unused escrow balance", readout: false,
      href: "https://github.com/base/commerce-payments/blob/main/docs/operations/Void.md",
      metrics: (s) => [["Payment state", s.authorization || "Authorized"], ["Capturable", M(`${s.capturable ?? 25}.00 USDC`)]],
      erc20: "The operator can void now; the payer can reclaim the same remainder after authorization expiry.",
      steps: [
        { stage: "Decide", action: "Cancel order", text: "Stop capture workers and confirm the remaining authorization should return to Alice.",
          summary: [["Order", M("order-8842")], ["Capturable", M("25.00 USDC")], ["Captured", M("0.00 USDC")]],
          run: (s) => { s.authorization = "Canceling"; s.capturable = 25; return { entries: [nfo("order", "capture disabled")] }; } },
        { stage: "Void", action: "Return $25", text: "The operator calls void and the token store returns the full capturable amount.",
          summary: [["Caller", "Operator"], ["Recipient", "Alice"], ["Returned", M("25.00 USDC")], ["Capturable", M("0.00 USDC")]],
          run: (s) => { s.authorization = "Voided"; s.capturable = 0; return { entries: [ok("PaymentVoided", "25.00 USDC"), nfo("later capture", "reverts")], caption: "If the operator is inactive, Alice can reclaim after expiry instead." }; } },
      ],
    },
    schedule: {
      label: "Schedule", title: "Charge one protocol payment per billing period", readout: true,
      href: "https://github.com/base/commerce-payments/blob/main/docs/TokenCollectors.md#spendpermissionpaymentcollector",
      metrics: (s) => [["Billing period", s.period || "Not charged"], ["Refundable", M(`${s.refundable || 0}.00 USDC`)]],
      erc20: "A spend permission can fund repeated collection, but every protocol charge needs fresh PaymentInfo and salt.",
      steps: [
        { stage: "Prepare", action: "Create period", text: "Create August PaymentInfo and reserve the durable billing key before submission.",
          summary: [["Billing key", M("sub-42:2026-08")], ["Amount", M("8.00 USDC")], ["Collector", "Spend permission"]],
          run: (s) => { s.period = "2026-08 · reserved"; return { entries: [ok("billing key", "reserved"), nfo("salt", "fresh")] }; } },
        { stage: "Charge", action: "Charge $8", text: "The operator calls charge through SpendPermissionPaymentCollector.",
          summary: [["Operation", "Charge"], ["Amount", M("8.00 USDC")], ["Payer gas", M("0")], ["State", "Refundable"]],
          run: (s) => { s.period = "2026-08 · charged"; s.refundable = 8; s.balances.Merchant = 8; return { entries: [ok("PaymentCharged", "8.00 USDC"), nfo("refundableAmount", "8.00")], caption: "Your scheduler creates the next payment; the protocol does not schedule itself." }; } },
      ],
    },
    x402Upto: {
      label: "Usage", title: "Settle actual API usage below a maximum", readout: false,
      href: "https://github.com/base/commerce-payments",
      metrics: (s) => [["Authorized maximum", M("0.10 USDC")], ["Settled actual", M(`${s.usageCharge || "0.00"} USDC`)]],
      erc20: "x402 upto separates the maximum a buyer approves from the amount a successful handler settles.",
      steps: [
        { stage: "Authorize", action: "Authorize max", text: "The 402 response advertises a maximum price of 0.10 USDC.",
          summary: [["Scheme", M("upto")], ["Maximum", M("0.10 USDC")], ["Endpoint", M("GET /metered")]],
          run: () => ({ entries: [ok("authorization", "up to 0.10 USDC")] }) },
        { stage: "Measure", action: "Run workload", text: "The protected handler measures 812 generated tokens.",
          summary: [["Usage", M("812 tokens")], ["Calculated charge", M("0.04 USDC")]],
          run: (s) => { s.usageCharge = "0.04"; return { entries: [nfo("usage", "812 tokens"), nfo("settlement override", "0.04 USDC")] }; } },
        { stage: "Settle", action: "Settle $0.04", text: "The facilitator settles the actual charge, not the maximum.",
          summary: [["Maximum", M("0.10 USDC")], ["Actual", M("0.04 USDC")], ["Response", M("200 OK")]],
          run: () => ({ entries: [ok("settlement", "0.04 USDC"), ok("200", "response delivered")] }) },
      ],
    },
    x402Batch: {
      label: "Batch", title: "Settle many small API calls as a channel", readout: false,
      href: "https://github.com/base/commerce-payments",
      metrics: (s) => [["Latest voucher", M(`${s.voucher || "0.00"} USDC`)], ["Onchain claims", String(s.claims || 0)]],
      erc20: "Cumulative vouchers keep per-call latency offchain while the latest channel state remains claimable.",
      steps: [
        { stage: "Open", action: "Open channel", text: "The buyer funds a channel and starts at a zero cumulative voucher.",
          summary: [["Scheme", M("batch-settlement")], ["Channel", M("0x51…aa")], ["Voucher", M("0.00 USDC")]],
          run: (s) => { s.voucher = "0.00"; s.claims = 0; return { entries: [ok("channel", "opened") ] }; } },
        { stage: "Advance", action: "Process calls", text: "Ten API calls advance one signed cumulative voucher.",
          summary: [["Calls", "10"], ["Price per call", M("0.01 USDC")], ["Latest voucher", M("0.10 USDC")]],
          run: (s) => { s.voucher = "0.10"; return { entries: [nfo("voucher", "0.10 USDC cumulative")], caption: "Store the newest voucher atomically; older vouchers must never replace it." }; } },
        { stage: "Claim", action: "Claim batch", text: "The receiver submits the latest voucher once.",
          summary: [["Settled", M("0.10 USDC")], ["Requests covered", "10"], ["Transactions", "1"]],
          run: (s) => { s.claims = 1; return { entries: [ok("claim", "0.10 USDC · 10 calls")] }; } },
      ],
    },
    x402Buyer: {
      label: "Agent buys", title: "Apply policy before an agent pays", readout: false,
      href: "https://github.com/base/commerce-payments",
      erc20: "The x402 wrapper retries automatically, but your local wallet policy remains the final signing gate.",
      steps: [
        { stage: "Discover", action: "Read 402", text: "The agent receives payment requirements from the service.",
          summary: [["Network", M("eip155:84532")], ["Asset", "Base Sepolia USDC"], ["Amount", M("0.02 USDC")]],
          run: () => ({ entries: [err("402", "Payment Required"), nfo("requirements", "exact · 0.02 USDC")] }) },
        { stage: "Policy", action: "Check policy", text: "Reject wrong networks, wrong tokens, and spend above either cap.",
          summary: [["Per request", M("≤ 0.10 USDC")], ["Per session", M("≤ 1.00 USDC")], ["Decision", "Allow"]],
          run: () => ({ entries: [ok("network", "allowed"), ok("asset", "allowed"), ok("spend", "within cap")] }) },
        { stage: "Retry", action: "Pay & retry", text: "The wallet signs, the wrapper retries, and the agent validates the response.",
          summary: [["Paid", M("0.02 USDC")], ["Response", M("200 OK")], ["Validation", "Schema checked"]],
          run: () => ({ entries: [ok("payment", "0.02 USDC"), ok("response", "validated")], caption: "Paid content is still untrusted input." }) },
      ],
    },
    watch: {
      label: "Watch", title: "Watch and backfill protocol events", readout: false,
      href: "https://github.com/base/commerce-payments/blob/main/src/AuthCaptureEscrow.sol",
      metrics: (s) => [["Confirmed cursor", M(s.cursor || "#21,499,988")], ["Indexed events", String(s.indexed || 0)]],
      erc20: "WebSocket events wake the worker; an overlapping AuthCaptureEscrow log scan restores canonical state.",
      steps: [
        { stage: "Subscribe", action: "Subscribe", text: "Listen for lifecycle events from the v1.1 AuthCaptureEscrow address.",
          summary: [["Contract", "AuthCaptureEscrow"], ["Events", "6 lifecycle events"], ["Status", "Connected"]],
          run: () => ({ entries: [ok("subscription", "PaymentAuthorized → PaymentRefunded")] }) },
        { stage: "Confirm", action: "Wait 12 blocks", text: "Hold candidates until they pass your confirmation policy.",
          summary: [["Head", M("#21,500,012")], ["Confirmed through", M("#21,500,000")], ["Depth", "12 blocks"]],
          run: (s) => { s.cursor = "#21,500,000"; return { entries: [nfo("confirmations", "12 blocks")] }; } },
        { stage: "Backfill", action: "Replace window", text: "Rescan an overlap and replace stored rows in one database transaction.",
          summary: [["From", M("#21,499,988")], ["To", M("#21,500,000")], ["New events", "3"]],
          run: (s) => { s.indexed = 3; return { entries: [ok("eth_getLogs", "3 canonical events"), ok("cursor", "advanced")], caption: "Key every row by chain, contract, transaction, and log index." }; } },
      ],
    },
    reconcile: {
      label: "Reconcile", title: "Turn protocol events into settlement rows", readout: false,
      href: "https://github.com/base/commerce-payments/blob/main/src/AuthCaptureEscrow.sol",
      metrics: (s) => [["Rows exported", String(s.rows || 0)], ["Unmatched", String(s.unmatched || 0)]],
      erc20: "paymentInfoHash joins charges, captures, fees, voids, reclaims, and refunds to one order lifecycle.",
      steps: [
        { stage: "Query", action: "Query range", text: "Fetch finalized AuthCaptureEscrow events for the accounting window.",
          summary: [["From block", M("#21,400,000")], ["To block", M("#21,499,999")], ["Version", "v1.1.0"]],
          run: (s) => { s.rows = 7; s.unmatched = 0; return { entries: [ok("eth_getLogs", "7 protocol events")] }; } },
        { stage: "Reduce", action: "Reduce state", text: "Apply events in chain order and reconcile capturable and refundable balances.",
          summary: [["Charges", "2"], ["Captures", "3"], ["Refunds", "1"], ["Returns", "1"]],
          run: () => ({ entries: [ok("paymentState", "event ledger matches chain")] }) },
        { stage: "Export", action: "Export report", text: "Write gross, fee, merchant net, and refund rows keyed by paymentInfoHash.",
          summary: [["Rows", "7"], ["Gross and fees", "Separated"], ["Format", "CSV"]],
          run: () => ({ entries: [ok("report", "7 rows exported")], caption: "Refund limits use gross captured value, not merchant net." }) },
      ],
    },
    refund: {
      label: "Refund", title: "Refund captured protocol value", readout: true,
      href: "https://github.com/base/commerce-payments/blob/main/docs/operations/Refund.md",
      metrics: (s) => [["Refundable", M(`${s.refundable || 5}.00 USDC`)]],
      erc20: "The protocol enforces the refund limit; a refund collector supplies replacement liquidity.",
      steps: [
        { stage: "Check", action: "Read state", text: "Confirm the payment has 5 USDC refundable and remains before refund expiry.",
          summary: [["Payment hash", M("0xa7…91")], ["Refundable", M("5.00 USDC")], ["Requested", M("2.00 USDC")]],
          run: (s) => { s.refundable = 5; return { entries: [ok("paymentState", "refundable 5.00")] }; } },
        { stage: "Fund", action: "Approve $2", text: "The operator approves OperatorRefundCollector for 2 USDC of refund liquidity.",
          summary: [["Liquidity source", "Operator"], ["Collector", "OperatorRefundCollector"], ["Amount", M("2.00 USDC")]],
          run: () => ({ entries: [ok("Approval", "2.00 USDC")], caption: "Refund accounting is not liquidity; the funds must be supplied again." }) },
        { stage: "Refund", action: "Refund $2", text: "The operator calls refund and the protocol returns tokens to the original payer.",
          summary: [["Recipient", "Alice"], ["Amount", M("2.00 USDC")], ["Remaining", M("3.00 USDC")]],
          run: (s) => { s.refundable = 3; s.balances.Alice = 2; return { entries: [ok("PaymentRefunded", "2.00 USDC"), nfo("refundableAmount", "3.00")] }; } },
      ],
    },
    payout: {
      label: "Payout", title: "Send one referenced payout batch", readout: false,
      href: "https://github.com/base/commerce-payments",
      metrics: (s) => [["Recipients paid", String(s.recipientsPaid || 0)], ["Total", M(`${s.payoutTotal || 0}.00 USDC`)]],
      erc20: "A bounded payout contract pulls tokens directly from sender to recipients and emits one reference per leg.",
      steps: [
        { stage: "Approve", action: "Approve total", text: "Approve the payout contract for exactly the planned batch total.",
          summary: [["Batch", M("payroll-2026-08")], ["Recipients", "3"], ["Total", M("300.00 USDC")]],
          run: () => ({ entries: [ok("Approval", "300.00 USDC → Payout") ] }) },
        { stage: "Send", action: "Send batch", text: "The contract transfers each amount directly and emits the shared batch reference.",
          summary: [["Alice", M("120.00 USDC")], ["Bob", M("100.00 USDC")], ["Carol", M("80.00 USDC")]],
          run: (s) => { s.recipientsPaid = 3; s.payoutTotal = 300; return { entries: [ok("PayoutSent", "Alice · 120.00"), ok("PayoutSent", "Bob · 100.00"), ok("PayoutSent", "Carol · 80.00")] }; } },
      ],
    },
    split: {
      label: "Split", title: "Split one amount without stranded dust", readout: false,
      href: "https://github.com/base/commerce-payments",
      metrics: (s) => [["Distributed", M(`${s.distributed || 0} units`)], ["Contract balance", M("0 units")]],
      erc20: "Basis-point math rounds down; assigning the remainder makes the split equal the input exactly.",
      steps: [
        { stage: "Define", action: "Define shares", text: "Set seller, platform, and referrer shares that total 10,000 basis points.",
          summary: [["Seller", "9,500 bps"], ["Platform", "400 bps"], ["Referrer", "100 bps"]],
          run: () => ({ entries: [ok("shares", "10,000 bps") ] }) },
        { stage: "Calculate", action: "Calculate legs", text: "Round each leg down and assign the remainder unit to the seller.",
          summary: [["Input", M("10,001 units")], ["Floor sum", M("10,000 units")], ["Remainder", M("1 unit → Seller")]],
          run: () => ({ entries: [nfo("rounding", "1 remainder unit assigned") ] }) },
        { stage: "Distribute", action: "Send split", text: "Pull each leg directly from the payer to its recipient in one transaction.",
          summary: [["Distributed", M("10,001 units")], ["Dust", M("0 units")], ["Reference", M("split-2026-08")]],
          run: (s) => { s.distributed = "10,001"; return { entries: [ok("PayoutSent", "3 referenced legs"), ok("sum", "10,001 units") ] }; } },
      ],
    },
  };

  const order = ["accept", "authorize", "capture", "x402", "verify", "refund", "payout"];
  const invalidFlow = flow && !FLOWS[flow];
  const pinned = flow && FLOWS[flow] ? flow : null;

  const [active, setActive] = useState(pinned || "accept");
  const [sim, setSim] = useState(freshSim);
  const [results, setResults] = useState([]);

  const f = FLOWS[active] || FLOWS.accept;
  const stepIndex = results.length;
  const done = stepIndex >= f.steps.length;
  const cur = done ? f.steps[f.steps.length - 1] : f.steps[stepIndex];

  const select = (k) => { setActive(k); setSim(freshSim()); setResults([]); };
  const reset = () => { setSim(freshSim()); setResults([]); };
  const runStep = () => {
    if (done) return;
    const s = { ...sim, balances: { ...sim.balances } };
    const out = f.steps[stepIndex].run(s) || { entries: [] };
    setSim(s);
    setResults((r) => [...r, out]);
  };
  const back = () => {
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
      logRows.push({ t: ts(sec++), level: e.kind === "err" ? "ERROR" : e.kind === "info" ? "INFO" : "EVENT", name: e.name, detail: e.detail, kind: e.kind });
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

  if (invalidFlow) {
    return <div style={{ margin: "22px 0", padding: 16, border: `1px solid ${C.error}`, borderRadius: 8, color: C.error }}>Unknown payment demo flow: {flow}</div>;
  }

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
            <button key={k} className={k === active ? "wf-pill wf-pill-on" : "wf-pill"} onClick={() => select(k)}>{FLOWS[k].label}</button>
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
        <span className="wf-t-caption" style={{ color: C.sub, border: `1px solid ${C.border}`, borderRadius: 5, padding: "2px 6px", flexShrink: 0 }}>Demo</span>
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

          {/* USDC balances readout */}
          {f.readout && holders.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              <div className="wf-t-caption" style={{ color: C.sub, marginBottom: 8 }}>USDC balances</div>
              <div style={{ display: "grid", gap: 6 }}>
                {holders.map((a) => (
                  <div key={a} className="wf-t-body" style={{ display: "flex", alignItems: "center", gap: 8, color: C.body }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot[a] || C.sub, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{a}</span>
                    {sim.blocked === a && <span className="wf-t-caption" style={{ color: C.error, border: `1px solid ${C.error}`, borderRadius: 4, padding: "0 4px" }}>Blocked</span>}
                    <span style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 600, color: C.ink }}>{fmt(sim.balances[a] || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {f.metrics && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              <div className="wf-t-caption" style={{ color: C.sub, marginBottom: 8 }}>Flow state</div>
              <div style={{ display: "grid", gap: 6 }}>
                {f.metrics(sim).map(([name, value]) => {
                  const isM = value && typeof value === "object" && value.mono;
                  return (
                    <div key={name} className="wf-t-body" style={{ display: "flex", justifyContent: "space-between", gap: 8, color: C.body }}>
                      <span>{name}</span>
                      <span style={{ fontFamily: isM ? mono : sans, fontSize: 12.5, fontWeight: 600, color: C.ink }}>{isM ? value.v : value}</span>
                    </div>
                  );
                })}
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
              <div className="wf-t-body" style={{ color: C.body, margin: "12px 0 16px" }}>{f.title} — every step completed in the mock simulation above.</div>
              <button className="wf-btn2" onClick={reset}>Run again</button>
              <a className="wf-btn" href={f.href || "https://github.com/base/commerce-payments"} style={{ textDecoration: "none", color: C.onBlue, marginTop: 8, display: "flex", boxSizing: "border-box" }}>See technical details →</a>
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
                <button className="wf-btn" onClick={runStep}>
                  {cur.action}
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </button>
                {results.length > 0 && <button className="wf-btn2" onClick={back}>Back</button>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Event log */}
      <div style={{ borderTop: `1px solid ${C.border}`, background: C.white }}>
        <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", borderBottom: `1px solid ${C.border}` }}>
          <span className="wf-t-headline" style={{ fontSize: 13, color: C.ink }}>Activity log</span>
        </div>
        <div style={{ maxHeight: 168, overflowY: "auto", padding: "6px 0" }}>
          {logRows.map((r, i) => (
            <div key={i} className={r.kind === "pending" ? "" : "wf-anim"} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 16px", opacity: r.kind === "pending" ? 0.5 : 1 }}>
              <span style={{ fontFamily: mono, fontSize: 11, color: C.sub, flexShrink: 0 }}>{r.t}</span>
              <span style={{ fontFamily: mono, fontSize: 10.5, fontWeight: 600, color: levelColor[r.level], flexShrink: 0, width: 58 }}>[{r.level}]</span>
              <span style={{ fontFamily: mono, fontSize: 11.5, color: r.kind === "err" ? C.error : C.body, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {r.name}{r.detail ? <span style={{ color: C.sub }}> · {r.detail}</span> : null}
              </span>
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
        <span className="wf-t-footnote" style={{ color: C.sub }}>{f.erc20}</span>
      </div>
    </div>
  );
};
