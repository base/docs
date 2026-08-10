// docs:start defi-supply-aave
import { publicClient, walletClient } from './clients.js';
import { AaveV3Base } from '@aave-dao/aave-address-book';
import { parseAbi, parseUnits } from 'viem';

const user = walletClient.account;
const amount = parseUnits('1000', 6);
const erc20Abi = parseAbi(['function approve(address,uint256) returns (bool)']);
const poolAbi = parseAbi([
  'function supply(address,uint256,address,uint16)',
]);

const approval = await publicClient.simulateContract({
  account: user, address: AaveV3Base.ASSETS.USDC.UNDERLYING,
  abi: erc20Abi, functionName: 'approve', args: [AaveV3Base.POOL, amount],
});
await publicClient.waitForTransactionReceipt({
  hash: await walletClient.writeContract(approval.request),
});

const supply = await publicClient.simulateContract({
  account: user, address: AaveV3Base.POOL, abi: poolAbi,
  functionName: 'supply',
  args: [AaveV3Base.ASSETS.USDC.UNDERLYING, amount, user.address, 0],
});
await publicClient.waitForTransactionReceipt({
  hash: await walletClient.writeContract(supply.request),
});
// docs:end defi-supply-aave
