export const TruncatedPrompt = ({ description, children }) => {
  const extractText = (node) => {
    if (node == null || typeof node === "boolean") return "";
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(extractText).join("");
    if (typeof node === "object" && node.props) {
      const inner = extractText(node.props.children);
      if (node.type === "code") return "`" + inner + "`";
      return inner;
    }
    return "";
  };

  const text = extractText(children).replace(/\s+/g, " ").trim();

  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  const mono = "ui-monospace,'SF Mono','Cascadia Code',Menlo,Monaco,Consolas,monospace";
  const sans = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";

  return (
    <div style={{
      margin: "16px 0",
      borderRadius: 10,
      border: "1px solid rgba(125,125,125,0.25)",
      background: "rgba(125,125,125,0.06)",
      overflow: "hidden",
    }}>
      {description && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 12px",
          borderBottom: "1px solid rgba(125,125,125,0.18)",
          fontFamily: sans, fontSize: 12, fontWeight: 600,
          color: "#6b7280",
          letterSpacing: "0.02em",
        }}>
          <span>{description}</span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px" }}>
        <button
          onClick={() => setExpanded(e => !e)}
          aria-label={expanded ? "Collapse prompt" : "Expand prompt"}
          aria-expanded={expanded}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 18, height: 18, marginTop: 2, flexShrink: 0,
            background: "transparent", border: "none", cursor: "pointer",
            padding: 0, color: "#6b7280",
          }}
        >
          <svg
            viewBox="0 0 24 24" width="12" height="12" fill="currentColor"
            style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}
          >
            <path d="M8 5l8 7-8 7V5z" />
          </svg>
        </button>

        <code
          onClick={() => setExpanded(e => !e)}
          style={{
            flex: 1, minWidth: 0,
            fontFamily: mono, fontSize: 13, lineHeight: 1.55,
            cursor: "pointer",
            whiteSpace: expanded ? "pre-wrap" : "nowrap",
            overflow: expanded ? "visible" : "hidden",
            textOverflow: expanded ? "clip" : "ellipsis",
            wordBreak: expanded ? "break-word" : "normal",
          }}
        >
          {text}
        </code>

        <button
          onClick={handleCopy}
          aria-label={copied ? "Copied" : "Copy prompt"}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 24, height: 24, flexShrink: 0,
            background: "transparent",
            border: "1px solid rgba(125,125,125,0.25)",
            borderRadius: 6, cursor: "pointer",
            color: copied ? "#22c55e" : "#6b7280",
            transition: "color 0.15s ease, border-color 0.15s ease",
          }}
        >
          {copied ? (
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="11" height="11" rx="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};
