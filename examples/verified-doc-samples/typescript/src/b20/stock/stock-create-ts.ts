// docs:start stock-create-ts
import { encodeAbiParameters, encodeFunctionData, keccak256, parseAbiParameters, parseEventLogs, stringToBytes } from "viem";
import { account } from "../../shared/clients.js";
import { B20_FACTORY, b20Abi, factoryAbi, role } from "../abi.js";
import { sendContract } from "../write.js";

export async function createStockToken() {
  const salt = keccak256(stringToBytes("example-class-a-v1"));
  const params = encodeAbiParameters(
    parseAbiParameters("(uint8 version,string name,string symbol,address initialAdmin,uint8 decimals)"),
    [{ version: 1, name: "Example Corp Class A", symbol: "EXM", initialAdmin: account.address, decimals: 6 }],
  );
  const initCalls = ["MINT_ROLE", "BURN_BLOCKED_ROLE", "PAUSE_ROLE", "UNPAUSE_ROLE", "OPERATOR_ROLE"].map(
    (name) => encodeFunctionData({ abi: b20Abi, functionName: "grantRole", args: [role(name), account.address] }),
  );
  const receipt = await sendContract({ address: B20_FACTORY, abi: factoryAbi, functionName: "createB20", args: [0, salt, params, initCalls] });
  const [created] = parseEventLogs({ abi: factoryAbi, logs: receipt.logs, eventName: "B20Created" });
  return created.args.token;
}
// docs:end stock-create-ts
