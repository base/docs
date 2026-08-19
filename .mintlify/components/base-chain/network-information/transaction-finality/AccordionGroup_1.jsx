/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@mintlify/astro/components";
function _createMdxContent(props) {
  const _components = {
    p: "p",
    ..._provideComponents(),
    ...props.components
  }, {Accordion, AccordionGroup} = _components;
  if (!Accordion) _missingMdxReference("Accordion", true);
  if (!AccordionGroup) _missingMdxReference("AccordionGroup", true);
  return <AccordionGroup><Accordion title="If there is a reorg on Ethereum, will it cause a reorg on Base?"><_components.p>{"In almost all circumstances, no. Base can simply re-submit batch data to Ethereum transparently while the L2 chain continues to progress."}</_components.p></Accordion><Accordion title="How long do deposit transactions take to finalize?"><_components.p>{"Transactions moving funds from Ethereum L1 to Base must be initiated on Ethereum and typically get included within 3 minutes by the Base sequencer."}</_components.p></Accordion><Accordion title="If a challenger wins a dispute game, will the L2 chain reorg?"><_components.p>{"No. The output proposal that was challenged is marked invalid, and any actions that used it's output root become invalid. Specifically, withdrawals from Base to L1 that proved against this output root must now prove against a different and valid one."}</_components.p></Accordion></AccordionGroup>;
}
export function AccordionGroup_1(props = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
