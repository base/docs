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
  return <CodeGroup><CodeBlock filename="Request" className="language-json"><_components.pre><_components.code className="language-json">{"{\n  \"jsonrpc\": \"2.0\",\n  \"method\": \"eth_feeHistory\",\n  \"params\": [\"0xa\", \"latest\", [25, 50, 75]],\n  \"id\": 1\n}\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="Response" className="language-json"><_components.pre><_components.code className="language-json">{"{\n  \"jsonrpc\": \"2.0\",\n  \"id\": 1,\n  \"result\": {\n    \"baseFeePerBlobGas\": [\n      \"0x1\",\n      \"0x1\",\n      \"0x1\",\n      \"0x1\",\n      \"0x3\"\n    ],\n    \"baseFeePerGas\": [\n      \"0x4c4b40\",\n      \"0x4c4b40\",\n      \"0x4c4b40\",\n      \"0x4c4b40\",\n      \"0x4c4b40\"\n    ],\n    \"blobGasUsedRatio\": [0, 0, 0, 0],\n    \"gasUsedRatio\": [\n      0.1180706525,\n      0.1370935325,\n      0.120803475,\n      0.0968808\n    ],\n    \"oldestBlock\": \"0x2c31b05\",\n    \"reward\": [\n      [\"0xf4240\", \"0x2191c0\"],\n      [\"0xf4240\", \"0x186a00\"],\n      [\"0x7a138\", \"0x4c4b40\"],\n      [\"0xf4240\", \"0x4c4b40\"]\n    ]\n  }\n}\n"}</_components.code></_components.pre></CodeBlock></CodeGroup>;
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
