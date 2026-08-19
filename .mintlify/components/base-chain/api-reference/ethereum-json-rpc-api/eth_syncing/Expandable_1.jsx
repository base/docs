/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@mintlify/astro/components";
function _createMdxContent(props) {
  const {Expandable, ResponseField} = {
    ..._provideComponents(),
    ...props.components
  };
  if (!Expandable) _missingMdxReference("Expandable", true);
  if (!ResponseField) _missingMdxReference("ResponseField", true);
  return <Expandable title="Sync status fields (when syncing)"><ResponseField name="startingBlock" type="string">{"Block at which the sync started (hex)."}</ResponseField><ResponseField name="currentBlock" type="string">{"Current block being processed (hex)."}</ResponseField><ResponseField name="highestBlock" type="string">{"Estimated highest block (hex)."}</ResponseField></Expandable>;
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
