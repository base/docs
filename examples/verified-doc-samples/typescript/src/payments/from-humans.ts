import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseAbi,
  parseEventLogs,
  parseUnits,
  stringToHex,
  type Address,
  type EIP1193Provider,
} from "viem";
import { baseSepolia } from "viem/chains";

const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7c" as const;
const erc20Abi = parseAbi([
  "function transfer(address,uint256) returns (bool)",
  "event Transfer(address indexed from,address indexed to,uint256 amount)",
]);
const b20PaymentAbi = parseAbi([
  "function transferWithMemo(address,uint256,bytes32) returns (bool)",
  "event Transfer(address indexed from,address indexed to,uint256 amount)",
  "event Memo(address indexed caller,bytes32 indexed memo)",
]);

export async function browserClients() {
  const provider = window.ethereum as EIP1193Provider | undefined;
  if (!provider) throw new Error("Install an EIP-1193 wallet");
  const [account] = await createWalletClient({ chain: baseSepolia, transport: custom(provider) }).requestAddresses();
  return {
    account,
    publicClient: createPublicClient({ chain: baseSepolia, transport: http() }),
    walletClient: createWalletClient({ account, chain: baseSepolia, transport: custom(provider) }),
  };
}

// docs:start usdc-accept-ts
export async function sendUsdc(merchant: Address) {
  const { account, publicClient, walletClient } = await browserClients();
  const simulation = await publicClient.simulateContract({
    account,
    address: USDC,
    abi: erc20Abi,
    functionName: "transfer",
    args: [merchant, parseUnits("5", 6)],
  });
  const hash = await walletClient.writeContract(simulation.request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("USDC transfer reverted");
  return hash;
}
// docs:end usdc-accept-ts

// docs:start b20-accept-ts
export async function sendB20WithMemo(token: Address, merchant: Address) {
  const { account, publicClient, walletClient } = await browserClients();
  const memo = stringToHex("order-8842", { size: 32 });
  const simulation = await publicClient.simulateContract({
    account,
    address: token,
    abi: b20PaymentAbi,
    functionName: "transferWithMemo",
    args: [merchant, parseUnits("25", 6), memo],
  });
  const hash = await walletClient.writeContract(simulation.request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const events = parseEventLogs({ abi: b20PaymentAbi, logs: receipt.logs, strict: true });
  if (events[0]?.eventName !== "Transfer" || events[1]?.eventName !== "Memo") {
    throw new Error("Expected adjacent Transfer and Memo events");
  }
  return hash;
}
// docs:end b20-accept-ts

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}
