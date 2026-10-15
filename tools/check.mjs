// Check the built site in a real browser, with the same security headers the host will apply.
//
//   node tools/check.mjs
//
// It serves dist/ locally, opens it at phone and laptop sizes, plays the game through to the end and reports
// script or security-policy errors, sideways scrolling, missing files and a missing share preview.
// Screenshots go to tools/out/. Look at them: the checker can't tell you that a sentence reads badly.
// Needs Playwright (cd tools && npm install && npx playwright install chromium). CHROME_PATH overrides the browser.
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const out = resolve(root, 'tools/out');
mkdirSync(out, { recursive: true });
if (!existsSync(resolve(dist, 'index.html'))) { console.error('Build first: node tools/build.mjs'); process.exit(1); }

// ---- a static server that applies dist/_headers ----
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.txt': 'text/plain' };
const rules = [];
let cur = null;
for (const line of readFileSync(resolve(dist, '_headers'), 'utf8').split('\n')) {
  if (!line.trim()) continue;
  if (!line.startsWith(' ')) { cur = { pat: line.trim(), h: [] }; rules.push(cur); } else { const i = line.indexOf(':'); cur.h.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]); }
}
const match = (pat, p) => new RegExp('^' + pat.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$').test(p);
const missing = new Set();
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = join(dist, p);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f) && existsSync(f + '.html')) f += '.html';
  let status = 200;
  if (!existsSync(f) || p.includes('..')) { missing.add(p); f = join(dist, '404.html'); status = 404; }
  for (const r of rules) if (match(r.pat, p)) for (const [k, v] of r.h) res.setHeader(k, v.replace('upgrade-insecure-requests', ''));
  res.writeHead(status, { 'Content-Type': types[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const problems = [];
async function page(viewport, mobile) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) problems.push(`console ${m.type()}: ${m.text().slice(0, 200)}`); });
  p.on('pageerror', (e) => problems.push(`script error: ${e.message}`));
  return p;
}
const overflow = (p, what) => p.evaluate(() => document.documentElement.scrollWidth - innerWidth).then((px) => { if (px > 0) problems.push(`${what}: scrolls sideways by ${px}px`); });

// ---- the reading page ----
for (const [name, vp, mobile] of [['phone', { width: 390, height: 844 }, true], ['laptop', { width: 1440, height: 900 }, false]]) {
  const p = await page(vp, mobile);
  await p.goto(base + '/');
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/${name}-cover.png` });
  await p.screenshot({ path: `${out}/${name}-read-full.png`, fullPage: true });
  await overflow(p, `reading page (${name})`);
  await p.close();
}

// ---- the game, played to the end ----
const p = await page({ width: 390, height: 844 }, true);
await p.goto(base + '/try');
await p.waitForTimeout(400);
for (let n = 0; n < 40; n++) {
  const step = await p.$('.step.on');
  const type = await step.evaluate((s) => s.dataset.step);
  await p.screenshot({ path: `${out}/game-${String(n + 1).padStart(2, '0')}-${type}.png`, fullPage: true });
  if (await p.$('.step.on .recap')) break;
  const input = await p.$('.step.on input.input.big');
  if (input) await input.fill((await input.getAttribute('placeholder')) || '42');
  for (const b of (await p.$$('.step.on .cust')).slice(0, 2)) await b.click();
  const go = await p.$('.step.on .body > .row > .btn:not(.alt)');
  if (go && !(await go.isDisabled())) await go.click();
  const choice = await p.$('.step.on .rules .btn');
  if (choice) await choice.click();
  await p.waitForTimeout(400);
  const next = await p.$('#next');
  for (let w = 0; w < 30 && (await next.isDisabled()); w++) await p.waitForTimeout(200);
  if (await next.isDisabled()) { problems.push(`game: stuck on step "${type}", the Next button never enabled`); break; }
  await next.click();
  await p.waitForTimeout(400);
}
await overflow(p, 'game');
await p.close();
await browser.close();
server.close();

if (!existsSync(resolve(dist, 'og.jpg'))) problems.push('no share preview: run node tools/og.mjs');
for (const m of missing) if (m !== '/favicon.ico') problems.push(`missing file: ${m}`);
console.log(problems.length ? `${problems.length} problem(s):\n  ${problems.join('\n  ')}` : 'No problems found.');
console.log(`Screenshots in tools/out/. Look at every one.`);
process.exit(problems.length ? 1 : 0);
