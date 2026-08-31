import { bytesToHex, parseUnits, type Address } from "viem";
import { baseSepolia } from "viem/chains";
import { browserClients } from "./from-humans.js";
import { USDC, transferAuthorizationTypes, usdcAbi, type StoredAuthorization } from "./usdc.js";

// docs:start usdc-authorize-ts
export async function authorizePayment(
  merchant: Address,
  orderId: string,
  amount: string,
): Promise<StoredAuthorization> {
  const { account, publicClient, walletClient } = await browserClients();
  const [name, version] = await Promise.all([
    publicClient.readContract({ address: USDC, abi: usdcAbi, functionName: "name" }),
    publicClient.readContract({ address: USDC, abi: usdcAbi, functionName: "version" }),
  ]);
  const now = BigInt(Math.floor(Date.now() / 1000));
  const authorization = {
    from: account,
    to: merchant,
    value: parseUnits(amount, 6),
    validAfter: now - 60n,
    validBefore: now + 15n * 60n,
    nonce: bytesToHex(crypto.getRandomValues(new Uint8Array(32))),
  } as const;
  const signature = await walletClient.signTypedData({
    account,
    domain: { name, version, chainId: baseSepolia.id, verifyingContract: USDC },
    types: transferAuthorizationTypes,
    primaryType: "TransferWithAuthorization",
    message: authorization,
  });
  return { orderId, authorization, signature };
}
// docs:end usdc-authorize-ts
