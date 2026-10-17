import test from "node:test";
import assert from "node:assert/strict";
import { isTransientStreamError } from "../llm/client.mjs";

test("isTransientStreamError: mid-stream overload is retried, real failures are not", () => {
  assert.equal(
    isTransientStreamError(new Error('{"type":"error","error":{"type":"overloaded_error","message":"The model stopped sending data. Retry this request."}}')),
    true,
  );
  assert.equal(isTransientStreamError(new Error("LLM gateway returned no text content")), false);
  assert.equal(isTransientStreamError(new Error('{"type":"error","error":{"type":"invalid_request_error"}}')), false);
});
