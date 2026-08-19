/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@mintlify/astro/components";
function _createMdxContent(props) {
  const _components = {
    a: "a",
    code: "code",
    p: "p",
    strong: "strong",
    ..._provideComponents(),
    ...props.components
  }, {Tab, Tabs} = _components;
  if (!Tab) _missingMdxReference("Tab", true);
  if (!Tabs) _missingMdxReference("Tabs", true);
  return <Tabs><Tab title="Mainnet"><_components.p>{"| | |\n| :--- | :--- |\n| "}<_components.strong>{"Network Name"}</_components.strong>{" | Base Mainnet |\n| "}<_components.strong>{"RPC Endpoint"}</_components.strong>{" | "}<_components.a href="https://mainnet.base.org">{"mainnet.base.org"}</_components.a>{" |\n| "}<_components.strong>{"Chain ID"}</_components.strong>{" | 8453 |\n| "}<_components.strong>{"Currency Symbol"}</_components.strong>{" | ETH |\n| "}<_components.strong>{"Block Explorer"}</_components.strong>{" | "}<_components.a href="https://basescan.org">{"basescan.org"}</_components.a>{" |"}</_components.p></Tab><Tab title="Sepolia (Testnet)"><_components.p>{"| | |\n| :--- | :--- |\n| "}<_components.strong>{"Network Name"}</_components.strong>{" | Base Sepolia |\n| "}<_components.strong>{"RPC Endpoint"}</_components.strong>{" | "}<_components.a href="https://sepolia.base.org">{"sepolia.base.org"}</_components.a>{" |\n| "}<_components.strong>{"Chain ID"}</_components.strong>{" | 84532 |\n| "}<_components.strong>{"Currency Symbol"}</_components.strong>{" | ETH |\n| "}<_components.strong>{"Block Explorer"}</_components.strong>{" | "}<_components.a href="https://sepolia.basescan.org">{"sepolia.basescan.org"}</_components.a>{" |"}</_components.p></Tab><Tab title="Vibenet"><_components.p>{"Vibenet is Base's experimental preview network where new chain-level features are available before they roll out to Sepolia or Mainnet. It currently hosts "}<_components.a href="/get-started/launch-b20-token">{"B20 tokens"}</_components.a>{" — an ERC-20 superset with built-in roles, supply caps, pausing, policy gating, and "}<_components.code>{"permit"}</_components.code>{" implemented as a native precompile."}</_components.p><_components.p>{"Use Vibenet to build against cutting-edge Base features. It is not intended for production or user-facing applications. Learn more at "}<_components.a href="https://vibes.base.org">{"vibes.base.org"}</_components.a>{"."}</_components.p><_components.p>{"| | |\n| :--- | :--- |\n| "}<_components.strong>{"Network Name"}</_components.strong>{" | Base Vibenet |\n| "}<_components.strong>{"RPC Endpoint"}</_components.strong>{" | "}<_components.a href="https://rpc.vibes.base.org">{"rpc.vibes.base.org"}</_components.a>{" |\n| "}<_components.strong>{"Chain ID"}</_components.strong>{" | 84538453 |\n| "}<_components.strong>{"Currency Symbol"}</_components.strong>{" | ETH |\n| "}<_components.strong>{"Faucet"}</_components.strong>{" | "}<_components.a href="https://faucet.vibes.base.org">{"faucet.vibes.base.org"}</_components.a>{" |\n| "}<_components.strong>{"Block Explorer"}</_components.strong>{" | "}<_components.a href="https://explorer.vibes.base.org">{"explorer.vibes.base.org"}</_components.a>{" |"}</_components.p></Tab></Tabs>;
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
