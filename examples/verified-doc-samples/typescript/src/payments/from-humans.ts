import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  keccak256,
  parseUnits,
  stringToBytes,
  zeroAddress,
  type Address,
  type EIP1193Provider,
} from "viem";
import { baseSepolia } from "viem/chains";
import { account, publicClient, walletClient as operatorWallet } from "../shared/clients.js";
import {
  AUTH_CAPTURE_ESCROW,
  ERC3009_PAYMENT_COLLECTOR,
  authCaptureEscrowAbi,
  receiveWithAuthorizationTypes,
  type PaymentInfo,
  type StoredProtocolPayment,
} from "./protocol.js";
import { USDC, usdcAbi } from "./usdc.js";

export async function browserClients() {
  const provider = window.ethereum as EIP1193Provider | undefined;
  if (!provider) throw new Error("Install an EIP-1193 wallet");
  const [payer] = await createWalletClient({ chain: baseSepolia, transport: custom(provider) }).requestAddresses();
  return {
    payer,
    publicClient: createPublicClient({ chain: baseSepolia, transport: http() }),
    walletClient: createWalletClient({ account: payer, chain: baseSepolia, transport: custom(provider) }),
  };
}

export async function prepareErc3009Payment(
  receiver: Address,
  orderId: string,
  amount: string,
): Promise<StoredProtocolPayment> {
  const { payer, publicClient: browserClient, walletClient } = await browserClients();
  const value = parseUnits(amount, 6);
  const now = Math.floor(Date.now() / 1000);
  const paymentInfo: PaymentInfo = {
    operator: account.address,
    payer,
    receiver,
    token: USDC,
    maxAmount: value,
    preApprovalExpiry: now + 15 * 60,
    authorizationExpiry: now + 7 * 24 * 60 * 60,
    refundExpiry: now + 45 * 24 * 60 * 60,
    minFeeBps: 0,
    maxFeeBps: 0,
    feeReceiver: zeroAddress,
    salt: BigInt(keccak256(stringToBytes(`${orderId}:${crypto.randomUUID()}`))),
  };
  const payerAgnosticHash = await browserClient.readContract({
    address: AUTH_CAPTURE_ESCROW,
    abi: authCaptureEscrowAbi,
    functionName: "getHash",
    args: [{ ...paymentInfo, payer: zeroAddress }],
  });
  const [name, version] = await Promise.all([
    browserClient.readContract({ address: USDC, abi: usdcAbi, functionName: "name" }),
    browserClient.readContract({ address: USDC, abi: usdcAbi, functionName: "version" }),
  ]);
  const collectorData = await walletClient.signTypedData({
    account: payer,
    domain: { name, version, chainId: baseSepolia.id, verifyingContract: USDC },
    types: receiveWithAuthorizationTypes,
    primaryType: "ReceiveWithAuthorization",
    message: {
      from: payer,
      to: ERC3009_PAYMENT_COLLECTOR,
      value,
      validAfter: 0n,
      validBefore: BigInt(paymentInfo.preApprovalExpiry),
      nonce: payerAgnosticHash,
    },
  });
  const paymentInfoHash = await browserClient.readContract({
    address: AUTH_CAPTURE_ESCROW,
    abi: authCaptureEscrowAbi,
    functionName: "getHash",
    args: [paymentInfo],
  });
  return { orderId, paymentInfo, paymentInfoHash, collectorData };
}

// docs:start usdc-accept-ts
export async function requestPayment(receiver: Address, orderId: string) {
  const payment = await prepareErc3009Payment(receiver, orderId, "5.00");
  const simulation = await publicClient.simulateContract({
    account,
    address: AUTH_CAPTURE_ESCROW,
    abi: authCaptureEscrowAbi,
    functionName: "charge",
    args: [
      payment.paymentInfo,
      payment.paymentInfo.maxAmount,
      ERC3009_PAYMENT_COLLECTOR,
      payment.collectorData,
      0n,
      zeroAddress,
    ],
  });
  const hash = await operatorWallet.writeContract(simulation.request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 2 });
  if (receipt.status !== "success") throw new Error("Payment charge reverted");
  return { hash, paymentInfoHash: payment.paymentInfoHash };
}
// docs:end usdc-accept-ts

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}
