/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@mintlify/astro/components";
function _createMdxContent(props) {
  const _components = {
    code: "code",
    ..._provideComponents(),
    ...props.components
  }, {Card, ParamField} = _components;
  if (!Card) _missingMdxReference("Card", true);
  if (!ParamField) _missingMdxReference("ParamField", true);
  return <Card><ParamField path="address" type="string">{"Contract address that emitted the event."}</ParamField><ParamField path="topics" type="string[]">{"Array of indexed event parameters. Topic 0 is typically the event signature hash."}</ParamField><ParamField path="data" type="string">{"ABI-encoded non-indexed event parameters."}</ParamField><ParamField path="blockHash" type="string">{"Hash of the block containing this log."}</ParamField><ParamField path="blockNumber" type="string">{"Block number in hex."}</ParamField><ParamField path="blockTimestamp" type="string">{"Unix timestamp of the block as a hex string. Base L2 extension to the standard Ethereum log schema."}</ParamField><ParamField path="transactionHash" type="string">{"Hash of the transaction that emitted this log."}</ParamField><ParamField path="transactionIndex" type="string">{"Index of the transaction in the block (hex)."}</ParamField><ParamField path="logIndex" type="string">{"Log's index position within the block (hex)."}</ParamField><ParamField path="removed" type="boolean"><_components.code>{"true"}</_components.code>{" if the log was removed due to a chain reorg."}</ParamField></Card>;
}
export function Card_6(props = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
