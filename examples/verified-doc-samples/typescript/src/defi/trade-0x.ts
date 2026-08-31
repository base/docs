// docs:start defi-trade-0x
import { publicClient, walletClient } from './clients.js';
import { formatUnits, parseAbi, parseUnits, type Address, type Hex } from 'viem';
import { required } from '../shared/env.js';

const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const WETH = '0x4200000000000000000000000000000000000006';
const sellAmount = parseUnits('100', 6);
const user = walletClient.account.address;

type Quote = {
  liquidityAvailable: boolean;
  buyAmount: string;
  minBuyAmount: string;
  issues: {
    allowance: null | { spender: Address };
    balance: null | { actual: string; expected: string };
    simulationIncomplete: boolean;
  };
  transaction?: { to: Address; data: Hex; value: string | null };
};

async function getQuote(): Promise<Quote> {
  const params = new URLSearchParams({
    chainId: '8453', sellToken: USDC, buyToken: WETH,
    sellAmount: sellAmount.toString(), taker: user, slippageBps: '50',
  });
  const response = await fetch(
    `https://api.0x.org/swap/allowance-holder/quote?${params}`,
    { headers: { '0x-api-key': required('ZERO_EX_API_KEY'), '0x-version': 'v2' } },
  );
  if (!response.ok) throw new Error(`0x quote failed: ${response.status} ${await response.text()}`);
  return (await response.json()) as Quote;
}

let quote = await getQuote();
if (!quote.liquidityAvailable) throw new Error('No route is currently available');
if (quote.issues.balance) throw new Error('Insufficient USDC balance');

if (quote.issues.allowance) {
  const approval = await publicClient.simulateContract({
    account: user, address: USDC,
    abi: parseAbi(['function approve(address,uint256) returns (bool)']),
    functionName: 'approve', args: [quote.issues.allowance.spender, sellAmount],
  });
  await publicClient.waitForTransactionReceipt({
    hash: await walletClient.writeContract(approval.request),
  });
  quote = await getQuote();
}

if (quote.issues.allowance) throw new Error('Token allowance is still insufficient');
if (quote.issues.simulationIncomplete) throw new Error('0x could not complete its simulation');
if (!quote.transaction) throw new Error('Quote did not include transaction data');

const transaction = {
  account: walletClient.account,
  to: quote.transaction.to,
  data: quote.transaction.data,
  value: BigInt(quote.transaction.value ?? '0'),
};
await publicClient.call({ ...transaction, account: user });
const hash = await walletClient.sendTransaction(transaction);
await publicClient.waitForTransactionReceipt({ hash });

console.log(`Swap confirmed: ${hash}`);
console.log(`Minimum WETH output: ${formatUnits(BigInt(quote.minBuyAmount), 18)} WETH`);
// docs:end defi-trade-0x
