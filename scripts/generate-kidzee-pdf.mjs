#!/usr/bin/env node
/**
 * Headless Kidzee enrollment PDF generator (Playwright).
 *
 * Usage:
 *   node scripts/generate-kidzee-pdf.mjs --url "http://mchs2.localhost:5173/mchs2/enrollment/kidzee-print-form/print?token=..."
 *
 * Output: PDF bytes written to stdout. Timing/diagnostic logs go to stderr.
 *
 * First-time setup (from KidsActivites2.0/):
 *   npm install
 *   npx playwright install chromium
 */
import { chromium } from 'playwright';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    url: { type: 'string' },
  },
});

const url = values.url;
if (!url) {
  console.error('Usage: generate-kidzee-pdf.mjs --url <print-page-url>');
  process.exit(1);
}

// Bounded waits so the generator never hangs longer than the backend timeout.
// NOTE: do NOT use waitUntil:'networkidle' here — the Vite dev server keeps an
// HMR websocket open, so the network never goes idle and goto() would hang.
const NAV_TIMEOUT_MS = Number(process.env.PDF_NAV_TIMEOUT_MS || 20_000);
const READY_TIMEOUT_MS = Number(process.env.PDF_READY_TIMEOUT_MS || 20_000);
const ASSET_TIMEOUT_MS = Number(process.env.PDF_ASSET_TIMEOUT_MS || 8_000);

const startedAt = Date.now();
const elapsed = () => `${Date.now() - startedAt}ms`;
const log = (msg) => console.error(`[pdf] ${msg} (${elapsed()})`);

let browser;
try {
  log('launching chromium');
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Surface page-side errors to stderr for diagnosability.
  page.on('console', (m) => {
    if (m.type() === 'error') log(`page console error: ${m.text()}`);
  });
  page.on('pageerror', (e) => log(`page error: ${e?.message || e}`));

  log(`navigating to ${url}`);
  // 'load' fires once the document + its subresources finish; unlike
  // 'networkidle' it is not blocked by the persistent HMR websocket.
  await page.goto(url, { waitUntil: 'load', timeout: NAV_TIMEOUT_MS });
  log('page loaded, waiting for data-pdf-ready marker');

  await page.waitForSelector('[data-pdf-ready="true"]', { timeout: READY_TIMEOUT_MS });
  log('ready marker present, settling fonts/images');

  // Best-effort settle of fonts + images, each individually bounded so a single
  // stuck asset can't hang generation.
  await page.evaluate(async (assetTimeoutMs) => {
    const withTimeout = (p) => Promise.race([
      p,
      new Promise((resolve) => setTimeout(resolve, assetTimeoutMs)),
    ]);
    await withTimeout(document.fonts?.ready ?? Promise.resolve());
    const images = Array.from(document.images);
    await Promise.all(images.map((img) => (img.complete
      ? Promise.resolve()
      : withTimeout(new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      })))));
  }, ASSET_TIMEOUT_MS);

  log('rendering pdf');
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
  process.stdout.write(pdf);
  log(`done, ${pdf.length} bytes`);
} catch (err) {
  console.error(`[pdf] failed: ${err?.message || String(err)} (${elapsed()})`);
  process.exit(1);
} finally {
  if (browser) await browser.close();
}
