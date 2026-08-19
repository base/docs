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
  return <Expandable title="Simulation payload fields"><ParamField body="blockStateCalls" type="array" required><_components.p>{"Array of block state call objects. Each object represents one simulated block."}</_components.p><Expandable title="Block state call fields"><ParamField body="calls" type="array"><_components.p>{"Array of transaction call objects to simulate within this block."}</_components.p></ParamField><ParamField body="stateOverrides" type="object"><_components.p>{"Per-address state overrides applied before simulation (e.g., balance, nonce, code, storage). Optional."}</_components.p></ParamField><ParamField body="blockOverrides" type="object"><_components.p>{"Block-level overrides (e.g., "}<_components.code>{"number"}</_components.code>{", "}<_components.code>{"timestamp"}</_components.code>{"). Optional."}</_components.p></ParamField></Expandable></ParamField><ParamField body="traceTransfers" type="boolean"><_components.p>{"If "}<_components.code>{"true"}</_components.code>{", ETH transfer events are included as logs in the result. Defaults to "}<_components.code>{"false"}</_components.code>{"."}</_components.p></ParamField><ParamField body="validation" type="boolean"><_components.p>{"If "}<_components.code>{"true"}</_components.code>{", transaction validation (nonce, balance) is enforced. Defaults to "}<_components.code>{"false"}</_components.code>{"."}</_components.p></ParamField></Expandable>;
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
