import { parseSignature, type Hex } from "viem";
import { baseSepolia } from "viem/chains";
import { account, publicClient, walletClient as merchantWallet } from "../shared/clients.js";
import { browserClients } from "./from-humans.js";
import { USDC, cancelAuthorizationTypes, usdcAbi, type PaymentAuthorization } from "./usdc.js";

// docs:start usdc-void-ts
export async function signCancellation(authorization: PaymentAuthorization) {
  const { account: buyer, publicClient: browserClient, walletClient } = await browserClients();
  if (buyer.toLowerCase() !== authorization.from.toLowerCase()) {
    throw new Error("Only the authorizer can sign a cancellation");
  }
  const [name, version] = await Promise.all([
    browserClient.readContract({ address: USDC, abi: usdcAbi, functionName: "name" }),
    browserClient.readContract({ address: USDC, abi: usdcAbi, functionName: "version" }),
  ]);
  return walletClient.signTypedData({
    account: buyer,
    domain: { name, version, chainId: baseSepolia.id, verifyingContract: USDC },
    types: cancelAuthorizationTypes,
    primaryType: "CancelAuthorization",
    message: { authorizer: authorization.from, nonce: authorization.nonce },
  });
}

export async function submitCancellation(authorizer: `0x${string}`, nonce: Hex, signature: Hex) {
  const { v, r, s } = parseSignature(signature);
  const simulation = await publicClient.simulateContract({
    account,
    address: USDC,
    abi: usdcAbi,
    functionName: "cancelAuthorization",
    args: [authorizer, nonce, Number(v), r, s],
  });
  const hash = await merchantWallet.writeContract(simulation.request);
  return publicClient.waitForTransactionReceipt({ hash, confirmations: 2 });
}
// docs:end usdc-void-ts
