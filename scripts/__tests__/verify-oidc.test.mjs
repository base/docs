import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  ISSUER,
  JWKS_URL,
  OidcVerificationError,
  fetchGithubJwks,
  parseJwt,
  pickClaims,
  verifyOidcToken,
} from "../verify-oidc.mjs";

const NOW = 2_000_000_000;
const AUDIENCE = "docs-sync:base/docs";
const REPOSITORY = "base/base-std";
const KID = "test-rsa-key";

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicJwk = {
  ...publicKey.export({ format: "jwk" }),
  kid: KID,
  alg: "RS256",
  use: "sig",
  key_ops: ["verify"],
};
const JWKS = { keys: [publicJwk] };

function encode(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function defaultPayload(overrides = {}) {
  return {
    iss: ISSUER,
    aud: AUDIENCE,
    repository: REPOSITORY,
    repository_owner: "base",
    workflow_ref: `${REPOSITORY}/.github/workflows/docs-pr-dispatch.yml@refs/heads/main`,
    iat: NOW - 30,
    exp: NOW + 600,
    ...overrides,
  };
}

function makeToken({ header = {}, payload = {}, signingKey = privateKey } = {}) {
  const encodedHeader = encode({ alg: "RS256", kid: KID, typ: "JWT", ...header });
  const encodedPayload = encode(defaultPayload(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = sign("RSA-SHA256", Buffer.from(signingInput, "ascii"), signingKey)
    .toString("base64url");
  return `${signingInput}.${signature}`;
}

async function expectCode(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof OidcVerificationError);
    assert.equal(error.code, code);
    return true;
  });
}

function verify(token, overrides = {}) {
  return verifyOidcToken({
    token,
    expectedAudience: AUDIENCE,
    expectedRepository: REPOSITORY,
    requireMainWorkflow: true,
    jwks: JWKS,
    nowSeconds: NOW,
    ...overrides,
  });
}

test("accepts a valid GitHub-style token", async () => {
  const result = await verify(makeToken());
  assert.equal(result.payload.repository, REPOSITORY);
  assert.equal(result.protectedHeader.kid, KID);
  assert.equal(result.ageSeconds, 30);
  assert.equal(pickClaims(result.payload).repository_owner, "base");
});

test("accepts an audience array containing the expected audience", async () => {
  await verify(makeToken({ payload: { aud: ["another-audience", AUDIENCE] } }));
});

test("rejects malformed JWT shapes and encodings", async () => {
  await expectCode(verify("not-a-jwt"), "malformed_token");
  assert.throws(() => parseJwt("a.b.="), (error) => error.code === "malformed_token");
});

test("rejects non-RS256 algorithms before key verification", async () => {
  await expectCode(verify(makeToken({ header: { alg: "none" } })), "unsupported_algorithm");
});

test("rejects a missing kid", async () => {
  const token = makeToken({ header: { kid: "" } });
  await expectCode(verify(token), "malformed_token");
});

test("rejects tampered signatures", async () => {
  const token = makeToken();
  const [header, payload, signature] = token.split(".");
  const changedPayload = encode({ ...defaultPayload(), repository: "attacker/base-std" });
  await expectCode(verify(`${header}.${changedPayload}.${signature}`), "signature_invalid");
});

test("rejects unknown, duplicate, and incompatible signing keys", async () => {
  await expectCode(
    verify(makeToken(), { jwks: { keys: [{ ...publicJwk, kid: "different" }] } }),
    "unknown_signing_key",
  );
  await expectCode(
    verify(makeToken(), { jwks: { keys: [publicJwk, { ...publicJwk }] } }),
    "ambiguous_signing_key",
  );
  await expectCode(
    verify(makeToken(), { jwks: { keys: [{ ...publicJwk, kty: "EC" }] } }),
    "unsupported_signing_key",
  );
});

test("rejects wrong issuer, audience, and repository claims", async () => {
  await expectCode(
    verify(makeToken({ payload: { iss: "https://issuer.example" } })),
    "claim_validation_failed",
  );
  await expectCode(
    verify(makeToken({ payload: { aud: "docs-sync:other/docs" } })),
    "claim_validation_failed",
  );
  await expectCode(
    verify(makeToken({ payload: { repository: "attacker/base-std" } })),
    "repository_mismatch",
  );
});

test("requires numeric exp and iat claims", async () => {
  await expectCode(
    verify(makeToken({ payload: { exp: undefined } })),
    "claim_validation_failed",
  );
  await expectCode(
    verify(makeToken({ payload: { iat: "not-a-number" } })),
    "claim_validation_failed",
  );
});

test("rejects expired and not-yet-active tokens", async () => {
  await expectCode(
    verify(makeToken({ payload: { exp: NOW } })),
    "claim_validation_failed",
  );
  await expectCode(
    verify(makeToken({ payload: { nbf: NOW + 1 } })),
    "claim_validation_failed",
  );
});

test("enforces issue-time future tolerance and replay-age limit", async () => {
  await expectCode(
    verify(makeToken({ payload: { iat: NOW + 31 } })),
    "iat_in_future",
  );
  await expectCode(
    verify(makeToken({ payload: { iat: NOW - 601 } })),
    "token_too_old",
  );
});

test("enforces the expected main-branch workflow_ref", async () => {
  await expectCode(
    verify(makeToken({
      payload: {
        workflow_ref: `${REPOSITORY}/.github/workflows/docs-pr-dispatch.yml@refs/heads/feature`,
      },
    })),
    "workflow_ref_not_on_main",
  );
  await expectCode(
    verify(makeToken({
      payload: {
        workflow_ref: `${REPOSITORY}/.github/workflows/nested/dispatch.yml@refs/heads/main`,
      },
    })),
    "workflow_ref_not_on_main",
  );
});

test("can omit the optional workflow_ref policy", async () => {
  await verify(makeToken({ payload: { workflow_ref: undefined } }), {
    requireMainWorkflow: false,
  });
});

test("fetchGithubJwks uses the fixed GitHub endpoint and strict fetch options", async () => {
  let call;
  const result = await fetchGithubJwks({
    fetchImpl: async (url, options) => {
      call = { url, options };
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(JWKS),
      };
    },
  });
  assert.equal(call.url, JWKS_URL);
  assert.equal(call.options.method, "GET");
  assert.equal(call.options.redirect, "error");
  assert.equal(call.options.headers.Accept, "application/json");
  assert.ok(call.options.signal instanceof AbortSignal);
  assert.deepEqual(result, JWKS);
});

test("fetchGithubJwks fails closed on network, HTTP, and body errors", async () => {
  await expectCode(
    fetchGithubJwks({ fetchImpl: async () => { throw new Error("offline"); } }),
    "jwks_fetch_failed",
  );
  await expectCode(
    fetchGithubJwks({
      fetchImpl: async () => ({ ok: false, status: 503, text: async () => "" }),
    }),
    "jwks_fetch_failed",
  );
  await expectCode(
    fetchGithubJwks({
      fetchImpl: async () => ({ ok: true, status: 200, text: async () => "not-json" }),
    }),
    "jwks_invalid",
  );
});
