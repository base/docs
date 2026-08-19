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
  return <Expandable title="callTracer result"><ResponseField name="type" type="string">{"Call type: "}<_components.code>{"\"CALL\""}</_components.code>{", "}<_components.code>{"\"STATICCALL\""}</_components.code>{", "}<_components.code>{"\"DELEGATECALL\""}</_components.code>{", or "}<_components.code>{"\"CREATE\""}</_components.code>{"."}</ResponseField><ResponseField name="from" type="string">{"Sender address."}</ResponseField><ResponseField name="to" type="string">{"Recipient address."}</ResponseField><ResponseField name="value" type="string">{"ETH value sent with the call."}</ResponseField><ResponseField name="gas" type="string">{"Gas provided for the call."}</ResponseField><ResponseField name="gasUsed" type="string">{"Gas actually consumed."}</ResponseField><ResponseField name="input" type="string">{"Call data sent."}</ResponseField><ResponseField name="output" type="string">{"Return data from the call."}</ResponseField><ResponseField name="error" type="string">{"Error message if the call reverted. Optional."}</ResponseField><ResponseField name="calls" type="array">{"Array of nested call objects for internal calls."}</ResponseField></Expandable>;
}
export function Expandable_3(props = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
