/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@mintlify/astro/components";
function _createMdxContent(props) {
  const _components = {
    a: "a",
    code: "code",
    p: "p",
    strong: "strong",
    ..._provideComponents(),
    ...props.components
  }, {Card, ParamField} = _components;
  if (!Card) _missingMdxReference("Card", true);
  if (!ParamField) _missingMdxReference("ParamField", true);
  return <Card><ParamField path="payload_id" type="string"><_components.p>{"Unique identifier for the block being built. Remains consistent across all Flashblocks within a single full block."}</_components.p></ParamField><ParamField path="index" type="number"><_components.p>{"Flashblock index within the current block. Starts at 0 (system transactions only). User transactions begin at index 1. Typically reaches 9–10 per block, but "}<_components.a href="/base-chain/flashblocks/faq#can-the-flashblock-index-exceed-10-is-that-a-bug">{"may exceed 10"}</_components.a>{" during sequencer timing drift."}</_components.p></ParamField><ParamField path="base" type="Base Object"><_components.p>{"Block header properties. "}<_components.strong>{"Only present when "}<_components.code>{"index"}</_components.code>{" is "}<_components.code>{"0"}</_components.code>{"."}</_components.strong>{" See "}<_components.a href="#base-object">{"Base Object"}</_components.a>{"."}</_components.p></ParamField><ParamField path="diff" type="Diff Object"><_components.p>{"Incremental block state changes for this Flashblock. Present in every message. See "}<_components.a href="#diff-object">{"Diff Object"}</_components.a>{"."}</_components.p></ParamField><ParamField path="metadata" type="Metadata Object"><_components.p>{"Supplemental data. "}<_components.strong>{"Unstable — fields may change without notice."}</_components.strong>{" See "}<_components.a href="#metadata-object">{"Metadata Object"}</_components.a>{"."}</_components.p></ParamField></Card>;
}
export function Card_1(props = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
