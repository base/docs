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
  return <CodeGroup><CodeBlock filename="Request" className="language-json"><_components.pre><_components.code className="language-json">{"{\n  \"jsonrpc\": \"2.0\",\n  \"method\": \"eth_getTransactionByBlockNumberAndIndex\",\n  \"params\": [\"latest\", \"0x0\"],\n  \"id\": 1\n}\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="Response (type 0x7e deposit, index 0x0)" className="language-json"><_components.pre><_components.code className="language-json">{"{\n  \"jsonrpc\": \"2.0\",\n  \"id\": 1,\n  \"result\": {\n    \"blockHash\": \"0x491bca01d4bc076d60833dbd973fe031a74e7ae31866bf70d077619e09edb6ff\",\n    \"blockNumber\": \"0x2c31b0b\",\n    \"depositReceiptVersion\": \"0x1\",\n    \"from\": \"0xdeaddeaddeaddeaddeaddeaddeaddeaddead0001\",\n    \"gas\": \"0xf4240\",\n    \"gasPrice\": \"0x0\",\n    \"hash\": \"0x03c8f106f18ad94190e763e21b584c5825b2f4c61f1274c0e8abe65b4476cd51\",\n    \"input\": \"0x3db6be2b...\",\n    \"mint\": \"0x0\",\n    \"nonce\": \"0x2c31b0e\",\n    \"r\": \"0x0\",\n    \"s\": \"0x0\",\n    \"sourceHash\": \"0xe40ffb1b9f98a24b21e90e3a3cfe49de1eed195618e943da4d029881d3b3e055\",\n    \"to\": \"0x4200000000000000000000000000000000000015\",\n    \"transactionIndex\": \"0x0\",\n    \"type\": \"0x7e\",\n    \"v\": \"0x0\",\n    \"value\": \"0x0\",\n    \"yParity\": \"0x0\"\n  }\n}\n"}</_components.code></_components.pre></CodeBlock></CodeGroup>;
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
