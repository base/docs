// docs:start defi-borrow-moonwell
import { publicClient, walletClient } from './clients.js';
import { createMoonwellClient } from '@moonwell-fi/moonwell-sdk';
import { parseAbi, parseUnits } from 'viem';

const env = createMoonwellClient({
  networks: { base: { rpcUrls: ['https://mainnet.base.org'] } },
}).environments.base;
const weth = env.tokens.WETH.address;
const mWeth = env.tokens.MOONWELL_ETH.address;
const mUsdc = env.tokens.MOONWELL_USDC.address;
const comptroller = env.contracts.comptroller.address;
const user = walletClient.account;

const erc20Abi = parseAbi(['function approve(address,uint256) returns (bool)']);
const marketAbi = parseAbi([
  'function mint(uint256) returns (uint256)',
  'function borrow(uint256) returns (uint256)',
]);
const comptrollerAbi = parseAbi([
  'function enterMarkets(address[]) returns (uint256[])',
]);

const approval = await publicClient.simulateContract({
  account: user, address: weth, abi: erc20Abi, functionName: 'approve',
  args: [mWeth, parseUnits('2', 18)],
});
await publicClient.waitForTransactionReceipt({
  hash: await walletClient.writeContract(approval.request),
});

const supplied = await publicClient.simulateContract({
  account: user, address: mWeth, abi: marketAbi, functionName: 'mint',
  args: [parseUnits('2', 18)],
});
if (supplied.result !== 0n) throw new Error(`Moonwell error ${supplied.result}`);
await publicClient.waitForTransactionReceipt({
  hash: await walletClient.writeContract(supplied.request),
});

const entered = await publicClient.simulateContract({
  account: user, address: comptroller, abi: comptrollerAbi,
  functionName: 'enterMarkets', args: [[mWeth]],
});
if (entered.result.some((code) => code !== 0n)) throw new Error('enterMarkets failed');
await publicClient.waitForTransactionReceipt({
  hash: await walletClient.writeContract(entered.request),
});

const loan = await publicClient.simulateContract({
  account: user, address: mUsdc, abi: marketAbi, functionName: 'borrow',
  args: [parseUnits('2000', 6)],
});
if (loan.result !== 0n) throw new Error(`Moonwell error ${loan.result}`);
await publicClient.waitForTransactionReceipt({
  hash: await walletClient.writeContract(loan.request),
});
// docs:end defi-borrow-moonwell
