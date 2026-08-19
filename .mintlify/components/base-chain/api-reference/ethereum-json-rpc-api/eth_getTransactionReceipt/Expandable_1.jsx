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
  return <Expandable title="Receipt fields"><ResponseField name="transactionHash" type="string">{"32-byte transaction hash."}</ResponseField><ResponseField name="transactionIndex" type="string">{"Index of the transaction in the block (hex)."}</ResponseField><ResponseField name="blockHash" type="string">{"32-byte hash of the block containing this transaction."}</ResponseField><ResponseField name="blockNumber" type="string">{"Block number (hex)."}</ResponseField><ResponseField name="from" type="string">{"20-byte sender address."}</ResponseField><ResponseField name="to" type="string">{"20-byte recipient address. "}<_components.code>{"null"}</_components.code>{" for contract deployments."}</ResponseField><ResponseField name="cumulativeGasUsed" type="string">{"Total gas used in the block up to and including this transaction (hex)."}</ResponseField><ResponseField name="effectiveGasPrice" type="string">{"Actual gas price paid per unit of gas for this transaction (hex)."}</ResponseField><ResponseField name="gasUsed" type="string">{"Gas used by this specific transaction (hex)."}</ResponseField><ResponseField name="contractAddress" type="string | null">{"Address of the created contract, or "}<_components.code>{"null"}</_components.code>{" if not a deployment."}</ResponseField><ResponseField name="logs" type="array">{"Array of log objects emitted by this transaction."}</ResponseField><ResponseField name="logsBloom" type="string">{"256-byte bloom filter for the logs in this receipt."}</ResponseField><ResponseField name="type" type="string">{"Transaction type: "}<_components.code>{"\"0x0\""}</_components.code>{" Legacy, "}<_components.code>{"\"0x1\""}</_components.code>{" Access List, "}<_components.code>{"\"0x2\""}</_components.code>{" EIP-1559, "}<_components.code>{"\"0x7e\""}</_components.code>{" Deposit (L1→L2)."}</ResponseField><ResponseField name="status" type="string"><_components.code>{"\"0x1\""}</_components.code>{" for success, "}<_components.code>{"\"0x0\""}</_components.code>{" for failure (revert)."}</ResponseField><ResponseField name="blobGasUsed" type="string">{"Blob gas consumed by this transaction (EIP-4844). "}<_components.code>{"null"}</_components.code>{" for non-blob transactions."}</ResponseField><ResponseField name="l1Fee" type="string">{"Total L1 data fee paid for this transaction (hex). Base L2 field."}</ResponseField><ResponseField name="l1GasUsed" type="string">{"Amount of L1 gas used for the L1 data portion of this transaction (hex). Base L2 field."}</ResponseField><ResponseField name="l1GasPrice" type="string">{"L1 gas price at the time of inclusion (hex). Base L2 field."}</ResponseField><ResponseField name="l1BlobBaseFee" type="string">{"Blob base fee on L1 at the time of inclusion (hex). Base L2 field."}</ResponseField><ResponseField name="l1BlobBaseFeeScalar" type="string">{"Scalar applied to the blob base fee for L1 fee calculation (hex). Base L2 field."}</ResponseField><ResponseField name="l1BaseFeeScalar" type="string">{"Scalar applied to the L1 base fee for L1 fee calculation (hex). Base L2 field."}</ResponseField><ResponseField name="daFootprintGasScalar" type="string">{"Base-specific DA footprint scalar (hex)."}</ResponseField><ResponseField name="depositNonce" type="string">{"Nonce used for the deposit transaction (hex). Present on type "}<_components.code>{"0x7e"}</_components.code>{" transactions only."}</ResponseField><ResponseField name="depositReceiptVersion" type="string">{"Deposit receipt version (hex). Present on type "}<_components.code>{"0x7e"}</_components.code>{" transactions only."}</ResponseField></Expandable>;
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
