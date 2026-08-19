import * as Mintlify from "@mintlify/components";
const { ApiPlayground, Accordion, AccordionGroup, Badge, Callout, CodeGroup, CodeBlock, Color, CustomCode, CustomComponent, DynamicCustomComponent, Danger, Tile, Tree, FileTree, SnippetGroup, Panel, RequestExample, ResponseExample, Param, ParamField, Prompt, Card, CardGroup, Columns, Column, Expandable, Frame, Heading, Info, Icon, Link, MDXContentController, ResponseField, Warning, Note, Tip, Check, Tabs, Tab, Tooltip, Latex, Step, Steps, Update, ZoomImage, OptimizedVideo, Mermaid, Variation, Visibility, View } = Mintlify;

export const AddToMetaMask = ({chainId, chainName, rpcUrl, blockExplorer}) => {
  const addNetwork = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('MetaMask is not installed. Visit metamask.io to get started.');
      return;
    }
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x' + Number(chainId).toString(16),
          chainName,
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18
          },
          rpcUrls: [rpcUrl],
          blockExplorerUrls: [blockExplorer]
        }]
      });
    } catch (error) {
      console.error('Failed to add network:', error);
    }
  };
  return <button onClick={addNetwork} style={{
    display: 'inline-flex',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: '#0052FF',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px'
  }}>
      Add {chainName}
    </button>;
};

