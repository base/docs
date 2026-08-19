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
  return <CardGroup cols={3}><Card title="Solana → Base" icon="arrow-right" href="#solana-to-base"><_components.p>{"Push-based with optional relayer for instant execution on Base"}</_components.p></Card><Card title="Base → Solana" icon="arrow-left" href="#base-to-solana"><_components.p>{"Proof-based burn and unlock with full custody"}</_components.p></Card><Card title="Terminally Onchain" icon="command-line" href="#terminally-onchain-example"><_components.p>{"Production terminal UI for bridging + contract calls"}</_components.p></Card></CardGroup>;
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
