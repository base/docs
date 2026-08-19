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
  return <Card><ParamField path="state_root" type="string">{"Merkle root of the state trie after applying this Flashblock's transactions."}</ParamField><ParamField path="block_hash" type="string">{"Hash of the partial block at this Flashblock index. Changes with each Flashblock as more transactions are pre-confirmed."}</ParamField><ParamField path="gas_used" type="string">{"Cumulative gas used up to and including this Flashblock (hex)."}</ParamField><ParamField path="blob_gas_used" type="string">{"Cumulative blob gas used (EIP-4844, hex)."}</ParamField><ParamField path="transactions" type="string[]">{"Array of RLP-encoded transactions included in this Flashblock."}</ParamField><ParamField path="withdrawals" type="array">{"Validator withdrawals (always empty on Base L2)."}</ParamField><ParamField path="receipts_root" type="string">{"Merkle root of transaction receipts."}</ParamField><ParamField path="logs_bloom" type="string">{"Bloom filter for logs in this Flashblock."}</ParamField><ParamField path="withdrawals_root" type="string">{"Merkle root of withdrawals."}</ParamField></Card>;
}
export function Card_3(props = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
