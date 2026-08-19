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
  return <Expandable title="Trace options"><ParamField body="tracer" type="string"><_components.p>{"Built-in tracer name. "}<_components.code>{"\"callTracer\""}</_components.code>{" returns a call tree. "}<_components.code>{"\"prestateTracer\""}</_components.code>{" returns the pre-execution account state. Omit to use the default struct log tracer."}</_components.p></ParamField><ParamField body="tracerConfig" type="object"><_components.p>{"Options for the selected tracer. For "}<_components.code>{"\"callTracer\""}</_components.code>{": "}<_components.code>{"{ \"onlyTopCall\": true }"}</_components.code>{" skips internal calls."}</_components.p></ParamField><ParamField body="disableStorage" type="boolean"><_components.p>{"If "}<_components.code>{"true"}</_components.code>{", omits storage capture from struct logs. Reduces response size. Defaults to "}<_components.code>{"false"}</_components.code>{"."}</_components.p></ParamField><ParamField body="disableMemory" type="boolean"><_components.p>{"If "}<_components.code>{"true"}</_components.code>{", omits memory capture from struct logs. Reduces response size. Defaults to "}<_components.code>{"false"}</_components.code>{"."}</_components.p></ParamField><ParamField body="disableStack" type="boolean"><_components.p>{"If "}<_components.code>{"true"}</_components.code>{", omits stack capture from struct logs. Defaults to "}<_components.code>{"false"}</_components.code>{"."}</_components.p></ParamField><ParamField body="timeout" type="string"><_components.p>{"Execution timeout as a Go duration string (e.g., "}<_components.code>{"\"10s\""}</_components.code>{", "}<_components.code>{"\"30s\""}</_components.code>{"). Defaults to "}<_components.code>{"\"5s\""}</_components.code>{"."}</_components.p></ParamField></Expandable>;
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
