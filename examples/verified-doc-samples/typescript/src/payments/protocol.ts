import { parseAbi, type Address, type Hex } from "viem";

export const AUTH_CAPTURE_ESCROW = "0xf96815976523E00e65Be8f34cA5e64b4f41EB19c" as const;
export const ERC3009_PAYMENT_COLLECTOR = "0x8612dfdc421f80336cd14E8EF9cb1E765dB5ab88" as const;
export const SPEND_PERMISSION_PAYMENT_COLLECTOR = "0xB508c1C0a13849693DC175307667653C5977a408" as const;
export const OPERATOR_REFUND_COLLECTOR = "0x7a03443724d14798c4AB4622F1DAAcA761Fea486" as const;

export type PaymentInfo = {
  operator: Address;
  payer: Address;
  receiver: Address;
  token: Address;
  maxAmount: bigint;
  preApprovalExpiry: number;
  authorizationExpiry: number;
  refundExpiry: number;
  minFeeBps: number;
  maxFeeBps: number;
  feeReceiver: Address;
  salt: bigint;
};

const paymentInfoComponents = [
  { name: "operator", type: "address" },
  { name: "payer", type: "address" },
  { name: "receiver", type: "address" },
  { name: "token", type: "address" },
  { name: "maxAmount", type: "uint120" },
  { name: "preApprovalExpiry", type: "uint48" },
  { name: "authorizationExpiry", type: "uint48" },
  { name: "refundExpiry", type: "uint48" },
  { name: "minFeeBps", type: "uint16" },
  { name: "maxFeeBps", type: "uint16" },
  { name: "feeReceiver", type: "address" },
  { name: "salt", type: "uint256" },
] as const;

export const authCaptureEscrowAbi = [
  {
    type: "function", name: "getHash", stateMutability: "view",
    inputs: [{ name: "paymentInfo", type: "tuple", components: paymentInfoComponents }],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function", name: "paymentState", stateMutability: "view",
    inputs: [{ name: "paymentInfoHash", type: "bytes32" }],
    outputs: [
      { name: "hasCollectedPayment", type: "bool" },
      { name: "capturableAmount", type: "uint120" },
      { name: "refundableAmount", type: "uint120" },
    ],
  },
  {
    type: "function", name: "charge", stateMutability: "nonpayable",
    inputs: [
      { name: "paymentInfo", type: "tuple", components: paymentInfoComponents },
      { name: "amount", type: "uint256" },
      { name: "tokenCollector", type: "address" },
      { name: "collectorData", type: "bytes" },
      { name: "feeAmount", type: "uint256" },
      { name: "feeReceiver", type: "address" },
    ], outputs: [],
  },
  {
    type: "function", name: "authorize", stateMutability: "nonpayable",
    inputs: [
      { name: "paymentInfo", type: "tuple", components: paymentInfoComponents },
      { name: "amount", type: "uint256" },
      { name: "tokenCollector", type: "address" },
      { name: "collectorData", type: "bytes" },
    ], outputs: [],
  },
  {
    type: "function", name: "capture", stateMutability: "nonpayable",
    inputs: [
      { name: "paymentInfo", type: "tuple", components: paymentInfoComponents },
      { name: "amount", type: "uint256" },
      { name: "feeAmount", type: "uint256" },
      { name: "feeReceiver", type: "address" },
    ], outputs: [],
  },
  {
    type: "function", name: "void", stateMutability: "nonpayable",
    inputs: [{ name: "paymentInfo", type: "tuple", components: paymentInfoComponents }], outputs: [],
  },
  {
    type: "function", name: "reclaim", stateMutability: "nonpayable",
    inputs: [{ name: "paymentInfo", type: "tuple", components: paymentInfoComponents }], outputs: [],
  },
  {
    type: "function", name: "refund", stateMutability: "nonpayable",
    inputs: [
      { name: "paymentInfo", type: "tuple", components: paymentInfoComponents },
      { name: "amount", type: "uint256" },
      { name: "tokenCollector", type: "address" },
      { name: "collectorData", type: "bytes" },
    ], outputs: [],
  },
  {
    type: "event", name: "PaymentCharged", anonymous: false,
    inputs: [
      { name: "paymentInfoHash", type: "bytes32", indexed: true },
      { name: "paymentInfo", type: "tuple", indexed: false, components: paymentInfoComponents },
      { name: "amount", type: "uint256", indexed: false },
      { name: "tokenCollector", type: "address", indexed: false },
      { name: "feeAmount", type: "uint256", indexed: false },
      { name: "feeReceiver", type: "address", indexed: false },
    ],
  },
  {
    type: "event", name: "PaymentAuthorized", anonymous: false,
    inputs: [
      { name: "paymentInfoHash", type: "bytes32", indexed: true },
      { name: "paymentInfo", type: "tuple", indexed: false, components: paymentInfoComponents },
      { name: "amount", type: "uint256", indexed: false },
      { name: "tokenCollector", type: "address", indexed: false },
    ],
  },
  {
    type: "event", name: "PaymentCaptured", anonymous: false,
    inputs: [
      { name: "paymentInfoHash", type: "bytes32", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "feeAmount", type: "uint256", indexed: false },
      { name: "feeReceiver", type: "address", indexed: false },
    ],
  },
  {
    type: "event", name: "PaymentVoided", anonymous: false,
    inputs: [
      { name: "paymentInfoHash", type: "bytes32", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event", name: "PaymentReclaimed", anonymous: false,
    inputs: [
      { name: "paymentInfoHash", type: "bytes32", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event", name: "PaymentRefunded", anonymous: false,
    inputs: [
      { name: "paymentInfoHash", type: "bytes32", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "tokenCollector", type: "address", indexed: false },
    ],
  },
] as const;

export const protocolEventAbi = authCaptureEscrowAbi.filter((item) => item.type === "event");

export const receiveWithAuthorizationTypes = {
  ReceiveWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

export const refundApprovalAbi = parseAbi([
  "function approve(address spender,uint256 amount) returns (bool)",
]);

export type StoredProtocolPayment = {
  orderId: string;
  paymentInfo: PaymentInfo;
  paymentInfoHash: Hex;
  collectorData: Hex;
};
