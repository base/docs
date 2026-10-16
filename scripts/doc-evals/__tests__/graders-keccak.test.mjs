import { test } from "node:test";
import assert from "node:assert/strict";

import { keccak256Hex, selectorFromSignature } from "../graders/keccak.mjs";

// Test vectors from scripts/doc-evals/PLAN.md, Lane B section.
test("selectorFromSignature: transfer(address,uint256) -> 0xa9059cbb", () => {
  assert.equal(selectorFromSignature("transfer(address,uint256)"), "0xa9059cbb");
});

test("selectorFromSignature: balanceOf(address) -> 0x70a08231", () => {
  assert.equal(selectorFromSignature("balanceOf(address)"), "0x70a08231");
});

test("keccak256Hex: empty string", () => {
  assert.equal(
    keccak256Hex(""),
    "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
  );
});

test("keccak256Hex accepts raw bytes as well as strings", () => {
  const bytes = new TextEncoder().encode("balanceOf(address)");
  assert.equal(selectorFromSignature("balanceOf(address)"), "0x" + keccak256Hex(bytes).slice(0, 8));
});
