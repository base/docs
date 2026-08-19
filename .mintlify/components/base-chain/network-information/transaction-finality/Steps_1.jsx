/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@mintlify/astro/components";
function _createMdxContent(props) {
  const _components = {
    a: "a",
    li: "li",
    p: "p",
    strong: "strong",
    ul: "ul",
    ..._provideComponents(),
    ...props.components
  }, {Accordion, Step, Steps} = _components;
  if (!Accordion) _missingMdxReference("Accordion", true);
  if (!Step) _missingMdxReference("Step", true);
  if (!Steps) _missingMdxReference("Steps", true);
  return <Steps><Step title="Flashblock Inclusion: ~200ms" titleSize="h3"><_components.p>{"After roughly 200ms, the transaction is included in a preconfirmation block (Flashblock) by the Base sequencer."}</_components.p><Accordion title="Under 0.001% probability of a reorg."><_components.ul>{"\n"}<_components.li>{"Flashblocks reorg less than 0.001% of the time"}</_components.li>{"\n"}<_components.li>{"You can see the reorg history in our "}<_components.a href="https://base.org/stats">{"public stats page."}</_components.a></_components.li>{"\n"}</_components.ul></Accordion></Step><Step title="L2 Block Inclusion: ~2s" titleSize="h3"><_components.p>{"After roughly 2 seconds, the sequencer has built the transaction into an L2 block and distributed it to validator nodes."}</_components.p><Accordion title="Near 0% probability of a reorg."><_components.ul>{"\n"}<_components.li>{"Only a single Base L2 block has ever reorged, representing .0000003% of transactions. The data can be "}<_components.a href="https://base.blockscout.com/blocks?tab=reorgs">{"seen here"}</_components.a></_components.li>{"\n"}</_components.ul></Accordion></Step><Step title="L1 Batch Inclusion: ~2m" titleSize="h3"><_components.p>{"After roughly 2 minutes, a Base batch containing the transaction has been posted to Ethereum."}</_components.p><Accordion title="Effectively 0% probability of a reorg."><_components.ul>{"\n"}<_components.li>{"There has never been a reorg of L2 blocks that were batched to Ethereum L1."}</_components.li>{"\n"}<_components.li><_components.strong>{"A reorg of Ethereum L1 does not require a reorg of the Base L2 chain."}</_components.strong>{" The sequencer and validator nodes maintain a configurable lag from the tip of Ethereum, so typical L1 reorgs have no effect. In the event of larger Ethereum reorgs, Base can resubmit batch data on L1 without changing the sequenced L2 blocks."}</_components.li>{"\n"}</_components.ul></Accordion></Step><Step title="L1 Batch Finality: ~20m" titleSize="h3"><_components.p>{"The Ethereum L1 batch containing the transaction is older than 2 epochs, or 64 L1 blocks."}</_components.p><Accordion title="Effectively 0% probability of a reorg."><_components.ul>{"\n"}<_components.li>{"L2 blocks that have reached L1 batch finality are protected from reorgs the same way Ethereum finalized blocks are. They are in practice impossible to reverse."}</_components.li>{"\n"}</_components.ul></Accordion></Step></Steps>;
}
export function Steps_1(props = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
