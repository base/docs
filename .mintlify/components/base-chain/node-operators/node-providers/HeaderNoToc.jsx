import * as Mintlify from "@mintlify/components";
const { ApiPlayground, Accordion, AccordionGroup, Badge, Callout, CodeGroup, CodeBlock, Color, CustomCode, CustomComponent, DynamicCustomComponent, Danger, Tile, Tree, FileTree, SnippetGroup, Panel, RequestExample, ResponseExample, Param, ParamField, Prompt, Card, CardGroup, Columns, Column, Expandable, Frame, Heading, Info, Icon, Link, MDXContentController, ResponseField, Warning, Note, Tip, Check, Tabs, Tab, Tooltip, Latex, Step, Steps, Update, ZoomImage, OptimizedVideo, Mermaid, Variation, Visibility, View } = Mintlify;

export const HeaderNoToc = ({title}) => {
  return <h5 className="text-xl font-semibold mt-4 mb-2 text-black dark:text-white">
      {title}
    </h5>;
};

