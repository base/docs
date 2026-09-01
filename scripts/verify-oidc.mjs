#!/usr/bin/env node
/**
 * Verify that a GitHub Actions OIDC token cryptographically attests the source
 * repository named in a docs-sync dispatch.
 *
 * This implementation uses only Node 22 built-ins: `fetch` retrieves GitHub's
 * public JWKS and `node:crypto` verifies the RS256 signature. It deliberately
 * owns the complete validation policy rather than trusting decoded JWT claims.
 *
 * Required environment variables:
 *   OIDC_TOKEN
 *   OIDC_EXPECTED_AUDIENCE
 *   OIDC_EXPECTED_REPOSITORY
 *
 * Optional environment variable:
 *   OIDC_REQUIRE_MAIN_WORKFLOW=true
 *
 * Success writes one JSON object containing the verified claim subset to
 * stdout. All logs go to stderr. Any configuration or verification failure
 * exits with status 1.
 */

import {
  constants as cryptoConstants,
  createPublicKey,
  verify as verifySignature,
} from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ISSUER = "https://token.actions.githubusercontent.com";
export const JWKS_URL = `${ISSUER}/.well-known/jwks`;
export const MAX_TOKEN_AGE_SECONDS = 600;
export const CLOCK_SKEW_SECONDS = 30;
const JWKS_TIMEOUT_MS = 10_000;
const MAX_TOKEN_BYTES = 16_384;
const MAX_JWKS_BYTES = 262_144;
const MAX_JWKS_KEYS = 100;

const PUBLISHED_CLAIMS = [
  "repository",
  "repository_owner",
  "repository_id",
  "ref",
  "sha",
  "workflow_ref",
  "workflow_sha",
  "actor",
  "actor_id",
  "event_name",
  "runner_environment",
  "iat",
  "exp",
  "iss",
  "aud",
];

export class OidcVerificationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "OidcVerificationError";
    this.code = code;
    this.details = details;
  }
}

class OidcConfigError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "OidcConfigError";
    this.code = code;
    this.details = details;
  }
}

