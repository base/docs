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
  return <CodeGroup><CodeBlock filename="Request (default struct log)" className="language-json"><_components.pre><_components.code className="language-json">{"{\n  \"jsonrpc\": \"2.0\",\n  \"method\": \"debug_traceTransaction\",\n  \"params\": [\n    \"0xb903239f8543d04b5dc1ba6579132b143087c68db1b2168786408fcbce568238\",\n    {}\n  ],\n  \"id\": 1\n}\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="Request (callTracer)" className="language-json"><_components.pre><_components.code className="language-json">{"{\n  \"jsonrpc\": \"2.0\",\n  \"method\": \"debug_traceTransaction\",\n  \"params\": [\n    \"0xb903239f8543d04b5dc1ba6579132b143087c68db1b2168786408fcbce568238\",\n    { \"tracer\": \"callTracer\" }\n  ],\n  \"id\": 1\n}\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="Response (default)" className="language-json"><_components.pre><_components.code className="language-json">{"{\n  \"jsonrpc\": \"2.0\",\n  \"id\": 1,\n  \"result\": {\n    \"gas\": 21000,\n    \"failed\": false,\n    \"returnValue\": \"\",\n    \"structLogs\": [\n      {\n        \"pc\": 0,\n        \"op\": \"PUSH1\",\n        \"gas\": 21000,\n        \"gasCost\": 3,\n        \"depth\": 1,\n        \"stack\": [],\n        \"memory\": [],\n        \"storage\": {}\n      }\n    ]\n  }\n}\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="Response (callTracer)" className="language-json"><_components.pre><_components.code className="language-json">{"{\n  \"jsonrpc\": \"2.0\",\n  \"id\": 1,\n  \"result\": {\n    \"type\": \"CALL\",\n    \"from\": \"0xd3cda913deb6f4967b2ef66ae97de114a83bcc01\",\n    \"to\": \"0x4200000000000000000000000000000000000006\",\n    \"value\": \"0x2c68af0bb14000\",\n    \"gas\": \"0x5208\",\n    \"gasUsed\": \"0x5208\",\n    \"input\": \"0x\",\n    \"output\": \"0x\",\n    \"calls\": []\n  }\n}\n"}</_components.code></_components.pre></CodeBlock></CodeGroup>;
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
