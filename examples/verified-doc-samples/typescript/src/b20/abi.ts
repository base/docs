import { keccak256, parseAbi, stringToBytes } from "viem";

export const B20_FACTORY = "0xB20f000000000000000000000000000000000000" as const;
export const POLICY_REGISTRY = "0x8453000000000000000000000000000000000002" as const;

export const b20Abi = parseAbi([
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function mint(address,uint256)",
  "function mintWithMemo(address,uint256,bytes32)",
  "function burn(uint256)",
  "function burnWithMemo(uint256,bytes32)",
  "function burnBlocked(address,uint256)",
  "function transferWithMemo(address,uint256,bytes32) returns (bool)",
  "function transferFromWithMemo(address,address,uint256,bytes32) returns (bool)",
  "function updateSupplyCap(uint256)",
  "function supplyCap() view returns (uint256)",
  "function updatePolicy(bytes32,uint64)",
  "function policyId(bytes32) view returns (uint64)",
  "function pause(uint8[])",
  "function unpause(uint8[])",
  "function isPaused(uint8) view returns (bool)",
  "function grantRole(bytes32,address)",
  "event Transfer(address indexed from,address indexed to,uint256 amount)",
  "event Memo(address indexed caller,bytes32 indexed memo)",
]);

const assetExtraAbi = parseAbi([
  "function batchMint(address[],uint256[])",
  "function announce(bytes[],string,string,string)",
  "function isAnnouncementIdUsed(string) view returns (bool)",
  "function updateMultiplier(uint256)",
  "function multiplier() view returns (uint256)",
  "function scaledBalanceOf(address) view returns (uint256)",
]);

export const assetAbi = [...b20Abi, ...assetExtraAbi] as const;

export const factoryAbi = parseAbi([
  "function createB20(uint8,bytes32,bytes,bytes[]) payable returns (address)",
  "function getB20Address(uint8,address,bytes32) view returns (address)",
  "event B20Created(address indexed token,uint8 indexed variant,string name,string symbol,uint8 decimals,bytes variantEventParams)",
]);

export const policyRegistryAbi = parseAbi([
  "function createPolicy(address,uint8) returns (uint64)",
  "function createPolicyWithAccounts(address,uint8,address[]) returns (uint64)",
  "function updateAllowlist(uint64,bool,address[])",
  "function updateBlocklist(uint64,bool,address[])",
  "function isAuthorized(uint64,address) view returns (bool)",
  "function policyExists(uint64) view returns (bool)",
  "event PolicyCreated(uint64 indexed policyId,address indexed creator,uint8 policyType)",
]);

export const role = (name: string) => keccak256(stringToBytes(name));
export const scope = role;
