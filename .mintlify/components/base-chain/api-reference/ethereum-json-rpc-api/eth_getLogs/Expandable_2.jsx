/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@mintlify/astro/components";
function _createMdxContent(props) {
  const _components = {
    code: "code",
    ..._provideComponents(),
    ...props.components
  }, {Expandable, ResponseField} = _components;
  if (!Expandable) _missingMdxReference("Expandable", true);
  if (!ResponseField) _missingMdxReference("ResponseField", true);
  return <Expandable title="Log object fields"><ResponseField name="address" type="string">{"20-byte address of the contract that emitted the log."}</ResponseField><ResponseField name="topics" type="array">{"Array of 0–4 indexed 32-byte topics. Topic 0 is typically the event signature hash."}</ResponseField><ResponseField name="data" type="string">{"ABI-encoded non-indexed event parameters."}</ResponseField><ResponseField name="blockNumber" type="string">{"Block number in which this log was emitted (hex)."}</ResponseField><ResponseField name="blockTimestamp" type="string">{"Unix timestamp of the block containing this log as a hex string. Base L2 extension to the standard Ethereum log schema."}</ResponseField><ResponseField name="transactionHash" type="string">{"32-byte hash of the transaction that emitted this log."}</ResponseField><ResponseField name="transactionIndex" type="string">{"Index of the transaction in the block (hex)."}</ResponseField><ResponseField name="blockHash" type="string">{"32-byte hash of the block."}</ResponseField><ResponseField name="logIndex" type="string">{"Log's index position within the block (hex)."}</ResponseField><ResponseField name="removed" type="boolean"><_components.code>{"true"}</_components.code>{" if the log was removed due to a chain reorganization."}</ResponseField></Expandable>;
}
export function Expandable_2(props = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
