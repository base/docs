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
  return <Expandable title="Filter options"><ParamField body="address" type="string | array"><_components.p>{"A single contract address or array of addresses to filter by."}</_components.p></ParamField><ParamField body="topics" type="array"><_components.p>{"Array of topic filters in the same format as "}<_components.code>{"eth_getLogs"}</_components.code>{"."}</_components.p></ParamField></Expandable>;
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
