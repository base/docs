/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@mintlify/astro/components";
function _createMdxContent(props) {
  const _components = {
    code: "code",
    p: "p",
    ..._provideComponents(),
    ...props.components
  }, {Expandable, ParamField} = _components;
  if (!Expandable) _missingMdxReference("Expandable", true);
  if (!ParamField) _missingMdxReference("ParamField", true);
  return <Expandable title="Filter fields"><ParamField body="fromBlock" type="string"><_components.p>{"Start of the block range. Block number in hex or a block tag. Use "}<_components.code>{"\"pending\""}</_components.code>{" to include pre-confirmed logs. Defaults to "}<_components.code>{"\"latest\""}</_components.code>{"."}</_components.p></ParamField><ParamField body="toBlock" type="string"><_components.p>{"End of the block range. Block number in hex or a block tag. Defaults to "}<_components.code>{"\"latest\""}</_components.code>{"."}</_components.p></ParamField><ParamField body="address" type="string | array"><_components.p>{"A contract address or array of addresses to filter by. Optional."}</_components.p></ParamField><ParamField body="topics" type="array"><_components.p>{"Array of 32-byte topic filters. Each position can be "}<_components.code>{"null"}</_components.code>{" (match any), a single topic hex string, or an array of hex strings (match any in the array). Position 0 is typically the "}<_components.code>{"keccak256"}</_components.code>{" hash of the event signature. Optional."}</_components.p></ParamField><ParamField body="blockHash" type="string"><_components.p>{"Restricts logs to the block with this hash. If provided, "}<_components.code>{"fromBlock"}</_components.code>{" and "}<_components.code>{"toBlock"}</_components.code>{" are ignored. Optional."}</_components.p></ParamField></Expandable>;
}
export function Expandable_1(props = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
