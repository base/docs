/*
 * Renders the BDS sequence-diagram HTML sources to PNG via headless Chromium.
 * Output is written next to the original ledger flow images.
 */
import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../../docs/images/ledger");

const jobs = [
  { html: "deposit-flow.html", out: "deposit-flow-1.png" },
  { html: "withdraw-flow.html", out: "withdraw-flow-1.png" },
];

function log(event, fields = {}) {
  process.stdout.write(
    JSON.stringify({ timestamp: new Date().toISOString(), level: "info", event, ...fields }) + "\n",
  );
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  for (const job of jobs) {
    const url = pathToFileURL(join(here, job.html)).href;
    await page.goto(url, { waitUntil: "networkidle" });
    const element = page.locator("#diagram");
    const outPath = join(outDir, job.out);
    await element.screenshot({ path: outPath });
    log("diagram_rendered", { source: job.html, output: outPath });
  }
} finally {
  await browser.close();
}
