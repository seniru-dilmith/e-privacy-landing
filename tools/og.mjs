// Render dist/og.jpg, the 1200 x 630 card that WhatsApp, Instagram and others show when the link is shared.
// Run after tools/build.mjs. Needs Playwright: cd tools && npm install && npx playwright install chromium
// Set CHROME_PATH to use a Chromium you already have.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
globalThis.window = globalThis;
new Function(readFileSync(resolve(dist, 'issue.js'), 'utf8'))();
new Function(readFileSync(resolve(dist, 'assets/js/md.js'), 'utf8'))();
const I = globalThis.ISSUE;
const { esc, inline } = globalThis.MD;
const crowd = I.art.kind === 'crowd';

writeFileSync(resolve(dist, '_og.css'), `
body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
.og { position: relative; width: 1200px; height: 630px; display: grid; grid-template-columns: ${crowd ? '600px' : '650px'} 1fr; overflow: hidden; isolation: isolate; }
.og::before { content: ""; position: absolute; inset: -50%; z-index: -1; background: repeating-conic-gradient(from 0deg at 72% 45%, rgb(255 255 255 / .07) 0deg 3deg, transparent 3deg 9deg); }
.txt { padding: 54px 0 0 60px; position: relative; z-index: 2; }
.logo { display: flex; align-items: center; gap: 14px; margin-top: 18px; }
.logo img { width: 104px; height: 104px; filter: drop-shadow(4px 4px 0 var(--shadow)); }
.logo .letter { font-size: ${I.wordmark.length > 9 ? 104 : 128}px; }
.lines { margin-top: 28px; display: grid; gap: 6px; }
.lines .letter { font-size: 54px; }
.lines .white { color: #fff; }
.iss { margin: 28px 0 0; font: 400 26px var(--comic); letter-spacing: .08em; color: var(--accent); }
.iss span { font: 500 20px var(--mono); letter-spacing: 0; }
.art { position: relative; }
.art .hero { position: absolute; ${crowd ? 'right: -20px; bottom: -40px; width: 640px;' : 'left: 40px; top: 70px; width: 300px;'} height: auto; filter: drop-shadow(0 18px 30px rgb(0 0 0 / .45)); }
.art .burst { position: absolute; left: 60px; top: 40px; width: 460px; aspect-ratio: 1; background: radial-gradient(var(--accent) 2px, transparent 2.3px) 0 0 / 11px 11px, color-mix(in srgb, var(--accent) 16%, transparent); clip-path: polygon(50% 0, 60% 22%, 84% 8%, 76% 34%, 100% 40%, 79% 55%, 96% 78%, 70% 72%, 64% 100%, 50% 80%, 34% 98%, 30% 72%, 4% 80%, 20% 56%, 0 38%, 24% 33%, 16% 8%, 40% 22%); }
.art .speech { position: absolute; ${crowd ? 'left: 120px; top: 40px;' : 'left: 270px; top: 70px;'} width: 270px; margin: 0; font-size: 36px; z-index: 3; }
`);
writeFileSync(resolve(dist, '_og.html'), `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="assets/css/site.css"><link rel="stylesheet" href="assets/css/theme.css"><link rel="stylesheet" href="_og.css"></head><body>
<div class="og">
  <div class="txt">
    <span class="tag ribbon">${esc(I.kicker)}</span>
    <div class="logo"><img src="${esc(I.art.emblem)}" alt=""><span class="letter">${esc(I.wordmark)}</span></div>
    <div class="lines"><span class="letter white">${esc(I.closing[0])}</span><span class="letter white">${esc(I.closing[1])}</span><span class="letter">${esc(I.closing[2])}</span></div>
    <p class="iss">Issue #${I.issue} · <span>${esc(I.group)}</span></p>
  </div>
  <div class="art"><div class="burst"></div><img class="hero" src="${esc(I.art.cover)}" alt=""><p class="speech">${inline(I.says)}</p></div>
</div></body></html>`);

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(pathToFileURL(resolve(dist, '_og.html')).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
await page.screenshot({ path: resolve(dist, 'og.jpg'), type: 'jpeg', quality: 86 });
await browser.close();
rmSync(resolve(dist, '_og.html'));
rmSync(resolve(dist, '_og.css'));
console.log('wrote dist/og.jpg');
