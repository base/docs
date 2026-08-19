/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@mintlify/astro/components";
function _createMdxContent(props) {
  const _components = {
    a: "a",
    code: "code",
    ..._provideComponents(),
    ...props.components
  }, {Card, ParamField} = _components;
  if (!Card) _missingMdxReference("Card", true);
  if (!ParamField) _missingMdxReference("ParamField", true);
  return <Card><ParamField path="type" type="string">{"Transaction type: "}<_components.code>{"0x0"}</_components.code>{" Legacy, "}<_components.code>{"0x1"}</_components.code>{" Access List, "}<_components.code>{"0x2"}</_components.code>{" EIP-1559, "}<_components.code>{"0x7e"}</_components.code>{" Deposit (L1→L2)."}</ParamField><ParamField path="status" type="string">{"Transaction status: "}<_components.code>{"0x1"}</_components.code>{" for success, "}<_components.code>{"0x0"}</_components.code>{" for failure."}</ParamField><ParamField path="cumulativeGasUsed" type="string">{"Total gas used in the block up to and including this transaction (hex)."}</ParamField><ParamField path="logs" type="Log[]">{"Array of event logs emitted by the transaction. See "}<_components.a href="#log-object">{"Log Object"}</_components.a>{"."}</ParamField><ParamField path="logsBloom" type="string">{"Bloom filter for the logs in this receipt."}</ParamField><ParamField path="transactionIndex" type="string">{"Index of the transaction within the block (hex)."}</ParamField></Card>;
}
export function Card_5(props = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
