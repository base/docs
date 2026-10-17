import test from "node:test";
import assert from "node:assert/strict";
import { manifestChangesSignatures, restoreCodeSamples } from "../release-utils.mjs";

const page = (fn, prose = "Send payouts.", diagram = "A-->B") => [
  "# Send a payout",
  "",
  prose,
  "",
  "```ts",
  "const simulation = await publicClient.simulateContract({",
  `  functionName: "${fn}",`,
  "});",
  "```",
  "",
  "```mermaid",
  `flowchart TD`,
  `  ${diagram}`,
  "```",
  "",
].join("\n");

test("restoreCodeSamples: reverts a changed sample, keeps prose and diagram edits", () => {
  const current = page("sendPayouts");
  const updated = page("simulateContract", "Send payouts. Recipients cannot be the token itself.", "A-->C");
  const r = restoreCodeSamples(current, updated);
  assert.equal(r.restored, 1);
  assert.equal(r.content, page("sendPayouts", "Send payouts. Recipients cannot be the token itself.", "A-->C"));
});

test("restoreCodeSamples: block count mismatch leaves output alone", () => {
  const current = page("sendPayouts");
  const updated = current + "\n```bash\nnpm i\n```\n";
  const r = restoreCodeSamples(current, updated);
  assert.equal(r.mismatched, true);
  assert.equal(r.content, updated);
});

test("manifestChangesSignatures", () => {
  assert.equal(manifestChangesSignatures([{ kind: "revert_added" }]), false);
  assert.equal(manifestChangesSignatures([{ kind: "signature_change" }]), true);
});

test("normalizeForNoop: table re-padding is a noop, a cell edit is not", async () => {
  const { normalizeForNoop } = await import("../release-utils.mjs");
  const a = "| `NotSoleAdmin()`    | renounce while others exist |\n";
  const b = "| `NotSoleAdmin()`                | renounce while others exist |\n";
  const c = "| `NotSoleAdmin()` | renounce while other admins exist |\n";
  assert.equal(normalizeForNoop(a), normalizeForNoop(b));
  assert.notEqual(normalizeForNoop(a), normalizeForNoop(c));
});
