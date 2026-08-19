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
  return <CodeGroup><CodeBlock filename="Subscribe" className="language-json"><_components.pre><_components.code className="language-json">{"{\"jsonrpc\": \"2.0\", \"id\": 1, \"method\": \"eth_subscribe\", \"params\": [\"newFlashblocks\"]}\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="Subscription ID Response" className="language-json"><_components.pre><_components.code className="language-json">{"{\"jsonrpc\": \"2.0\", \"id\": 1, \"result\": \"0x3b8cd9e5f4a7b2c1d0e3f4a5b6c7d8e9\"}\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="JavaScript" className="language-javascript"><_components.pre><_components.code className="language-javascript">{"import WebSocket from 'ws';\n\n// Use a Flashblocks-enabled provider WSS endpoint in production\nconst ws = new WebSocket('wss://mainnet-preconf.base.org');\n\nws.on('open', () => {\n  ws.send(JSON.stringify({\n    jsonrpc: '2.0',\n    method: 'eth_subscribe',\n    params: ['newFlashblocks'],\n    id: 1\n  }));\n});\n\nws.on('message', (data) => {\n  const msg = JSON.parse(data.toString());\n  if (msg.method === 'eth_subscription') {\n    // Fires every ~200ms with the latest Flashblock state\n    console.log('Flashblock update:', msg.params.result);\n  }\n});\n"}</_components.code></_components.pre></CodeBlock></CodeGroup>;
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
