/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@mintlify/astro/components";
function _createMdxContent(props) {
  const _components = {
    a: "a",
    p: "p",
    ..._provideComponents(),
    ...props.components
  }, {Accordion, AccordionGroup} = _components;
  if (!Accordion) _missingMdxReference("Accordion", true);
  if (!AccordionGroup) _missingMdxReference("AccordionGroup", true);
  return <AccordionGroup><Accordion title="How do I set up a Flashblocks-aware RPC node?"><_components.p>{"Use the Reth binary from the "}<_components.a href="https://github.com/base/reth">{"Base Reth repository"}</_components.a>{". See the "}<_components.a href="/base-chain/node-operators/run-a-base-node#enable-flashblocks">{"Enable Flashblocks guide"}</_components.a>{" for complete setup instructions."}</_components.p></Accordion></AccordionGroup>;
}
export function AccordionGroup_4(props = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
