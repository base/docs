/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@mintlify/astro/components";
function _createMdxContent(props) {
  const _components = {
    a: "a",
    li: "li",
    ol: "ol",
    p: "p",
    strong: "strong",
    ..._provideComponents(),
    ...props.components
  }, {AddToMetaMask, Tab, Tabs} = _components;
  if (!AddToMetaMask) _missingMdxReference("AddToMetaMask", true);
  if (!Tab) _missingMdxReference("Tab", true);
  if (!Tabs) _missingMdxReference("Tabs", true);
  return <Tabs><Tab title="Coinbase Wallet"><_components.p><_components.a href="https://chrome.google.com/webstore/detail/coinbase-wallet-extension/hnfanknocfeofbddgcijnmhnfnkdnaad?hl=en">{"Coinbase Wallet"}</_components.a>{" supports Base networks by default."}</_components.p><_components.p><_components.strong>{"Mainnet"}</_components.strong></_components.p><_components.ol>{"\n"}<_components.li>{"Open the Coinbase Wallet extension and log in."}</_components.li>{"\n"}<_components.li>{"Connect to your app."}</_components.li>{"\n"}<_components.li>{"Click the network icon in the upper right corner."}</_components.li>{"\n"}<_components.li>{"Select "}<_components.strong>{"Base"}</_components.strong>{"."}</_components.li>{"\n"}</_components.ol><_components.p><_components.strong>{"Base Sepolia"}</_components.strong></_components.p><_components.ol>{"\n"}<_components.li>{"Open the Coinbase Wallet extension and log in."}</_components.li>{"\n"}<_components.li>{"Connect to your app."}</_components.li>{"\n"}<_components.li>{"Click the network icon in the upper right corner."}</_components.li>{"\n"}<_components.li>{"Click "}<_components.strong>{"More networks"}</_components.strong>{" and go to the "}<_components.strong>{"Testnets"}</_components.strong>{" tab."}</_components.li>{"\n"}<_components.li>{"Select "}<_components.strong>{"Base Sepolia"}</_components.strong>{"."}</_components.li>{"\n"}</_components.ol></Tab><Tab title="MetaMask"><_components.p>{"Click a button to automatically add a Base network to "}<_components.a href="https://metamask.io">{"MetaMask"}</_components.a>{":"}</_components.p><div style={{
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '12px'
  }}><AddToMetaMask chainId="8453" chainName="Base Mainnet" rpcUrl="https://mainnet.base.org" blockExplorer="https://basescan.org" /><AddToMetaMask chainId="84532" chainName="Base Sepolia" rpcUrl="https://sepolia.base.org" blockExplorer="https://sepolia.basescan.org" /><AddToMetaMask chainId="84538453" chainName="Base Vibenet" rpcUrl="https://rpc.vibes.base.org" blockExplorer="https://explorer.vibes.base.org" /></div><_components.p>{"To add a network manually, use the details from the "}<_components.a href="#network-details">{"Network details"}</_components.a>{" section above."}</_components.p></Tab><Tab title="Other EVM wallets"><_components.p>{"Base can be added as a custom network to any EVM-compatible wallet. Use the connection details from the "}<_components.a href="#network-details">{"Network details"}</_components.a>{" section above."}</_components.p></Tab></Tabs>;
}
export function Tabs_2(props = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
