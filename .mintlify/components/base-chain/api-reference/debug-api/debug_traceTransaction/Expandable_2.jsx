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
  return <Expandable title="Default struct log trace"><ResponseField name="gas" type="number">{"Total gas provided for the transaction."}</ResponseField><ResponseField name="failed" type="boolean">{"Whether the transaction failed (reverted)."}</ResponseField><ResponseField name="returnValue" type="string">{"Hex-encoded return value from the execution."}</ResponseField><ResponseField name="structLogs" type="array"><_components.p>{"Array of struct log entries, one per EVM opcode executed."}</_components.p><Expandable title="Struct log fields"><ResponseField name="pc" type="number">{"Program counter position."}</ResponseField><ResponseField name="op" type="string">{"EVM opcode name (e.g., "}<_components.code>{"\"PUSH1\""}</_components.code>{", "}<_components.code>{"\"SLOAD\""}</_components.code>{")."}</ResponseField><ResponseField name="gas" type="number">{"Remaining gas at this step."}</ResponseField><ResponseField name="gasCost" type="number">{"Gas cost of this opcode."}</ResponseField><ResponseField name="depth" type="number">{"Call depth (1 = top-level call)."}</ResponseField><ResponseField name="stack" type="array">{"EVM stack values at this step."}</ResponseField><ResponseField name="memory" type="array">{"EVM memory contents as 32-byte chunks."}</ResponseField><ResponseField name="storage" type="object">{"Contract storage changes at this step (slot → value)."}</ResponseField></Expandable></ResponseField></Expandable>;
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
