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
  return <CodeGroup><CodeBlock filename="cURL" className="language-bash"><_components.pre><_components.code className="language-bash">{"curl https://mainnet.base.org \\\n  -X POST -H \"Content-Type: application/json\" \\\n  -d '{\"jsonrpc\":\"2.0\",\"method\":\"base_transactionStatus\",\"params\":[\"0xabc123...\"],\"id\":1}'\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="Known" className="language-json"><_components.pre><_components.code className="language-json">{"{\"jsonrpc\": \"2.0\", \"id\": 1, \"result\": {\"status\": \"Known\"}}\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="Unknown" className="language-json"><_components.pre><_components.code className="language-json">{"{\"jsonrpc\": \"2.0\", \"id\": 1, \"result\": {\"status\": \"Unknown\"}}\n"}</_components.code></_components.pre></CodeBlock></CodeGroup>;
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
