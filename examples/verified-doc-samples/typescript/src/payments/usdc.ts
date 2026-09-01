import { parseAbi, type Address, type Hex } from "viem";

export const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7c" as const;

export const usdcAbi = parseAbi([
  "function name() view returns (string)",
  "function version() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function nonces(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function authorizationState(address,bytes32) view returns (bool)",
  "function receiveWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)",
  "function cancelAuthorization(address,bytes32,uint8,bytes32,bytes32)",
  "function permit(address,address,uint256,uint256,uint8,bytes32,bytes32)",
  "function transfer(address,uint256) returns (bool)",
  "function transferFrom(address,address,uint256) returns (bool)",
  "event Transfer(address indexed from,address indexed to,uint256 amount)",
  "event AuthorizationUsed(address indexed authorizer,bytes32 indexed nonce)",
  "event AuthorizationCanceled(address indexed authorizer,bytes32 indexed nonce)",
]);

export const transferAuthorizationTypes = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

export const cancelAuthorizationTypes = {
  CancelAuthorization: [
    { name: "authorizer", type: "address" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

export const permitTypes = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export type PaymentAuthorization = {
  from: Address;
  to: Address;
  value: bigint;
  validAfter: bigint;
  validBefore: bigint;
  nonce: Hex;
};

export type StoredAuthorization = {
  orderId: string;
  authorization: PaymentAuthorization;
  signature: Hex;
};
