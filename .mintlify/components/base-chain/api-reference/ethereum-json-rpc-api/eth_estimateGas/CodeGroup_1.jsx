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
  return <CodeGroup><CodeBlock filename="Standard" className="language-bash"><_components.pre><_components.code className="language-bash">{"curl https://mainnet.base.org \\\n  -X POST \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"jsonrpc\": \"2.0\",\n    \"method\": \"eth_estimateGas\",\n    \"params\": [{\n      \"from\": \"0xd3CdA913deB6f4967b2Ef66ae97DE114a83bcc01\",\n      \"to\": \"0x4200000000000000000000000000000000000006\",\n      \"value\": \"0x2c68af0bb14000\"\n    }],\n    \"id\": 1\n  }'\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="Flashblocks (pending state)" className="language-bash"><_components.pre><_components.code className="language-bash">{"curl https://mainnet.base.org \\\n  -X POST \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"jsonrpc\": \"2.0\",\n    \"method\": \"eth_estimateGas\",\n    \"params\": [{\n      \"from\": \"0xd3CdA913deB6f4967b2Ef66ae97DE114a83bcc01\",\n      \"to\": \"0x4200000000000000000000000000000000000006\",\n      \"value\": \"0x2c68af0bb14000\"\n    }, \"pending\"],\n    \"id\": 1\n  }'\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="Response" className="language-json"><_components.pre><_components.code className="language-json">{"{\n  \"jsonrpc\": \"2.0\",\n  \"id\": 1,\n  \"result\": \"0x5208\"\n}\n"}</_components.code></_components.pre></CodeBlock></CodeGroup>;
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
