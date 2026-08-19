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
  return <CardGroup cols={2}><Card title="Base Bridge Repository" icon="github" href="https://github.com/base/bridge"><_components.p>{"Source code, contracts, programs, and scripts"}</_components.p></Card><Card title="Solana Explorer" icon="magnifying-glass" href="https://explorer.solana.com/"><_components.p>{"Monitor Solana mainnet-beta transactions"}</_components.p></Card><Card title="Base Explorer" icon="magnifying-glass" href="https://basescan.org/"><_components.p>{"Monitor Base Mainnet transactions"}</_components.p></Card><Card title="Discord Support" icon="discord" href="https://base.org/discord"><_components.p>{"Get help from the Base community"}</_components.p></Card></CardGroup>;
}
export function CardGroup_2(props = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
