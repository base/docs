/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@mintlify/astro/components";
function _createMdxContent(props) {
  const _components = {
    a: "a",
    code: "code",
    li: "li",
    p: "p",
    strong: "strong",
    ul: "ul",
    ..._provideComponents(),
    ...props.components
  }, {Accordion, AccordionGroup} = _components;
  if (!Accordion) _missingMdxReference("Accordion", true);
  if (!AccordionGroup) _missingMdxReference("AccordionGroup", true);
  return <AccordionGroup><Accordion title="Why am I getting rate limited using mainnet.base.org?"><_components.p>{"The public endpoint has explicit rate limiting. For production use:"}</_components.p><_components.ul>{"\n"}<_components.li>{"Use a third-party node provider with Flashblocks support (Alchemy, Infura, QuickNode, dRPC)"}</_components.li>{"\n"}<_components.li>{"Run your own "}<_components.a href="/base-chain/node-operators/run-a-base-node#enable-flashblocks">{"Flashblocks-aware RPC node"}</_components.a></_components.li>{"\n"}</_components.ul></Accordion><Accordion title="Why does eth_call 'pending' report a block number several blocks behind tip?"><_components.p>{"This is expected behavior. Flashblocks-aware nodes store up to 5 historical blocks worth of Flashblocks state to prevent race conditions. When "}<_components.code>{"eth_call \"pending\""}</_components.code>{" is called, it operates on top of that historical base, so the block number visible in the call context (e.g. "}<_components.code>{"block.number"}</_components.code>{") may appear to be N-5."}</_components.p><_components.p>{"When "}<_components.code>{"eth_call \"pending\""}</_components.code>{" executes, the entire block context — "}<_components.code>{"block.number"}</_components.code>{", "}<_components.code>{"block.timestamp"}</_components.code>{", "}<_components.code>{"block.basefee"}</_components.code>{", and all other block properties — corresponds to that historical base block (potentially N-5), not the current chain tip. "}<_components.strong>{"The call result is correct"}</_components.strong>{" in that it reflects all received Flashblocks state applied on top, but contracts that rely on block context properties should be aware that those values may be several blocks behind."}</_components.p><_components.p>{"If you operate a node in a geographic region where your P2P latency is not significantly higher than the WebSocket stream latency, you can reduce this difference by lowering the "}<_components.code>{"MAX_PENDING_BLOCKS_DEPTH"}</_components.code>{" configuration value. This controls the maximum number of historical blocks worth of Flashblocks your node stores, so a lower value will make the block context closer to tip at the cost of reduced tolerance for P2P latency spikes."}</_components.p></Accordion><Accordion title="What RPC methods support Flashblocks?"><_components.p>{"The following methods are Flashblocks-enabled:"}</_components.p><_components.p>{"| Method | Usage |\n|--------|-------|\n| "}<_components.code>{"eth_getBlockByNumber"}</_components.code>{" | Use "}<_components.code>{"pending"}</_components.code>{" tag |\n| "}<_components.code>{"eth_getBalance"}</_components.code>{" | Use "}<_components.code>{"pending"}</_components.code>{" tag |\n| "}<_components.code>{"eth_getTransactionReceipt"}</_components.code>{" | Returns preconfirmed receipts |\n| "}<_components.code>{"eth_getTransactionByHash"}</_components.code>{" | Use "}<_components.code>{"pending"}</_components.code>{" tag |\n| "}<_components.code>{"eth_getTransactionCount"}</_components.code>{" | Use "}<_components.code>{"pending"}</_components.code>{" tag |\n| "}<_components.code>{"eth_call"}</_components.code>{" | Use "}<_components.code>{"pending"}</_components.code>{" tag |\n| "}<_components.code>{"eth_simulateV1"}</_components.code>{" | Use "}<_components.code>{"pending"}</_components.code>{" tag |\n| "}<_components.code>{"eth_estimateGas"}</_components.code>{" | Use "}<_components.code>{"pending"}</_components.code>{" tag |\n| "}<_components.code>{"eth_getLogs"}</_components.code>{" | Use "}<_components.code>{"pending"}</_components.code>{" for "}<_components.code>{"toBlock"}</_components.code>{" |\n| "}<_components.code>{"eth_subscribe"}</_components.code>{" | Stream Flashblock data in real-time |\n| "}<_components.code>{"base_transactionStatus"}</_components.code>{" | Check if transaction is in mempool (Beta) |"}</_components.p><_components.p>{"See the "}<_components.a href="/base-chain/api-reference/flashblocks-api/flashblocks-api-overview">{"Flashblocks API Reference"}</_components.a>{" for full method details and examples."}</_components.p></Accordion></AccordionGroup>;
}
export function AccordionGroup_3(props = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
