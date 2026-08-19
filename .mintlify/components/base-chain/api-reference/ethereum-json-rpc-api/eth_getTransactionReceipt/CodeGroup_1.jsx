/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@mintlify/astro/components";
function _createMdxContent(props) {
  const _components = {
    code: "code",
    pre: "pre",
    ..._provideComponents(),
    ...props.components
  }, {CodeBlock, CodeGroup} = _components;
  if (!CodeBlock) _missingMdxReference("CodeBlock", true);
  if (!CodeGroup) _missingMdxReference("CodeGroup", true);
  return <CodeGroup><CodeBlock filename="Request" className="language-json"><_components.pre><_components.code className="language-json">{"{\n  \"jsonrpc\": \"2.0\",\n  \"method\": \"eth_getTransactionReceipt\",\n  \"params\": [\"0xb903239f8543d04b5dc1ba6579132b143087c68db1b2168786408fcbce568238\"],\n  \"id\": 1\n}\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="Response (type 0x7e deposit)" className="language-json"><_components.pre><_components.code className="language-json">{"{\n  \"jsonrpc\": \"2.0\",\n  \"id\": 1,\n  \"result\": {\n    \"blobGasUsed\": null,\n    \"blockHash\": \"0x491bca01d4bc076d60833dbd973fe031a74e7ae31866bf70d077619e09edb6ff\",\n    \"blockNumber\": \"0x2c31b0b\",\n    \"contractAddress\": null,\n    \"cumulativeGasUsed\": \"0xb48a\",\n    \"daFootprintGasScalar\": \"0x94\",\n    \"depositNonce\": \"0x2c31b0e\",\n    \"depositReceiptVersion\": \"0x1\",\n    \"effectiveGasPrice\": \"0x0\",\n    \"from\": \"0xdeaddeaddeaddeaddeaddeaddeaddeaddead0001\",\n    \"gasUsed\": \"0xb48a\",\n    \"l1BaseFeeScalar\": \"0x8dd\",\n    \"l1BlobBaseFee\": \"0x582765\",\n    \"l1BlobBaseFeeScalar\": \"0x101c12\",\n    \"l1Fee\": \"0x0\",\n    \"l1GasPrice\": \"0x6bdbf6f\",\n    \"l1GasUsed\": \"0x71d\",\n    \"logs\": [],\n    \"logsBloom\": \"0x000...000\",\n    \"status\": \"0x1\",\n    \"to\": \"0x4200000000000000000000000000000000000015\",\n    \"transactionHash\": \"0x03c8f106f18ad94190e763e21b584c5825b2f4c61f1274c0e8abe65b4476cd51\",\n    \"transactionIndex\": \"0x0\",\n    \"type\": \"0x7e\"\n  }\n}\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="Not Found" className="language-json"><_components.pre><_components.code className="language-json">{"{\n  \"jsonrpc\": \"2.0\",\n  \"id\": 1,\n  \"result\": null\n}\n"}</_components.code></_components.pre></CodeBlock></CodeGroup>;
}
export function CodeGroup_1(props = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
