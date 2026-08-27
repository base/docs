import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { required } from "../shared/env.js";

export const account = privateKeyToAccount(required("PRIVATE_KEY") as `0x${string}`);
export const publicClient = createPublicClient({ chain: base, transport: http("https://mainnet.base.org") });
export const walletClient = createWalletClient({ account, chain: base, transport: http("https://mainnet.base.org") });
