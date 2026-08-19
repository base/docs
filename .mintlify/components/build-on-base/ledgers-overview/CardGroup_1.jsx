/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
import {useMDXComponents as _provideComponents} from "@mintlify/astro/components";
function _createMdxContent(props) {
  const _components = {
    p: "p",
    ..._provideComponents(),
    ...props.components
  }, {Card, CardGroup} = _components;
  if (!Card) _missingMdxReference("Card", true);
  if (!CardGroup) _missingMdxReference("CardGroup", true);
  return <CardGroup cols={2}><Card title="B2B Payments" icon="building"><_components.p>{"Pay vendors and counterparties without broadcasting your supplier list to the public chain, and bundle each payment atomically with other onchain actions in a single transaction."}</_components.p></Card><Card title="Payroll & Payouts" icon="money-check-dollar"><_components.p>{"Run onchain payroll without publishing what every employee or contractor earns, routing all funds through one ledger contract with encrypted deposit addresses instead of managing a receive address per recipient."}</_components.p></Card><Card title="Treasury Operations" icon="vault"><_components.p>{"Move stablecoin balances between corporate accounts, custodians, and counterparties privately, with the option to self-custody funds in a dedicated ledger contract you control."}</_components.p></Card><Card title="Stablecoin Issuer Corridors" icon="coins"><_components.p>{"Issue and settle a stablecoin where individual balances and flows are not publicly observable, composing issuance and settlement with other onchain actions in one transaction."}</_components.p></Card><Card title="Cross-Border Remittance" icon="globe"><_components.p>{"Run KYC-gated corridors where the sender, recipient, and amount are not exposed to the world, gated by your own KYC program so only your customers' funds move through the ledger."}</_components.p></Card><Card title="Brokerage & Settlement" icon="scale-balanced"><_components.p>{"Settle between disclosed counterparties without broadcasting trade flow or position information, bundling settlement with another onchain action such as a swap in a single transaction."}</_components.p></Card></CardGroup>;
}
export function CardGroup_1(props = {}) {
  const {wrapper: MDXLayout} = {
    ..._provideComponents(),
    ...props.components
  };
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
