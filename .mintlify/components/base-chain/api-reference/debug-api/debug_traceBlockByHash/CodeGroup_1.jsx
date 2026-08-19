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
  return <CodeGroup><CodeBlock filename="Request" className="language-json"><_components.pre><_components.code className="language-json">{"{\n  \"jsonrpc\": \"2.0\",\n  \"method\": \"debug_traceBlockByHash\",\n  \"params\": [\n    \"0x3a4e8c5d7f2b1a6e9d0c4f8b3e7a2d5c8f1b4e7a0d3c6f9b2e5a8d1c4f7b0e3\",\n    { \"tracer\": \"callTracer\" }\n  ],\n  \"id\": 1\n}\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="Response" className="language-json"><_components.pre><_components.code className="language-json">{"{\n  \"jsonrpc\": \"2.0\",\n  \"id\": 1,\n  \"result\": [\n    {\n      \"txHash\": \"0xb903239f8543d04b5dc1ba6579132b143087c68db1b2168786408fcbce568238\",\n      \"result\": {\n        \"type\": \"CALL\",\n        \"from\": \"0xd3cda913deb6f4967b2ef66ae97de114a83bcc01\",\n        \"to\": \"0x4200000000000000000000000000000000000006\",\n        \"value\": \"0x2c68af0bb14000\",\n        \"gas\": \"0x5208\",\n        \"gasUsed\": \"0x5208\",\n        \"input\": \"0x\",\n        \"output\": \"0x\",\n        \"calls\": []\n      }\n    }\n  ]\n}\n"}</_components.code></_components.pre></CodeBlock></CodeGroup>;
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
