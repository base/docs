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
  return <CodeGroup><CodeBlock filename="Subscribe" className="language-json"><_components.pre><_components.code className="language-json">{"{\"jsonrpc\": \"2.0\", \"id\": 1, \"method\": \"eth_subscribe\", \"params\": [\"newFlashblockTransactions\"]}\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="Subscribe (full data)" className="language-json"><_components.pre><_components.code className="language-json">{"{\"jsonrpc\": \"2.0\", \"id\": 1, \"method\": \"eth_subscribe\", \"params\": [\"newFlashblockTransactions\", true]}\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="Subscription ID Response" className="language-json"><_components.pre><_components.code className="language-json">{"{\"jsonrpc\": \"2.0\", \"id\": 1, \"result\": \"0x1887ec8b9589ccad00000000000532da\"}\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="Notification (full: false)" className="language-json"><_components.pre><_components.code className="language-json">{"{\n  \"jsonrpc\": \"2.0\",\n  \"method\": \"eth_subscription\",\n  \"params\": {\n    \"subscription\": \"0x1887ec8b9589ccad00000000000532da\",\n    \"result\": \"0xe26de91f9037e903eefe70b28f613019253da603e67e0dbfe2f656dce5444311\"\n  }\n}\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="Notification (full: true)" className="language-json"><_components.pre><_components.code className="language-json">{"{\n  \"jsonrpc\": \"2.0\",\n  \"method\": \"eth_subscription\",\n  \"params\": {\n    \"subscription\": \"0x1887ec8b9589ccad00000000000532da\",\n    \"result\": {\n      \"type\": \"0x2\",\n      \"chainId\": \"0x2105\",\n      \"nonce\": \"0x34ed\",\n      \"gas\": \"0x7a1200\",\n      \"maxFeePerGas\": \"0x257ab3c\",\n      \"maxPriorityFeePerGas\": \"0x419c7c\",\n      \"to\": \"0x6211a3742cf9d3b6677ecc7fd9dd102ab101d8e2\",\n      \"value\": \"0x0\",\n      \"accessList\": [],\n      \"input\": \"0x...\",\n      \"r\": \"0xa7cd30d21c30d4d60d27073c8bbc3ef5778527cf98eae0433e9d1f18c929dd5d\",\n      \"s\": \"0x08c75921e6bb75e19112300f80998f88a2b0f1adc52df2c3597b171d8c8de68d\",\n      \"yParity\": \"0x1\",\n      \"v\": \"0x1\",\n      \"hash\": \"0x6a010a5ce041ff0ee5a926db65d1ef512836cae822d5f2d58b63981bfa40aa7f\",\n      \"blockHash\": null,\n      \"blockNumber\": \"0x2c679a1\",\n      \"transactionIndex\": \"0x83\",\n      \"from\": \"0x2ad149d3d3099532d7c25c47cce37db6c4677b3a\",\n      \"gasPrice\": \"0x8de7bc\",\n      \"gasUsed\": \"0x26132\",\n      \"status\": \"0x1\",\n      \"cumulativeGasUsed\": \"0x16cb406\",\n      \"contractAddress\": null,\n      \"logsBloom\": \"0x00...00\",\n      \"logs\": []\n    }\n  }\n}\n"}</_components.code></_components.pre></CodeBlock></CodeGroup>;
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
