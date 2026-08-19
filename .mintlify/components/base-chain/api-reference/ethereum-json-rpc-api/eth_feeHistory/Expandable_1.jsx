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
  return <Expandable title="Fee history fields"><ResponseField name="oldestBlock" type="string">{"The oldest block number in the result set (hex)."}</ResponseField><ResponseField name="baseFeePerGas" type="array">{"Array of base fees per gas for each block, plus one extra entry for the next pending block. Length = "}<_components.code>{"blockCount + 1"}</_components.code>{"."}</ResponseField><ResponseField name="gasUsedRatio" type="array">{"Array of gas used / gas limit ratios for each block (0.0 to 1.0). Length = "}<_components.code>{"blockCount"}</_components.code>{"."}</ResponseField><ResponseField name="baseFeePerBlobGas" type="array">{"Array of base fees per blob gas for each block, plus one extra for the next pending block (EIP-4844). Always "}<_components.code>{"\"0x1\""}</_components.code>{" on Base currently. Length = "}<_components.code>{"blockCount + 1"}</_components.code>{"."}</ResponseField><ResponseField name="blobGasUsedRatio" type="array">{"Array of blob gas used ratios for each block (0.0 to 1.0). Used to adjust the blob base fee (EIP-4844). Length = "}<_components.code>{"blockCount"}</_components.code>{"."}</ResponseField><ResponseField name="reward" type="array">{"2D array of priority fee percentiles per block, matching the requested percentile values."}</ResponseField></Expandable>;
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
