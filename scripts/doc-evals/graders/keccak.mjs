/**
 * Keccak-256 (the original Keccak padding, NOT NIST SHA3-256 — Node's
 * built-in `crypto.createHash("sha3-256")` uses the 0x06 SHA3 domain
 * suffix and produces different digests). Ethereum function selectors and
 * everything else in this repo's Solidity docs are computed with the
 * original Keccak-256 (domain suffix 0x01), so we implement Keccak-f[1600]
 * and the pad10*1 rule ourselves rather than reach for `sha3-256`.
 *
 * Pure Node built-ins only (BigInt for the 64-bit lane arithmetic) — no
 * npm dependency, per the doc-evals ground rules.
 *
 * Reference: Keccak submission to NIST / FIPS 202 Appendix. Verified
 * against the three vectors in `scripts/doc-evals/PLAN.md`'s Lane B
 * section (see `__tests__/graders-keccak.test.mjs`).
 */

const LANE_MASK = 0xffffffffffffffffn;
const ROUNDS = 24;

// Round constants (iota step), one 64-bit lane per round.
const RC = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
];

// Rotation offsets for the rho step, r[x][y] with lane(x,y) = state[x + 5*y].
// Table 2 of the Keccak/FIPS 202 spec.
const ROT = [
  [0, 36, 3, 41, 18],
  [1, 44, 10, 45, 2],
  [62, 6, 43, 15, 61],
  [28, 55, 25, 21, 56],
  [27, 20, 39, 8, 14],
];

function rotl64(x, n) {
  if (n === 0) return x & LANE_MASK;
  const nb = BigInt(n);
  return ((x << nb) | (x >> BigInt(64 - n))) & LANE_MASK;
}

/** One in-place Keccak-f[1600] permutation over a 25-lane BigUint64Array. */
function keccakF1600(state) {
  for (let round = 0; round < ROUNDS; round++) {
    // Theta
    const C = new Array(5);
    for (let x = 0; x < 5; x++) {
      C[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20];
    }
    const D = new Array(5);
    for (let x = 0; x < 5; x++) {
      D[x] = C[(x + 4) % 5] ^ rotl64(C[(x + 1) % 5], 1);
    }
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        state[x + 5 * y] ^= D[x];
      }
    }

    // Rho + Pi combined: new lane at (X, Y) = rotl(old lane at (x, y), r[x][y])
    // where X = y, Y = (2x + 3y) mod 5.
    const B = new Array(25);
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        const X = y;
        const Y = (2 * x + 3 * y) % 5;
        B[X + 5 * Y] = rotl64(state[x + 5 * y], ROT[x][y]);
      }
    }

    // Chi
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        const a = B[x + 5 * y];
        const b = B[(x + 1) % 5 + 5 * y];
        const c = B[(x + 2) % 5 + 5 * y];
        state[x + 5 * y] = a ^ (~b & c & LANE_MASK);
      }
    }

    // Iota
    state[0] ^= RC[round];
  }
}

/**
 * Compute the Keccak-256 digest of `input` (bytes, or a UTF-8 string).
 *
 * @param {Uint8Array|string} input
 * @returns {Uint8Array} 32-byte digest
 */
export function keccak256(input) {
  const msg = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const rate = 136; // bytes (1088-bit rate for c=512 / 256-bit output)

  const padLen = rate - (msg.length % rate);
  const padded = new Uint8Array(msg.length + padLen);
  padded.set(msg);
  padded[msg.length] = 0x01; // Keccak (not SHA3) domain-separation / first pad bit
  padded[padded.length - 1] |= 0x80; // final pad bit

  const state = new BigUint64Array(25);
  for (let offset = 0; offset < padded.length; offset += rate) {
    for (let i = 0; i < rate / 8; i++) {
      let lane = 0n;
      for (let b = 7; b >= 0; b--) {
        lane = (lane << 8n) | BigInt(padded[offset + i * 8 + b]);
      }
      state[i] ^= lane;
    }
    keccakF1600(state);
  }

  const out = new Uint8Array(32);
  for (let i = 0; i < 4; i++) {
    let lane = state[i];
    for (let b = 0; b < 8; b++) {
      out[i * 8 + b] = Number(lane & 0xffn);
      lane >>= 8n;
    }
  }
  return out;
}

/**
 * Keccak-256 digest as a lowercase hex string, no `0x` prefix.
 *
 * @param {Uint8Array|string} input
 * @returns {string}
 */
export function keccak256Hex(input) {
  return Buffer.from(keccak256(input)).toString("hex");
}

/**
 * Ethereum 4-byte function selector for a canonical Solidity signature
 * (e.g. `"transfer(address,uint256)"`), as `0x` + 8 lowercase hex chars.
 *
 * @param {string} signature
 * @returns {string}
 */
export function selectorFromSignature(signature) {
  return "0x" + keccak256Hex(signature).slice(0, 8);
}
