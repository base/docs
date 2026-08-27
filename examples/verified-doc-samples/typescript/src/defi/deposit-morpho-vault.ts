// docs:start defi-deposit-morpho-vault
import { publicClient, walletClient } from './clients.js';
import {
  isRequirementSignature,
  morphoViemExtension,
} from '@morpho-org/morpho-sdk';
import { parseUnits } from 'viem';
import { base } from 'viem/chains';

const vaultAddress = '0xBEeF0e0834849Acc03F0089F01F4F1EeB06873c9';
const user = walletClient.account.address;
const client = publicClient.extend(morphoViemExtension());
const vault = client.morpho.vaultV2(vaultAddress, base.id);
const action = await vault.deposit({
  amount: parseUnits('1000', 6),
  userAddress: user,
  vaultData: await vault.getData(),
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
// docs:end defi-deposit-morpho-vault
