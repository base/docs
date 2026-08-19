/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@mintlify/astro/components";
function _createMdxContent(props) {
  const _components = {
    code: "code",
    p: "p",
    strong: "strong",
    ..._provideComponents(),
    ...props.components
  }, {Note, Tab, Tabs, Warning} = _components;
  if (!Note) _missingMdxReference("Note", true);
  if (!Tab) _missingMdxReference("Tab", true);
  if (!Tabs) _missingMdxReference("Tabs", true);
  if (!Warning) _missingMdxReference("Warning", true);
  return <Tabs><Tab title="Ingress"><_components.p>{"| Port | Protocol | Purpose |\n|------|----------|---------|\n| "}<_components.code>{"9222"}</_components.code>{" | TCP/UDP | Reth Discovery v5 (discv5) |\n| "}<_components.code>{"30303"}</_components.code>{" | TCP/UDP | P2P Discovery (discv4) & RLPx |"}</_components.p></Tab><Tab title="Egress"><_components.p>{"| Port | Protocol | Purpose |\n|------|----------|---------|\n| "}<_components.code>{"9200"}</_components.code>{" | UDP | Bootnode connectivity |\n| "}<_components.code>{"9222"}</_components.code>{" | TCP/UDP | Reth Discovery v5 (discv5) |\n| "}<_components.code>{"30301"}</_components.code>{" | TCP/UDP | Bootnode connectivity |\n| "}<_components.code>{"30303"}</_components.code>{" | TCP/UDP | P2P Discovery (discv4) & RLPx |"}</_components.p><Note><_components.p>{"Ports "}<_components.code>{"9200"}</_components.code>{" (UDP) and "}<_components.code>{"30301"}</_components.code>{" (TCP/UDP) are required to reach Base bootnodes. If outbound traffic to these ports is blocked, your node will fail to establish initial peer connections."}</_components.p></Note><Warning><_components.p>{"If you use network ACLs (rather than stateful security groups such as AWS SGs) for egress control, you must also allow outbound traffic on the ephemeral port range "}<_components.strong>{"32768–60999"}</_components.strong>{" (TCP/UDP). Stateful firewalls track return traffic automatically; ACLs do not, so without this rule, response packets from peers are silently dropped."}</_components.p></Warning></Tab></Tabs>;
}
export function Tabs_1(props = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
