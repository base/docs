// docs:start defi-borrow-morpho
import { publicClient, walletClient } from './clients.js';
import { type MarketId } from '@morpho-org/blue-sdk';
import { fetchMarketParams } from '@morpho-org/blue-sdk-viem';
import {
  isRequirementSignature,
  morphoViemExtension,
} from '@morpho-org/morpho-sdk';
import { parseUnits } from 'viem';
import { base } from 'viem/chains';

const marketId =
  '0x8793cf302b8ffd655ab97bd1c695dbd967807e8367a65cb2f4edaf1380ba1bda' as MarketId;
const user = walletClient.account.address;
const client = publicClient.extend(morphoViemExtension());
const params = await fetchMarketParams(marketId, publicClient);
const market = client.morpho.blue(params, base.id);
const positionData = await market.getPositionData(user);
const action = market.supplyCollateralBorrow({
  amount: parseUnits('2', 18),
  borrowAmount: parseUnits('2000', 6),
  userAddress: user,
  positionData,
});

const signatures = [];
for (const requirement of await action.getRequirements()) {
  if (isRequirementSignature(requirement)) {
    signatures.push(await requirement.sign(walletClient, user));
  } else {
    const hash = await walletClient.sendTransaction(requirement);
    await publicClient.waitForTransactionReceipt({ hash });
  }
}
const request = action.buildTx(signatures);
await publicClient.call({ account: user, ...request });
const hash = await walletClient.sendTransaction(request);
await publicClient.waitForTransactionReceipt({ hash });
// docs:end defi-borrow-morpho
