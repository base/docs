// docs:start defi-supply-moonwell
import { publicClient, walletClient } from './clients.js';
import { createMoonwellClient } from '@moonwell-fi/moonwell-sdk';
import { parseAbi, parseUnits } from 'viem';

const moonwell = createMoonwellClient({
  networks: { base: { rpcUrls: ['https://mainnet.base.org'] } },
});
const env = moonwell.environments.base;
const usdc = env.tokens.USDC.address;
const mUsdc = env.tokens.MOONWELL_USDC.address;
const amount = parseUnits('1000', 6);

const erc20Abi = parseAbi(['function approve(address,uint256) returns (bool)']);
const marketAbi = parseAbi(['function mint(uint256) returns (uint256)']);
const approval = await publicClient.simulateContract({
  account: walletClient.account,
  address: usdc, abi: erc20Abi, functionName: 'approve', args: [mUsdc, amount],
});
await publicClient.waitForTransactionReceipt({
  hash: await walletClient.writeContract(approval.request),
});

const supply = await publicClient.simulateContract({
  account: walletClient.account,
  address: mUsdc, abi: marketAbi, functionName: 'mint', args: [amount],
});
if (supply.result !== 0n) throw new Error(`Moonwell error code ${supply.result}`);
await publicClient.waitForTransactionReceipt({
  hash: await walletClient.writeContract(supply.request),
});
// docs:end defi-supply-moonwell
