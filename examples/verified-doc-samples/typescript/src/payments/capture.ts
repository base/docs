import { parseSignature } from "viem";
import { account, publicClient, walletClient } from "../shared/clients.js";
import { USDC, usdcAbi, type StoredAuthorization } from "./usdc.js";

// docs:start usdc-capture-ts
export async function captureAuthorization(stored: StoredAuthorization) {
  const { authorization, signature } = stored;
  if (authorization.to.toLowerCase() !== account.address.toLowerCase()) {
    throw new Error("The connected merchant is not the authorized recipient");
  }
  const [used, balance] = await Promise.all([
    publicClient.readContract({
      address: USDC,
      abi: usdcAbi,
      functionName: "authorizationState",
      args: [authorization.from, authorization.nonce],
    }),
    publicClient.readContract({
      address: USDC,
      abi: usdcAbi,
      functionName: "balanceOf",
      args: [authorization.from],
    }),
  ]);
  if (used) throw new Error("Authorization was already used or canceled");
  if (balance < authorization.value) throw new Error("Payer balance is too low");

  const { v, r, s } = parseSignature(signature);
  const simulation = await publicClient.simulateContract({
    account,
    address: USDC,
    abi: usdcAbi,
    functionName: "receiveWithAuthorization",
    args: [
      authorization.from,
      authorization.to,
      authorization.value,
      authorization.validAfter,
      authorization.validBefore,
      authorization.nonce,
      Number(v),
      r,
      s,
    ],
  });
  const hash = await walletClient.writeContract(simulation.request);
  return publicClient.waitForTransactionReceipt({ hash, confirmations: 2 });
}
// docs:end usdc-capture-ts
