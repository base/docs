// docs:start stablecoin-create-ts
import { encodeAbiParameters, encodeFunctionData, keccak256, parseAbiParameters, parseEventLogs, stringToBytes } from "viem";
import { account } from "../../shared/clients.js";
import { B20_FACTORY, b20Abi, factoryAbi, role } from "../abi.js";
import { sendContract } from "../write.js";

export async function createStablecoin() {
  const salt = keccak256(stringToBytes("merchant-usd-v1"));
  const params = encodeAbiParameters(
    parseAbiParameters(
      "(uint8 version,string name,string symbol,address initialAdmin,string currency)",
    ),
    [{ version: 1, name: "Merchant USD", symbol: "MUSD", initialAdmin: account.address, currency: "USD" }],
  );
  const initCalls = [
    encodeFunctionData({
      abi: b20Abi,
      functionName: "grantRole",
      args: [role("MINT_ROLE"), account.address],
    }),
    encodeFunctionData({
      abi: b20Abi,
      functionName: "updateSupplyCap",
      args: [10_000_000n * 10n ** 6n],
    }),
  ];
  const receipt = await sendContract({
    address: B20_FACTORY,
    abi: factoryAbi,
    functionName: "createB20",
    args: [1, salt, params, initCalls],
  });
  const [created] = parseEventLogs({ abi: factoryAbi, logs: receipt.logs, eventName: "B20Created" });
  return created.args.token;
}
// docs:end stablecoin-create-ts
