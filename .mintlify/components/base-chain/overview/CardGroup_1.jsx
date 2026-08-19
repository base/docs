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
  return <CardGroup cols={2}><Card title="Core Concepts" icon="route" href="/base-chain/network-information/transaction-ordering"><_components.p>{"Understand transaction ordering, finality, throughput, fees, bridging, and Base-specific execution behavior."}</_components.p></Card><Card title="Network Reference" icon="list" href="/base-chain/quickstart/connecting-to-base"><_components.p>{"Look up chain IDs, RPC endpoints, connection guidance, providers, contract addresses, faucets, configuration changes, and transaction troubleshooting."}</_components.p></Card><Card title="Node Operators" icon="server" href="/base-chain/node-operators/run-a-base-node"><_components.p>{"Operate Base infrastructure, including Flashblocks-aware RPC nodes."}</_components.p></Card><Card title="API Reference" icon="code" href="/base-chain/api-reference/rpc-overview"><_components.p>{"Use Base JSON-RPC, Flashblocks API methods, subscriptions, and debug APIs."}</_components.p></Card><Card title="Protocol Specifications" icon="book-open" href="/base-chain/specs/overview"><_components.p>{"Read the Base Chain protocol specification, upgrades, and protocol reference."}</_components.p></Card></CardGroup>;
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
