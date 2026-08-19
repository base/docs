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
  return <Expandable title="Block fields"><ResponseField name="number" type="string">{"Block number in hex. "}<_components.code>{"null"}</_components.code>{" when pending."}</ResponseField><ResponseField name="hash" type="string">{"Block hash. "}<_components.code>{"null"}</_components.code>{" when pending."}</ResponseField><ResponseField name="parentHash" type="string">{"Hash of the parent block."}</ResponseField><ResponseField name="nonce" type="string">{"PoW nonce. Always "}<_components.code>{"\"0x0000000000000000\""}</_components.code>{" on Base (PoS)."}</ResponseField><ResponseField name="sha3Uncles" type="string">{"Hash of the uncles list. Always empty on Base."}</ResponseField><ResponseField name="logsBloom" type="string">{"Bloom filter for the block's logs."}</ResponseField><ResponseField name="transactionsRoot" type="string">{"Root of the transaction trie."}</ResponseField><ResponseField name="stateRoot" type="string">{"Root of the final state trie."}</ResponseField><ResponseField name="receiptsRoot" type="string">{"Root of the receipts trie."}</ResponseField><ResponseField name="miner" type="string">{"Address of the fee recipient (coinbase)."}</ResponseField><ResponseField name="difficulty" type="string">{"Always "}<_components.code>{"\"0x0\""}</_components.code>{" on Base (PoS)."}</ResponseField><ResponseField name="mixHash" type="string">{"Present in all blocks; repurposed for PoS consensus (bytes32 hex)."}</ResponseField><ResponseField name="extraData" type="string">{"Arbitrary data field set by the sequencer."}</ResponseField><ResponseField name="size" type="string">{"Block size in bytes (hex)."}</ResponseField><ResponseField name="gasLimit" type="string">{"Maximum gas allowed in this block (hex)."}</ResponseField><ResponseField name="gasUsed" type="string">{"Total gas used in this block (hex)."}</ResponseField><ResponseField name="timestamp" type="string">{"Unix timestamp (hex)."}</ResponseField><ResponseField name="transactions" type="array">{"Array of transaction hashes or full transaction objects."}</ResponseField><ResponseField name="uncles" type="array">{"Always "}<_components.code>{"[]"}</_components.code>{" on Base."}</ResponseField><ResponseField name="withdrawals" type="array">{"Always "}<_components.code>{"[]"}</_components.code>{" on Base."}</ResponseField><ResponseField name="withdrawalsRoot" type="string">{"Merkle root of the withdrawals list (EIP-4895, bytes32 hex)."}</ResponseField><ResponseField name="baseFeePerGas" type="string">{"EIP-1559 base fee per gas (hex)."}</ResponseField><ResponseField name="blobGasUsed" type="string">{"Total blob gas used (EIP-4844, hex)."}</ResponseField><ResponseField name="excessBlobGas" type="string">{"Excess blob gas for blob fee calculation (EIP-4844, hex)."}</ResponseField><ResponseField name="parentBeaconBlockRoot" type="string">{"Parent beacon block root (EIP-4788)."}</ResponseField><ResponseField name="requestsHash" type="string">{"Hash of requests (EIP-7685)."}</ResponseField></Expandable>;
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
