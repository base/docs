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
  return <CodeGroup><CodeBlock filename="Standard" className="language-bash"><_components.pre><_components.code className="language-bash">{"curl https://mainnet.base.org \\\n  -X POST -H \"Content-Type: application/json\" \\\n  -d '{\"jsonrpc\":\"2.0\",\"method\":\"eth_sendRawTransaction\",\"params\":[\"0x02f86b82210501843b9aca008477359400825208944200000000000000000000000000000000000006872c68af0bb1400080c001a0...\"],\"id\":1}'\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="Flashblocks (preconf submission)" className="language-bash"><_components.pre><_components.code className="language-bash">{"curl https://mainnet.base.org \\\n  -X POST -H \"Content-Type: application/json\" \\\n  -d '{\"jsonrpc\":\"2.0\",\"method\":\"eth_sendRawTransaction\",\"params\":[\"0x02f86b82210501843b9aca008477359400825208944200000000000000000000000000000000000006872c68af0bb1400080c001a0...\"],\"id\":1}'\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="Response" className="language-json"><_components.pre><_components.code className="language-json">{"{\n  \"jsonrpc\": \"2.0\",\n  \"id\": 1,\n  \"result\": \"0xb903239f8543d04b5dc1ba6579132b143087c68db1b2168786408fcbce568238\"\n}\n"}</_components.code></_components.pre></CodeBlock></CodeGroup>;
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
