/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@mintlify/astro/components";
function _createMdxContent(props) {
  const _components = {
    p: "p",
    ..._provideComponents(),
    ...props.components
  }, {Accordion} = _components;
  if (!Accordion) _missingMdxReference("Accordion", true);
  return <Accordion title="What happens during the 7 days?"><_components.p>{"When a transaction initiates a withdrawal from Base to Ethereum, the funds are removed from the account balance on Base. Later, a permissionless “proposer” must provide Ethereum with proof that Base contains this withdrawal."}</_components.p><_components.p>{"However, Ethereum cannot natively confirm what happened on Base as they are separate blockchains. Thus, there is a 7 day window in which a permissionless “challenger” can dispute a proposal that it feels is malicious. If no challenge is made in the 7 days, the withdrawal can be proven against the finalized output root and released to the L1 recipient. But if a challenge is made, the proposer and challenger play what is called the Fault Dispute Game. This game requires increasing bonds to be made, with an eventual winner. If the proposer wins, the output root finalizes and can be used to prove withdrawals against (releasing them on L1). If the challenger wins, the output proposal becomes invalid."}</_components.p><_components.p>{"This system requires only a one honest party to remain secure. Base will always run an honest proposer and challenger."}</_components.p><_components.p>{"Note: if the dispute game is won by a challenger, the state of the L2 chain does not reorg. The output proposal is marked invalid and any withdrawals that were proven against it cannot finalize. Those withdrawals would need to be re-proven against a different, valid output root."}</_components.p></Accordion>;
}
export function Accordion_1(props = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
