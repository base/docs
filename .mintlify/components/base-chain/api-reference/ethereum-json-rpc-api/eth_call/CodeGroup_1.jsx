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
  return <CodeGroup><CodeBlock filename="Standard (latest)" className="language-bash"><_components.pre><_components.code className="language-bash">{"curl https://mainnet.base.org \\\n  -X POST \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"jsonrpc\": \"2.0\",\n    \"method\": \"eth_call\",\n    \"params\": [\n      {\n        \"to\": \"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913\",\n        \"data\": \"0x70a082310000000000000000000000004200000000000000000000000000000000000006\"\n      },\n      \"latest\"\n    ],\n    \"id\": 1\n  }'\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="Flashblocks (pending, ~200ms)" className="language-bash"><_components.pre><_components.code className="language-bash">{"curl https://mainnet.base.org \\\n  -X POST \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"jsonrpc\": \"2.0\",\n    \"method\": \"eth_call\",\n    \"params\": [\n      {\n        \"to\": \"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913\",\n        \"data\": \"0x70a082310000000000000000000000004200000000000000000000000000000000000006\"\n      },\n      \"pending\"\n    ],\n    \"id\": 1\n  }'\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="Response" className="language-json"><_components.pre><_components.code className="language-json">{"{\n  \"jsonrpc\": \"2.0\",\n  \"id\": 1,\n  \"result\": \"0x0000000000000000000000000000000000000000000000000000000005f5e100\"\n}\n"}</_components.code></_components.pre></CodeBlock></CodeGroup>;
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
