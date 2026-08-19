/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@mintlify/astro/components";
function _createMdxContent(props) {
  const _components = {
    a: "a",
    code: "code",
    p: "p",
    ..._provideComponents(),
    ...props.components
  }, {Card, CardGroup} = _components;
  if (!Card) _missingMdxReference("Card", true);
  if (!CardGroup) _missingMdxReference("CardGroup", true);
  return <CardGroup cols={2}><Card title="Reference contracts" href="https://github.com/base/eip-8130" icon="github"><_components.p><_components.code>{"AccountConfiguration"}</_components.code>{", account implementations, and authenticators, with Foundry tests."}</_components.p></Card><Card title="Specifications" href="https://eip.tools/eip/8130" icon="file-lines"><_components.p>{"The EIP-8130 draft, and companion draft "}<_components.a href="https://eip.tools/eip/8168">{"ERC-8168"}</_components.a>{" for payer services."}</_components.p></Card></CardGroup>;
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
