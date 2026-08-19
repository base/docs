/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@mintlify/astro/components";
function _createMdxContent(props) {
  const _components = {
    p: "p",
    ..._provideComponents(),
    ...props.components
  }, {Card, CardGroup} = _components;
  if (!Card) _missingMdxReference("Card", true);
  if (!CardGroup) _missingMdxReference("CardGroup", true);
  return <CardGroup cols={2}><Card title="Full Documentation" icon="book" href="/base-chain/network-information/base-solana-bridge"><_components.p>{"Complete guide with code examples and contract addresses"}</_components.p></Card><Card title="Terminally Onchain" icon="terminal" href="https://terminallyonchain.com/"><_components.p>{"Production terminal UI for bridging + contract calls"}</_components.p></Card></CardGroup>;
}
export function CardGroup_1(props = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
