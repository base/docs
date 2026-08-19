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
  return <CodeGroup><CodeBlock filename="Standard (latest sealed block)" className="language-bash"><_components.pre><_components.code className="language-bash">{"curl https://mainnet.base.org \\\n  -X POST \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"jsonrpc\": \"2.0\",\n    \"method\": \"eth_getBlockByNumber\",\n    \"params\": [\"latest\", false],\n    \"id\": 1\n  }'\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="Flashblocks (pending, live at ~200ms)" className="language-bash"><_components.pre><_components.code className="language-bash">{"curl https://mainnet.base.org \\\n  -X POST \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"jsonrpc\": \"2.0\",\n    \"method\": \"eth_getBlockByNumber\",\n    \"params\": [\"pending\", false],\n    \"id\": 1\n  }'\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="Response" className="language-json"><_components.pre><_components.code className="language-json">{"{\n  \"jsonrpc\": \"2.0\",\n  \"id\": 1,\n  \"result\": {\n    \"baseFeePerGas\": \"0x4c4b40\",\n    \"blobGasUsed\": \"0x5384cc\",\n    \"difficulty\": \"0x0\",\n    \"excessBlobGas\": \"0x0\",\n    \"extraData\": \"0x01000000640000000500000000004c4b40\",\n    \"gasLimit\": \"0x17d78400\",\n    \"gasUsed\": \"0x2155bc7\",\n    \"hash\": \"0x491bca01d4bc076d60833dbd973fe031a74e7ae31866bf70d077619e09edb6ff\",\n    \"logsBloom\": \"0xb765d5b0...\",\n    \"miner\": \"0x4200000000000000000000000000000000000011\",\n    \"mixHash\": \"0x47aecef0e1afa26b8e1f428e9a8696cf53d85c62587d8c2cea079c715cd29626\",\n    \"nonce\": \"0x0000000000000000\",\n    \"number\": \"0x2c31b0b\",\n    \"parentBeaconBlockRoot\": \"0x15b9e7c8ac4cbe92dafc849ed30a23e91624bbe5cbe199c0ccea3f7de7fc6d49\",\n    \"parentHash\": \"0x89f4c9e23a2f706f0afa9ca8f770c4b7dcbcb73ba7e9b1c29c4a8c1b90c31d24\",\n    \"receiptsRoot\": \"0x5a428d77344334537d7adaf85a45eb6d7977bc807a68c669f36cb043600da6d2\",\n    \"requestsHash\": \"0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\",\n    \"sha3Uncles\": \"0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347\",\n    \"size\": \"0x1bb3b\",\n    \"stateRoot\": \"0x1b1525af0cdd504147b89f2a7ce1838ccb70c5439c45ce55522c2e2529801e87\",\n    \"timestamp\": \"0x6a1092f9\",\n    \"transactions\": [\n      \"0x03c8f106f18ad94190e763e21b584c5825b2f4c61f1274c0e8abe65b4476cd51\",\n      \"...\"\n    ],\n    \"transactionsRoot\": \"0x6b9c9fcbdf98a8f4d38a3c16d099e9f0c7b7b474c2f5e044af7c91949c04a234\",\n    \"uncles\": [],\n    \"withdrawals\": [],\n    \"withdrawalsRoot\": \"0x57f4414a70a4af5e1a97b5fd8b8c6c870c00e8d9dbc0fde0059ce46e2cd28e5b\"\n  }\n}\n"}</_components.code></_components.pre></CodeBlock></CodeGroup>;
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
