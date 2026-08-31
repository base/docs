import { hexToString, parseAbiItem, type Address, type Hex } from "viem";
import { publicClient } from "../shared/clients.js";

const transferEvent = parseAbiItem("event Transfer(address indexed from,address indexed to,uint256 amount)");
const memoEvent = parseAbiItem("event Memo(address indexed caller,bytes32 indexed memo)");

// docs:start reconcile-payments-ts
export async function buildSettlementReport(
  token: Address,
  merchant: Address,
  fromBlock: bigint,
  toBlock: bigint,
) {
  const [incoming, outgoing, memos] = await Promise.all([
    publicClient.getLogs({ address: token, event: transferEvent, args: { to: merchant }, fromBlock, toBlock, strict: true }),
    publicClient.getLogs({ address: token, event: transferEvent, args: { from: merchant }, fromBlock, toBlock, strict: true }),
    publicClient.getLogs({ address: token, event: memoEvent, fromBlock, toBlock, strict: true }),
  ]);
  const memoByTransfer = new Map<string, Hex>();
  for (const log of memos) {
    if (!log.transactionHash || log.logIndex === null) continue;
    memoByTransfer.set(`${log.transactionHash}:${log.logIndex - 1}`, log.args.memo);
  }

  const transfers = new Map(
    [...incoming, ...outgoing].map((log) => [`${log.transactionHash}:${log.logIndex}`, log]),
  );
  return [...transfers.values()]
    .sort((a, b) => Number(a.blockNumber - b.blockNumber) || a.logIndex - b.logIndex)
    .map((log) => {
      if (!log.transactionHash) throw new Error("Expected a mined log");
      const memo = memoByTransfer.get(`${log.transactionHash}:${log.logIndex}`);
      return {
        transactionHash: log.transactionHash,
        logIndex: log.logIndex,
        direction: log.args.to.toLowerCase() === merchant.toLowerCase() ? "capture" : "outgoing",
        counterparty: log.args.to.toLowerCase() === merchant.toLowerCase() ? log.args.from : log.args.to,
        amount: log.args.amount,
        reference: memo ? hexToString(memo, { size: 32 }).replace(/\0+$/, "") : undefined,
      };
    });
}
// docs:end reconcile-payments-ts