function verificationError(code, message, details = {}) {
  throw new OidcVerificationError(code, message, details);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function decodeBase64Url(segment, label) {
  if (typeof segment !== "string" || !/^[A-Za-z0-9_-]+$/.test(segment)) {
    verificationError("malformed_token", `${label} is not valid unpadded base64url`);
  }
  let decoded;
  try {
    decoded = Buffer.from(segment, "base64url");
  } catch {
    verificationError("malformed_token", `${label} could not be decoded`);
  }
  if (decoded.length === 0 || decoded.toString("base64url") !== segment) {
    verificationError("malformed_token", `${label} is not canonical base64url`);
  }
  return decoded;
}

function decodeJsonSegment(segment, label) {
  const decoded = decodeBase64Url(segment, label);
  let value;
  try {
    value = JSON.parse(decoded.toString("utf8"));
  } catch {
    verificationError("malformed_token", `${label} is not valid JSON`);
  }
  if (!isObject(value)) {
    verificationError("malformed_token", `${label} must decode to a JSON object`);
  }
  return value;
}

export function parseJwt(token) {
  if (typeof token !== "string" || token.length === 0) {
    verificationError("malformed_token", "token must be a non-empty string");
  }
  if (Buffer.byteLength(token, "utf8") > MAX_TOKEN_BYTES) {
    verificationError("malformed_token", "token exceeds the maximum size");
  }
  const segments = token.split(".");
  if (segments.length !== 3 || segments.some((segment) => segment.length === 0)) {
    verificationError("malformed_token", "token must contain three non-empty segments");
  }
  const [encodedHeader, encodedPayload, encodedSignature] = segments;
  const protectedHeader = decodeJsonSegment(encodedHeader, "protected header");
  const payload = decodeJsonSegment(encodedPayload, "payload");
  const signature = decodeBase64Url(encodedSignature, "signature");
  return {
    protectedHeader,
    payload,
    signature,
    signingInput: `${encodedHeader}.${encodedPayload}`,
  };
}

export async function fetchGithubJwks({
  fetchImpl = globalThis.fetch,
  timeoutMs = JWKS_TIMEOUT_MS,
} = {}) {
  if (typeof fetchImpl !== "function") {
    verificationError("jwks_fetch_failed", "fetch implementation is unavailable");
  }

  let response;
  try {
    response = await fetchImpl(JWKS_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    verificationError("jwks_fetch_failed", "GitHub JWKS request failed", {
      cause: error?.name || "fetch_error",
    });
  }

  if (!response?.ok) {
    verificationError("jwks_fetch_failed", "GitHub JWKS endpoint returned an error", {
      status: response?.status,
    });
  }

  let text;
  try {
    text = await response.text();
  } catch {
    verificationError("jwks_fetch_failed", "GitHub JWKS response could not be read");
  }
  if (Buffer.byteLength(text, "utf8") > MAX_JWKS_BYTES) {
    verificationError("jwks_invalid", "GitHub JWKS response exceeds the maximum size");
  }

  let jwks;
  try {
    jwks = JSON.parse(text);
  } catch {
    verificationError("jwks_invalid", "GitHub JWKS response is not valid JSON");
  }
  if (
    !isObject(jwks) ||
    !Array.isArray(jwks.keys) ||
    jwks.keys.length === 0 ||
    jwks.keys.length > MAX_JWKS_KEYS
  ) {
    verificationError("jwks_invalid", "GitHub JWKS response has an invalid keys array");
  }
  return jwks;
}

function selectSigningKey(jwks, kid) {
  if (!isObject(jwks) || !Array.isArray(jwks.keys)) {
    verificationError("jwks_invalid", "JWKS must contain a keys array");
  }
  const matches = jwks.keys.filter((key) => isObject(key) && key.kid === kid);
  if (matches.length === 0) {
    verificationError("unknown_signing_key", "no GitHub signing key matches the token kid", { kid });
  }
  if (matches.length !== 1) {
    verificationError("ambiguous_signing_key", "multiple GitHub signing keys match the token kid", { kid });
  }

  const key = matches[0];
  const validKeyOps = key.key_ops === undefined ||
    (Array.isArray(key.key_ops) && key.key_ops.includes("verify"));
  if (
    key.kty !== "RSA" ||
    (key.alg !== undefined && key.alg !== "RS256") ||
    (key.use !== undefined && key.use !== "sig") ||
    !validKeyOps ||
    typeof key.n !== "string" ||
    typeof key.e !== "string"
  ) {
    verificationError("unsupported_signing_key", "matching JWKS key is not an RS256 verification key", {
      kid,
    });
  }
  return key;
}

function numericDate(payload, name, { required = false } = {}) {
  const value = payload[name];
  if (value === undefined && !required) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    verificationError("claim_validation_failed", `${name} must be a numeric date`, { claim: name });
  }
  return value;
}

function audienceMatches(actual, expected) {
  if (typeof actual === "string") return actual === expected;
  if (Array.isArray(actual) && actual.every((value) => typeof value === "string")) {
    return actual.includes(expected);
  }
  return false;
}

function validateClaims({
  payload,
  expectedAudience,
  expectedRepository,
  requireMainWorkflow,
  nowSeconds,
}) {
  if (payload.iss !== ISSUER) {
    verificationError("claim_validation_failed", "issuer claim does not match GitHub Actions", {
      claim: "iss",
    });
  }
  if (!audienceMatches(payload.aud, expectedAudience)) {
    verificationError("claim_validation_failed", "audience claim does not match the docs repository", {
      claim: "aud",
    });
  }

  const exp = numericDate(payload, "exp", { required: true });
  const iat = numericDate(payload, "iat", { required: true });
  const nbf = numericDate(payload, "nbf");
  if (nowSeconds >= exp) {
    verificationError("claim_validation_failed", "token is expired", { claim: "exp" });
  }
  if (nbf !== undefined && nowSeconds < nbf) {
    verificationError("claim_validation_failed", "token is not active yet", { claim: "nbf" });
  }

  const ageSeconds = nowSeconds - iat;
  if (ageSeconds < -CLOCK_SKEW_SECONDS) {
    verificationError("iat_in_future", "token issue time is in the future", {
      iat,
      now: nowSeconds,
      age_seconds: ageSeconds,
    });
  }
  if (ageSeconds > MAX_TOKEN_AGE_SECONDS) {
    verificationError("token_too_old", "token exceeds the replay-age limit", {
      iat,
      now: nowSeconds,
      age_seconds: ageSeconds,
      max_age_seconds: MAX_TOKEN_AGE_SECONDS,
    });
  }

  if (payload.repository !== expectedRepository) {
    verificationError("repository_mismatch", "signed repository claim does not match source_repo", {
      claimed_repository: payload.repository,
      expected_repository: expectedRepository,
    });
  }

  if (requireMainWorkflow) {
    const workflowRef = typeof payload.workflow_ref === "string" ? payload.workflow_ref : "";
    const expectedPrefix = `${expectedRepository}/.github/workflows/`;
    const expectedSuffix = "@refs/heads/main";
    const startsOk = workflowRef.startsWith(expectedPrefix);
    const endsOk = workflowRef.endsWith(expectedSuffix);
    const middle = startsOk && endsOk
      ? workflowRef.slice(expectedPrefix.length, workflowRef.length - expectedSuffix.length)
      : "";
    if (!startsOk || !endsOk || middle.length === 0 || middle.includes("@") || middle.includes("/")) {
      verificationError("workflow_ref_not_on_main", "workflow_ref is not an approved main-branch workflow", {
        workflow_ref: workflowRef,
        expected_prefix: expectedPrefix,
        expected_suffix: expectedSuffix,
      });
    }
  }

  return ageSeconds;
}

export function pickClaims(payload) {
  return Object.fromEntries(
    PUBLISHED_CLAIMS.map((name) => [name, payload[name]])
      .filter(([, value]) => value !== undefined),
  );
}

export async function verifyOidcToken({
  token,
  expectedAudience,
  expectedRepository,
  requireMainWorkflow = false,
  jwks,
  fetchImpl,
  nowSeconds = Math.floor(Date.now() / 1000),
}) {
  const parsed = parseJwt(token);
  const { protectedHeader, payload, signature, signingInput } = parsed;

  if (protectedHeader.alg !== "RS256") {
    verificationError("unsupported_algorithm", "token algorithm must be RS256", {
      alg: protectedHeader.alg,
    });
  }
  if (typeof protectedHeader.kid !== "string" || protectedHeader.kid.length === 0) {
    verificationError("malformed_token", "protected header must contain a non-empty kid");
  }

  const keySet = jwks ?? await fetchGithubJwks({ fetchImpl });
  const jwk = selectSigningKey(keySet, protectedHeader.kid);
  let publicKey;
  try {
    publicKey = createPublicKey({ key: jwk, format: "jwk" });
  } catch {
    verificationError("unsupported_signing_key", "matching JWK could not be imported", {
      kid: protectedHeader.kid,
    });
  }

  let signatureValid = false;
  try {
    signatureValid = verifySignature(
      "RSA-SHA256",
      Buffer.from(signingInput, "ascii"),
      { key: publicKey, padding: cryptoConstants.RSA_PKCS1_PADDING },
      signature,
    );
  } catch {
    verificationError("signature_invalid", "token signature verification failed");
  }
  if (!signatureValid) {
    verificationError("signature_invalid", "token signature is invalid");
  }

  const ageSeconds = validateClaims({
    payload,
    expectedAudience,
    expectedRepository,
    requireMainWorkflow,
    nowSeconds,
  });
  return { payload, protectedHeader, ageSeconds };
}

function log(level, event, fields = {}) {
  process.stderr.write(`${JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    component: "verify-oidc",
    event,
    ...fields,
  })}\n`);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new OidcConfigError("missing_required_env", `missing required environment variable ${name}`, {
      env: name,
    });
  }
  return value;
}

