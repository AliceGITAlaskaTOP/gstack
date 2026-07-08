// Render presentation.html -> PDF (16:9, 1280x720 per slide) using Playwright/Chromium.
// Also writes per-slide PNG previews to preview/ for visual QA.
//   bun build-pdf.mjs   (or: node build-pdf.mjs)
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const htmlUrl = pathToFileURL(join(here, 'presentation.html')).href;
const outPdf = join(here, 'doma-karkas-presentation.pdf');
const previewDir = join(here, 'preview');
mkdirSync(previewDir, { recursive: true });

async function launch() {
  try {
    return await chromium.launch();
  } catch {
    return await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  }
}

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
await page.goto(htmlUrl, { waitUntil: 'networkidle' });
await page.evaluate(async () => { await document.fonts.ready; });

// Per-slide PNG previews (crisp, for review)
const slides = await page.$$('section.slide');
console.log(`slides found: ${slides.length}`);
for (let i = 0; i < slides.length; i++) {
  const n = String(i + 1).padStart(2, '0');
  await slides[i].screenshot({ path: join(previewDir, `slide-${n}.png`) });
}

// PDF: one 1280x720 page per slide
await page.pdf({
  path: outPdf,
  width: '1280px',
  height: '720px',
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
});

await browser.close();
console.log(`PDF written: ${outPdf}`);
