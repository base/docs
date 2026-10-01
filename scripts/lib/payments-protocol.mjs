// Loads the pure Commerce Payments Protocol block out of PaymentsDemo.jsx so
// tests and the read-only Vibenet simulation exercise the exact encoders and
// receipt checks the live demo uses. Mintlify snippets cannot import modules,
// so the block lives inline in the snippet between two marker comments.
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const root = new URL("../../", import.meta.url);
export const snippetPath = new URL("docs/snippets/PaymentsDemo.jsx", root);

export async function readSnippet() {
  return readFile(snippetPath, "utf8");
}

export function extractProtocolBlock(source) {
  const match = source.match(/\/\/ @payments-protocol:begin\n([\s\S]*?)\n\s*\/\/ @payments-protocol:end/);
  if (!match) throw new Error("PaymentsDemo.jsx is missing the @payments-protocol block");
  return match[1];
}

export async function loadProtocol() {
  const block = extractProtocolBlock(await readSnippet());
  // The block is plain JavaScript with no free variables beyond BigInt/Error.
  return new Function(`${block}\nreturn PAYMENTS_PROTOCOL;`)();
}

// The vendored AA bundle re-exports viem; tests use it as an independent ABI
// encoder to check the snippet's hand-rolled encodings.
export async function loadViem() {
  const aa = await readFile(new URL("docs/static/aa.txt", root));
  const temp = "/tmp/base-docs-aa-payments-test.mjs";
  await writeFile(temp, aa);
  return import(`${pathToFileURL(temp).href}?v=${Date.now()}`);
}
