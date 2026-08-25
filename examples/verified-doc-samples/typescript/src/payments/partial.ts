import { parseSignature, parseUnits, stringToHex, type Address, type Hex } from "viem";
import { baseSepolia } from "viem/chains";
import { account, publicClient, walletClient as merchantWallet } from "../shared/clients.js";
import { browserClients } from "./from-humans.js";
import { USDC, permitTypes, usdcAbi } from "./usdc.js";

const checkoutAbi = [
  {
    type: "function",
    name: "capture",
    stateMutability: "nonpayable",
    inputs: [
      { name: "orderId", type: "bytes32" },
      { name: "payer", type: "address" },
      { name: "actualAmount", type: "uint256" },
      { name: "authorizedMaximum", type: "uint256" },
      { name: "permitDeadline", type: "uint256" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;

type VariablePayment = {
  orderId: Hex;
  payer: Address;
  maximum: bigint;
  deadline: bigint;
  signature: Hex;
};

// docs:start usdc-variable-payment-ts
export async function authorizeVariablePayment(
  checkout: Address,
  orderId: string,
  maximum: string,
): Promise<VariablePayment> {
  const { account: payer, publicClient: browserClient, walletClient } = await browserClients();
  const [name, version, nonce] = await Promise.all([
    browserClient.readContract({ address: USDC, abi: usdcAbi, functionName: "name" }),
    browserClient.readContract({ address: USDC, abi: usdcAbi, functionName: "version" }),
    browserClient.readContract({ address: USDC, abi: usdcAbi, functionName: "nonces", args: [payer] }),
  ]);
  const value = parseUnits(maximum, 6);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 15 * 60);
  const signature = await walletClient.signTypedData({
    account: payer,
    domain: { name, version, chainId: baseSepolia.id, verifyingContract: USDC },
    types: permitTypes,
    primaryType: "Permit",
    message: { owner: payer, spender: checkout, value, nonce, deadline },
  });
  return { orderId: stringToHex(orderId, { size: 32 }), payer, maximum: value, deadline, signature };
}

export async function captureVariablePayment(
  checkout: Address,
  payment: VariablePayment,
  actual: string,
) {
  const actualAmount = parseUnits(actual, 6);
  if (actualAmount > payment.maximum) throw new Error("Actual amount exceeds the signed maximum");
  const { v, r, s } = parseSignature(payment.signature);
  const simulation = await publicClient.simulateContract({
    account,
    address: checkout,
    abi: checkoutAbi,
    functionName: "capture",
    args: [payment.orderId, payment.payer, actualAmount, payment.maximum, payment.deadline, Number(v), r, s],
  });
  const hash = await merchantWallet.writeContract(simulation.request);
  return publicClient.waitForTransactionReceipt({ hash, confirmations: 2 });
}
// docs:end usdc-variable-payment-ts
