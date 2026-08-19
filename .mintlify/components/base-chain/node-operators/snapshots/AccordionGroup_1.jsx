/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@mintlify/astro/components";
function _createMdxContent(props) {
  const _components = {
    code: "code",
    p: "p",
    strong: "strong",
    ..._provideComponents(),
    ...props.components
  }, {Accordion, AccordionGroup} = _components;
  if (!Accordion) _missingMdxReference("Accordion", true);
  if (!AccordionGroup) _missingMdxReference("AccordionGroup", true);
  return <AccordionGroup><Accordion title="Why does Base's Full snapshot use a different retention window than Reth's --full preset?"><_components.p>{"In Reth, a \"full\" node is just a pruned node with a specific preset rather than a distinct node type. Reth's "}<_components.code>{"--full"}</_components.code>{" preset retains the last "}<_components.strong>{"10,064 blocks"}</_components.strong>{" (~1.4 days on Ethereum; ~5-6 hours on Base due to faster block times)."}</_components.p><_components.p>{"Base's "}<_components.code>{"--full"}</_components.code>{" snapshot uses a 31-day rolling retention window instead. If a smaller storage footprint is preferred, you can override "}<_components.code>{"reth.toml"}</_components.code>{" to match the 10,064-block preset."}</_components.p></Accordion><Accordion title="I'm seeing: Archive extracted, but output verification failed."><_components.p>{"This is caused due to a newer snapshot being uploaded during the time your download is happening. Please interrupt the download command and re-run it."}</_components.p><_components.p>{"Note: The download is idempotent, so it will not re-download files that have already been downloaded; it will only fetch the diff."}</_components.p></Accordion></AccordionGroup>;
}
export function AccordionGroup_1(props = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
