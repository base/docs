/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@mintlify/astro/components";
function _createMdxContent(props) {
  const _components = {
    code: "code",
    p: "p",
    ..._provideComponents(),
    ...props.components
  }, {Expandable, ResponseField} = _components;
  if (!Expandable) _missingMdxReference("Expandable", true);
  if (!ResponseField) _missingMdxReference("ResponseField", true);
  return <Expandable title="Block result fields"><ResponseField name="number" type="string">{"Simulated block number (hex)."}</ResponseField><ResponseField name="hash" type="string">{"Simulated block hash."}</ResponseField><ResponseField name="parentHash" type="string">{"Parent block hash."}</ResponseField><ResponseField name="timestamp" type="string">{"Block timestamp (hex)."}</ResponseField><ResponseField name="gasLimit" type="string">{"Gas limit (hex)."}</ResponseField><ResponseField name="gasUsed" type="string">{"Total gas used by the simulated calls (hex)."}</ResponseField><ResponseField name="baseFeePerGas" type="string">{"Base fee per gas (hex)."}</ResponseField><ResponseField name="stateRoot" type="string">{"Always "}<_components.code>{"\"0x000...000\""}</_components.code>{" — simulation does not commit state to the trie."}</ResponseField><ResponseField name="calls" type="array"><_components.p>{"Array of individual call results."}</_components.p><Expandable title="Call result fields"><ResponseField name="status" type="string"><_components.code>{"\"0x1\""}</_components.code>{" for success, "}<_components.code>{"\"0x0\""}</_components.code>{" for failure."}</ResponseField><ResponseField name="gasUsed" type="string">{"Gas used as a hexadecimal integer."}</ResponseField><ResponseField name="returnData" type="string">{"Hex-encoded return data."}</ResponseField><ResponseField name="logs" type="array">{"Logs emitted (including ETH transfer logs if "}<_components.code>{"traceTransfers"}</_components.code>{" is "}<_components.code>{"true"}</_components.code>{")."}</ResponseField><ResponseField name="error" type="string">{"Revert reason if the call failed. Optional."}</ResponseField></Expandable></ResponseField></Expandable>;
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
