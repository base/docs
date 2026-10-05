// Minimal Keccak-256 (the Ethereum variant, 0x01 padding) for offline tests.
// The vendored AA bundle stopped exporting keccak256 when it moved to the
// Keystore-free EIP-8130 surface, and Node's crypto only ships SHA3-256, whose
// padding differs. Test-only: BigInt lanes favour clarity over speed.
const MASK = (1n << 64n) - 1n;
const ROUND_CONSTANTS = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
];
const ROTATIONS = [
  0, 1, 62, 28, 27,
  36, 44, 6, 55, 20,
  3, 10, 43, 25, 39,
  41, 45, 15, 21, 8,
  18, 2, 61, 56, 14,
];

const rotl = (value, shift) => shift === 0 ? value : ((value << BigInt(shift)) | (value >> BigInt(64 - shift))) & MASK;

function permute(state) {
  for (const rc of ROUND_CONSTANTS) {
    const c = [0, 1, 2, 3, 4].map((x) => state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20]);
    for (let x = 0; x < 5; x += 1) {
      const d = c[(x + 4) % 5] ^ rotl(c[(x + 1) % 5], 1);
      for (let y = 0; y < 25; y += 5) state[y + x] ^= d;
    }
    const b = new Array(25);
    for (let x = 0; x < 5; x += 1) {
      for (let y = 0; y < 5; y += 1) b[y + 5 * ((2 * x + 3 * y) % 5)] = rotl(state[x + 5 * y], ROTATIONS[x + 5 * y]);
    }
    for (let y = 0; y < 25; y += 5) {
      for (let x = 0; x < 5; x += 1) state[y + x] = b[y + x] ^ (~b[y + ((x + 1) % 5)] & MASK & b[y + ((x + 2) % 5)]);
    }
    state[0] ^= rc;
  }
}

function toBytes(input) {
  if (typeof input === "string" && /^0x[0-9a-fA-F]*$/.test(input) && input.length % 2 === 0) {
    return Uint8Array.from(Buffer.from(input.slice(2), "hex"));
  }
  if (typeof input === "string") return new TextEncoder().encode(input);
  return Uint8Array.from(input);
}

// Accepts a 0x-hex string (hashed as bytes), any other string (UTF-8), or bytes.
export function keccak256(input) {
  const rate = 136;
  const data = toBytes(input);
  const padded = new Uint8Array(Math.ceil((data.length + 1) / rate) * rate);
  padded.set(data);
  padded[data.length] ^= 0x01;
  padded[padded.length - 1] ^= 0x80;
  const state = new Array(25).fill(0n);
  for (let offset = 0; offset < padded.length; offset += rate) {
    for (let lane = 0; lane < rate / 8; lane += 1) {
      let value = 0n;
      for (let byte = 7; byte >= 0; byte -= 1) value = (value << 8n) | BigInt(padded[offset + lane * 8 + byte]);
      state[lane] ^= value;
    }
    permute(state);
  }
  let out = "0x";
  for (let lane = 0; lane < 4; lane += 1) {
    for (let byte = 0; byte < 8; byte += 1) out += Number((state[lane] >> BigInt(8 * byte)) & 0xffn).toString(16).padStart(2, "0");
  }
  return out;
}
