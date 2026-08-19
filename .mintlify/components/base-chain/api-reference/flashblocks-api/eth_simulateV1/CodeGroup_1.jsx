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
  return <CodeGroup><CodeBlock filename="cURL" className="language-bash"><_components.pre><_components.code className="language-bash">{"curl https://sepolia.base.org \\\n  -X POST \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"jsonrpc\": \"2.0\",\n    \"method\": \"eth_simulateV1\",\n    \"params\": [\n      {\n        \"blockStateCalls\": [\n          {\n            \"calls\": [{\"to\": \"0x...\", \"data\": \"0x...\"}],\n            \"stateOverrides\": {}\n          }\n        ],\n        \"traceTransfers\": true,\n        \"validation\": true\n      },\n      \"pending\"\n    ],\n    \"id\": 1\n  }'\n"}</_components.code></_components.pre></CodeBlock><CodeBlock filename="Response" className="language-json"><_components.pre><_components.code className="language-json">{"{\n  \"jsonrpc\": \"2.0\",\n  \"id\": 1,\n  \"result\": [\n    {\n      \"baseFeePerGas\": \"0x0\",\n      \"blobGasUsed\": \"0x39d0\",\n      \"calls\": [\n        {\n          \"gasUsed\": \"0x5208\",\n          \"logs\": [],\n          \"returnData\": \"0x\",\n          \"status\": \"0x1\"\n        }\n      ],\n      \"difficulty\": \"0x0\",\n      \"excessBlobGas\": \"0x0\",\n      \"extraData\": \"0x01000000640000000500000000004c4b40\",\n      \"gasLimit\": \"0x17d78400\",\n      \"gasUsed\": \"0x5208\",\n      \"hash\": \"0x2f2f692821995e39653f63164b2d5d0e0bba66c86c2a199fd3009c0b9906c7b0\",\n      \"logsBloom\": \"0x000...000\",\n      \"miner\": \"0x4200000000000000000000000000000000000011\",\n      \"mixHash\": \"0x0000000000000000000000000000000000000000000000000000000000000000\",\n      \"nonce\": \"0x0000000000000000\",\n      \"number\": \"0x2c31c49\",\n      \"parentBeaconBlockRoot\": \"0x64e625f8bc74f78539f962aa09d522c63576ff6ad57170c668882d99e669ef52\",\n      \"parentHash\": \"0x9653660afa4fca3976a21d42ebf849c337e9840993f050fee3affc673a573bf8\",\n      \"receiptsRoot\": \"0xf78dfb743fbd92ade140711c8bbc542b5e307f0ab7984eff35d751969fe57efa\",\n      \"requestsHash\": \"0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\",\n      \"sha3Uncles\": \"0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347\",\n      \"size\": \"0x2a6\",\n      \"stateRoot\": \"0x0000000000000000000000000000000000000000000000000000000000000000\",\n      \"timestamp\": \"0x6a10957f\",\n      \"transactions\": [\n        \"0xa401668a06b038c488c1abc013676dfe63fc645d182ece34d8b3f40f45689279\"\n      ],\n      \"transactionsRoot\": \"0x0b1328c457d7a8108ea9f2559142890491b680fdb691720b3d0c857c3d11002c\",\n      \"uncles\": [],\n      \"withdrawals\": [],\n      \"withdrawalsRoot\": \"0x0000000000000000000000000000000000000000000000000000000000000000\"\n    }\n  ]\n}\n"}</_components.code></_components.pre></CodeBlock></CodeGroup>;
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
