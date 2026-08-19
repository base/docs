/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@mintlify/astro/components";
function _createMdxContent(props) {
  const {Card, ParamField} = {
    ..._provideComponents(),
    ...props.components
  };
  if (!Card) _missingMdxReference("Card", true);
  if (!ParamField) _missingMdxReference("ParamField", true);
  return <Card><ParamField path="parent_hash" type="string">{"Hash of the parent block."}</ParamField><ParamField path="fee_recipient" type="string">{"Address receiving transaction fees (coinbase)."}</ParamField><ParamField path="block_number" type="string">{"Block number in hex."}</ParamField><ParamField path="gas_limit" type="string">{"Maximum gas allowed in this block (hex)."}</ParamField><ParamField path="timestamp" type="string">{"Unix timestamp of block creation (hex)."}</ParamField><ParamField path="base_fee_per_gas" type="string">{"EIP-1559 base fee per gas (hex)."}</ParamField><ParamField path="prev_randao" type="string">{"Previous RANDAO value used for on-chain randomness."}</ParamField><ParamField path="extra_data" type="string">{"Arbitrary data field set by the sequencer."}</ParamField><ParamField path="parent_beacon_block_root" type="string">{"Root of the parent beacon block (EIP-4788)."}</ParamField></Card>;
}
export function Card_2(props = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