async function main() {
  const token = requireEnv("OIDC_TOKEN");
  const expectedAudience = requireEnv("OIDC_EXPECTED_AUDIENCE");
  const expectedRepository = requireEnv("OIDC_EXPECTED_REPOSITORY");
  const requireMainWorkflow = process.env.OIDC_REQUIRE_MAIN_WORKFLOW === "true";

  log("info", "verification_started", {
    expected_audience: expectedAudience,
    expected_repository: expectedRepository,
    require_main_workflow: requireMainWorkflow,
  });

  const { payload, protectedHeader, ageSeconds } = await verifyOidcToken({
    token,
    expectedAudience,
    expectedRepository,
    requireMainWorkflow,
  });
  const claims = pickClaims(payload);
  log("info", "verification_succeeded", {
    ...claims,
    age_seconds: ageSeconds,
    kid: protectedHeader.kid,
  });
  process.stdout.write(`${JSON.stringify(claims)}\n`);
}

const isDirectInvocation = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectInvocation) {
  main().catch((error) => {
    if (error instanceof OidcConfigError) {
      log("error", "config_error", {
        verification_code: error.code,
        message: error.message,
        ...error.details,
      });
    } else if (error instanceof OidcVerificationError) {
      log("error", "verification_failed", {
        verification_code: error.code,
        message: error.message,
        ...error.details,
      });
    } else {
      log("error", "unexpected_error", { message: error?.message || "unknown error" });
    }
    process.exitCode = 1;
  });
}
