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
  return <CodeGroup><CodeBlock filename="Standard (block range)" className="language-bash"><_components.pre><_components.code className="language-bash">{"curl https://mainnet.base.org \\\n  -X POST \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"jsonrpc\": \"2.0\",\n    \"method\": \"eth_getLogs\",\n    \"params\": [{\n      \"fromBlock\": \"0x12ced00\",\n      \"toBlock\": \"0x12ced28\",\n      \"address\": \"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913\",\n      \"topics\": [\"0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef\"]\n    }],\n    \"id\": 1\n  }'\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="Flashblocks (pending, ~200ms)" className="language-bash"><_components.pre><_components.code className="language-bash">{"curl https://mainnet.base.org \\\n  -X POST \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"jsonrpc\": \"2.0\",\n    \"method\": \"eth_getLogs\",\n    \"params\": [{\n      \"fromBlock\": \"pending\",\n      \"toBlock\": \"pending\",\n      \"address\": \"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913\",\n      \"topics\": [\"0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef\"]\n    }],\n    \"id\": 1\n  }'\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="Response" className="language-json"><_components.pre><_components.code className="language-json">{"{\n  \"jsonrpc\": \"2.0\",\n  \"id\": 1,\n  \"result\": [\n    {\n      \"address\": \"0x4200000000000000000000000000000000000006\",\n      \"blockHash\": \"0x89f4c9e23a2f706f0afa9ca8f770c4b7dcbcb73ba7e9b1c29c4a8c1b90c31d24\",\n      \"blockNumber\": \"0x2c31b0a\",\n      \"blockTimestamp\": \"0x6a1092f7\",\n      \"data\": \"0x00000000000000000000000000000000000000000000000080134424aad49d08\",\n      \"logIndex\": \"0x0\",\n      \"removed\": false,\n      \"topics\": [\n        \"0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef\",\n        \"0x000000000000000000000000b2cc224c1c9fee385f8ad6a55b4d94e92359dc59\",\n        \"0x00000000000000000000000051c72848c68a965f66fa7a88855f9f7784502a7f\"\n      ],\n      \"transactionHash\": \"0x2ca798df9d399b886fb3735414e8d35a20fec080e48eb5e2e75c0f6ec349a725\",\n      \"transactionIndex\": \"0x1\"\n    }\n  ]\n}\n"}</_components.code></_components.pre></CodeBlock></CodeGroup>;
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
