/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@mintlify/astro/components";
function _createMdxContent(props) {
  const _components = {
    p: "p",
    ..._provideComponents(),
    ...props.components
  }, {Expandable, ParamField} = _components;
  if (!Expandable) _missingMdxReference("Expandable", true);
  if (!ParamField) _missingMdxReference("ParamField", true);
  return <Expandable title="Transaction fields"><ParamField body="from" type="string"><_components.p>{"Address the call is sent from. Optional; defaults to the zero address."}</_components.p></ParamField><ParamField body="to" type="string" required><_components.p>{"Address the call is directed to."}</_components.p></ParamField><ParamField body="gas" type="string"><_components.p>{"Gas provided for the call as a hexadecimal integer. Defaults to a high limit if omitted."}</_components.p></ParamField><ParamField body="gasPrice" type="string"><_components.p>{"Gas price in wei as a hexadecimal integer. For legacy transactions. Optional."}</_components.p></ParamField><ParamField body="maxFeePerGas" type="string"><_components.p>{"EIP-1559 maximum total fee per gas. Optional."}</_components.p></ParamField><ParamField body="maxPriorityFeePerGas" type="string"><_components.p>{"EIP-1559 maximum priority fee per gas. Optional."}</_components.p></ParamField><ParamField body="value" type="string"><_components.p>{"Value transferred in wei as a hexadecimal integer. Optional."}</_components.p></ParamField><ParamField body="data" type="string"><_components.p>{"ABI-encoded call data: the 4-byte function selector followed by encoded arguments. Optional."}</_components.p></ParamField></Expandable>;
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
