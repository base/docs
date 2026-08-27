// docs:start defi-borrow-aave
import { publicClient, walletClient } from './clients.js';
import { AaveV3Base } from '@aave-dao/aave-address-book';
import { parseAbi, parseUnits } from 'viem';

const user = walletClient.account;
const weth = AaveV3Base.ASSETS.WETH.UNDERLYING;
const usdc = AaveV3Base.ASSETS.USDC.UNDERLYING;
const collateral = parseUnits('2', 18);
const erc20Abi = parseAbi(['function approve(address,uint256) returns (bool)']);
const poolAbi = parseAbi([
  'function supply(address,uint256,address,uint16)',
  'function setUserUseReserveAsCollateral(address,bool)',
  'function borrow(address,uint256,uint256,uint16,address)',
]);

const approval = await publicClient.simulateContract({
  account: user, address: weth, abi: erc20Abi, functionName: 'approve',
  args: [AaveV3Base.POOL, collateral],
});
await publicClient.waitForTransactionReceipt({
  hash: await walletClient.writeContract(approval.request),
});

const supplied = await publicClient.simulateContract({
  account: user, address: AaveV3Base.POOL, abi: poolAbi,
  functionName: 'supply', args: [weth, collateral, user.address, 0],
});
await publicClient.waitForTransactionReceipt({
  hash: await walletClient.writeContract(supplied.request),
});

const enabled = await publicClient.simulateContract({
  account: user, address: AaveV3Base.POOL, abi: poolAbi,
  functionName: 'setUserUseReserveAsCollateral', args: [weth, true],
});
await publicClient.waitForTransactionReceipt({
  hash: await walletClient.writeContract(enabled.request),
});

const loan = await publicClient.simulateContract({
  account: user, address: AaveV3Base.POOL, abi: poolAbi,
  functionName: 'borrow',
  args: [usdc, parseUnits('2000', 6), 2n, 0, user.address],
});
await publicClient.waitForTransactionReceipt({
  hash: await walletClient.writeContract(loan.request),
});
// docs:end defi-borrow-aave
