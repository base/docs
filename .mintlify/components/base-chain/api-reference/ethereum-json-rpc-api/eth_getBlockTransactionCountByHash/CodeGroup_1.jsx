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
  return <CodeGroup><CodeBlock filename="Request" className="language-json"><_components.pre><_components.code className="language-json">{"{\n  \"jsonrpc\": \"2.0\",\n  \"method\": \"eth_getBlockTransactionCountByHash\",\n  \"params\": [\"0x5c330e55a190f82ea486b61e5b12e27dfb4fb3cecfc5746886ef38ca1281bce8\"],\n  \"id\": 1\n}\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="Response" className="language-json"><_components.pre><_components.code className="language-json">{"{\n  \"jsonrpc\": \"2.0\",\n  \"id\": 1,\n  \"result\": \"0x1f\"\n}\n"}</_components.code></_components.pre></CodeBlock></CodeGroup>;
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
