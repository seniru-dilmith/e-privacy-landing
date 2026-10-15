// Build the site from issue.js and art/ into dist/, ready to upload to Cloudflare Pages (or any static host).
//
//   node tools/build.mjs            reads ./issue.js and ./art/, writes ./dist/
//   node tools/og.mjs               then renders dist/og.jpg, the share preview (needs Playwright, see README)
//
// The build checks issue.js first and stops with a list of what is missing or wrong. It never fills a gap itself.
// Plain Node 20 or later, no packages.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const engine = resolve(root, 'engine');
const dist = resolve(root, 'dist');
const load = (file) => new Function(readFileSync(file, 'utf8'))();
globalThis.window = globalThis;
load(resolve(engine, 'assets/js/md.js'));
load(resolve(engine, 'assets/js/crypto.js'));
const { esc, inline, block } = globalThis.MD;
const E = globalThis.ETC;

if (!existsSync(resolve(root, 'issue.js'))) fail(['There is no issue.js next to the engine folder. Put your group\'s issue.js there first.']);
load(resolve(root, 'issue.js'));
const I = globalThis.ISSUE;

// ---------- check issue.js ----------
function fail(problems) {
  console.error(`issue.js is not ready to build:\n${problems.map((p) => `  - ${p}`).join('\n')}\n\nAGENTS.md explains every field. Nothing was written.`);
  process.exit(1);
}
const problems = [];
const need = (cond, msg) => { if (!cond) problems.push(msg); };
const str = (v) => typeof v === 'string' && v.trim().length > 0;
need(I && typeof I === 'object', 'issue.js must set window.ISSUE = { ... }');
if (I) {
  need(Number.isInteger(I.issue), 'issue: the issue number from your backdrop, for example 3');
  for (const k of ['project', 'wordmark', 'kicker', 'group', 'title', 'description', 'says']) need(str(I[k]), `${k}: missing`);
  need(str(I.siteUrl) && /^https:\/\/[^/]+/.test(I.siteUrl), 'siteUrl: the full https:// address the site will live at, for example https://eprivacy.example.com');
  for (const k of ['accent', 'accentDeep', 'onAccent', 'shadow', 'ribbon']) need(/^#[0-9a-f]{6}$/i.test(I.colors?.[k] ?? ''), `colors.${k}: a hex colour like #22b573`);
  for (const k of ['cover', 'emblem', 'avatar']) {
    need(str(I.art?.[k]), `art.${k}: missing`);
    if (str(I.art?.[k])) need(existsSync(resolve(root, I.art[k])), `art.${k}: the file ${I.art[k]} does not exist`);
  }
  need(['hero', 'crowd'].includes(I.art?.kind), 'art.kind: "hero" (one tall figure) or "crowd" (a wide group)');
  need(str(I.art?.alt), 'art.alt: one sentence describing the cover art, for screen readers');
  need(Array.isArray(I.intro) && I.intro.length > 0 && I.intro.every(str), 'intro: one or two short paragraphs for the cover');
  need(str(I.doors?.playText), 'doors.playText: one line on what the game lets a visitor do, ending in how long it takes');
  need(Array.isArray(I.chapters) && I.chapters.length > 0, 'chapters: at least one chapter (the interview in AGENTS.md writes them)');
  (I.chapters || []).forEach((c, i) => {
    need(str(c.title), `chapters[${i}].title: missing`);
    need(str(c.lede), `chapters[${i}].lede: missing`);
    need(c.figure || c.cards, `chapters[${i}]: needs a figure or cards`);
  });
  need(Array.isArray(I.closing) && I.closing.length === 3 && I.closing.every(str), 'closing: exactly three short lines, the last one is highlighted');
  need(Array.isArray(I.game?.steps) && I.game.steps.length >= 3, 'game.steps: at least three steps (see "The game" in AGENTS.md)');
  if (Array.isArray(I.game?.steps)) need(I.game.steps.at(-1)?.type === 'recap', 'game.steps: the last step must be a recap');
}
if (problems.length) fail(problems);

// ---------- figure blocks for the reading page ----------
const icons = readFileSync(resolve(engine, 'assets/icons.svg'), 'utf8');
const ico = (name) => `<svg fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#i-${esc(name)}"/></svg>`;
const tick = '<svg class="mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
const cross = '<svg class="mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
// kvRow formats its text with inline(); kvRaw shows a value exactly as given (code, JSON, hashes).
const kvRow = ([label, value, cls]) => `<div class="kv${cls ? ' ' + esc(cls) : ''}"><dt>${inline(label)}</dt><dd>${inline(value)}</dd></div>`;
const kvRaw = ([label, value, cls]) => `<div class="kv${cls ? ' ' + esc(cls) : ''}"><dt>${inline(label)}</dt><dd>${esc(value)}</dd></div>`;
const firstChapter = I.startAt ?? 1;
let lastSeal = null;

async function renderBlock(b) {
  if (b.kv) return `<dl class="out">${b.kv.map(kvRow).join('')}</dl>`;
  if (b.via) return `<div class="via">${ico(b.icon || 'lock')}<span>${inline(b.via)}</span></div>`;
  if (b.rules) return `<ul class="rules">${b.rules.map(([kind, text]) => `<li class="${kind === 'no' ? 'no' : 'yes'}">${kind === 'no' ? cross : tick}<span>${inline(text)}</span></li>`).join('')}</ul>`;
  if (b.timeline) return `<ol class="timeline">${b.timeline.map(([label, text, cls]) => `<li${cls ? ` class="${esc(cls)}"` : ''}><p><b>${inline(label)}</b><span>${inline(text)}</span></p></li>`).join('')}</ol>`;
  if (b.checks) return `<ol class="checks">${b.checks.map((t) => `<li class="ok">${inline(t)}</li>`).join('')}</ol>`;
  if (b.spots) return `<div class="spots">${b.spots.map(([icon, leak, fix, ch]) => `<div class="spot">${ico(icon)}<span class="leak">${inline(leak)}</span><span class="fix">${inline(fix)}${ch !== undefined ? ` <a href="#ch${ch}">Chapter ${ch}</a>` : ''}</span></div>`).join('')}</div>`;
  if (b.tiles) return `<div class="custodians">${b.tiles.map(([t, v]) => `<div class="cust"><b>${inline(t)}</b><span>${inline(v)}</span></div>`).join('')}</div>`;
  if (b.table) {
    const t = b.table;
    return `<table class="shares"><thead><tr>${t.head.map((x) => `<th scope="col">${inline(x)}</th>`).join('')}</tr></thead><tbody>${t.rows.map((r, i) => `<tr${i === t.win ? ' class="win"' : ''}>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  if (b.note) return `<p class="fig-note">${inline(b.note)}</p>`;
  if (b.status) return `<p class="status ${b.status[0] === 'bad' ? 'bad' : 'good'}">${inline(b.status[1])}</p>`;
  if (b.tryLink) return `<a class="try-link" href="/try">${inline(b.tryLink)} <span aria-hidden="true">&rarr;</span></a>`;
  if (b.sealDemo) {
    const d = b.sealDemo;
    lastSeal = await E.seal(d.plain);
    const L = d.labels || {};
    return `<dl class="out">${kvRaw([L.plain || 'What you typed', d.plain])}<div class="via">${ico('lock')}<span>${inline(L.via || 'Sealed with AES-128-GCM, inside your browser')}</span></div>${kvRaw([L.stored || 'What the platform stores', E.hex(lastSeal.ct)])}${kvRaw([L.key || 'The key that opens it', E.hex(lastSeal.keyBytes), 'key'])}</dl>`;
  }
  if (b.shamirDemo) {
    if (!lastSeal) fail(['shamirDemo needs a sealDemo earlier on the page']);
    const names = b.shamirDemo.holders || ['Custodian 1', 'Custodian 2', 'Custodian 3'];
    const shares = E.split2of3(lastSeal.keyBytes);
    const key = E.hex(lastSeal.keyBytes);
    return `<div class="custodians">${shares.map((s) => `<div class="cust"><b>${esc(names[s.x - 1])}</b><span>${E.hex(s.y)}</span></div>`).join('')}</div>` +
      `<ul class="rules"><li class="no">${cross}<span>${inline(b.shamirDemo.one || '**Any one share alone:** pure noise. Every possible key is still equally likely.')}</span></li><li class="yes">${tick}<span>${inline((b.shamirDemo.two || '**Any two shares together:** the exact key, {key}, and it opens.').replace('{key}', '`' + key + '`'))}</span></li></ul>`;
  }
  if (b.merkleDemo) {
    const d = b.merkleDemo;
    const [idx, edited] = d.edit;
    const good = (await E.merkleLevels(d.entries)).map((l) => l.map(E.hex));
    const texts = d.entries.slice();
    texts[idx] = edited;
    const bad = (await E.merkleLevels(texts)).map((l) => l.map(E.hex));
    const names = ['Entries (leaves)', 'Level 1', 'Level 2', 'Level 3', 'Level 4'];
    let rows = '';
    for (let l = bad.length - 1; l >= 0; l--) {
      const label = l === bad.length - 1 ? 'Root' : names[l];
      rows += `<div><div class="lab">${label}</div><div class="lvl n${bad[l].length}">${bad[l].map((x, i) => `<div class="h${l === bad.length - 1 ? ' root' : ''}${x !== good[l][i] ? ' bad' : ''}">${x.slice(0, l === 0 ? 4 : l === bad.length - 1 ? 16 : 6)}</div>`).join('')}</div></div>`;
    }
    return `<dl class="out">${kvRaw([`Entry ${idx}, as logged`, d.entries[idx]])}${kvRaw([`Entry ${idx}, edited`, edited, 'bad'])}</dl><div class="tree">${rows}</div>` +
      `<div class="published">${kvRaw([d.rootLabel || 'Published root (cosigned)', good.at(-1)[0].slice(0, 24) + '…'])}${kvRaw(['Root after the edit', bad.at(-1)[0].slice(0, 24) + '…', 'bad'])}</div>`;
  }
  if (b.sharesDemo) {
    const d = b.sharesDemo;
    const holders = d.holders || ['Cust. 1', 'Cust. 2', 'Cust. 3'];
    const rows = d.rows.map(([label, value, result]) => [label, ...E.shareAdditive(Math.round(value)).map((x) => x.toString(16).padStart(64, '0').slice(0, 9) + '…'), result]);
    return renderBlock({ table: { head: [d.labelHead || 'Item', ...holders, d.resultHead || 'Result'], rows, win: d.win } });
  }
  fail([`a figure block with an unknown type: ${JSON.stringify(Object.keys(b))}`]);
}

// ---------- pages ----------
const absolute = (p) => I.siteUrl.replace(/\/$/, '') + p;
const avatar = '/' + I.art.avatar;
const head = (title, description, path, extra = '') => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#0a1d3b">
<link rel="canonical" href="${esc(absolute(path))}">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(absolute(path))}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(absolute('/og.jpg'))}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preload" href="/assets/fonts/bangers-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/site.css">
<link rel="stylesheet" href="/assets/css/theme.css">
${extra}</head>`;

const topbar = (label) => `<div class="topbar">
  <a href="/" class="home" aria-label="Back to the cover"><img src="/${esc(I.art.emblem)}" alt="" width="30" height="30"></a>
  <b>${esc(label)}</b>
  ${label === 'Try it' ? '<ol class="dots" id="dots" aria-label="Progress"></ol>' : `<span class="issue">Issue #${I.issue} <span>· ${esc(I.group)}</span></span>\n  <div class="progress" id="progress"></div>`}
</div>`;

const says = (text) => `<div class="says reveal"><img src="${esc(avatar)}" alt="" width="64" height="64"><p>${inline(text)}</p></div>`;
const deeper = (text) => (text ? `<details class="deeper"><summary>${esc(I.deeperLabel || 'Behind the panel')}</summary><div class="body">${block(text)}</div></details>` : '');

async function chapterHtml(c, i) {
  const n = i + firstChapter;
  const id = `ch${n}`;
  let figure = '';
  if (c.figure) {
    const blocks = [];
    for (const b of c.figure.blocks || []) blocks.push(await renderBlock(b));
    figure = `  <div class="panel reveal">\n    ${c.figure.title ? `<h3>${inline(c.figure.title)}</h3>` : ''}\n    ${blocks.join('\n    ')}\n  </div>\n`;
  }
  const cards = c.cards ? `<div class="limits">${c.cards.map(([t, x]) => `<div class="limit reveal"><h3>${inline(t)}</h3><p>${inline(x)}</p></div>`).join('')}</div>` : '';
  return `<section class="chapter${c.cards ? ' wide' : ''}" id="${id}" aria-labelledby="${id}-t">
  <header><span class="tag">Chapter ${n}</span><h2 class="letter" id="${id}-t">${esc(c.title)}</h2></header>
  <p class="lede">${inline(c.lede)}</p>
${figure}  <div class="side">
    ${cards}${c.says ? says(c.says) : ''}
    ${deeper(c.deeper)}
  </div>
</section>`;
}

const doors = I.doors || {};
const coverArt = `<div class="stage ${I.art.kind === 'crowd' ? 'crowd' : I.art.side === 'right' ? 'right' : ''}">
        <div class="burst" aria-hidden="true"></div>
        ${I.art.kind === 'crowd' ? `<p class="speech">${inline(I.says)}</p>\n        <img class="hero" src="/${esc(I.art.cover)}" alt="${esc(I.art.alt)}" fetchpriority="high">` : `<img class="hero" src="/${esc(I.art.cover)}" alt="${esc(I.art.alt)}" fetchpriority="high">\n        <p class="speech">${inline(I.says)}</p>`}
      </div>`;

const chapters = [];
for (const [i, c] of I.chapters.entries()) chapters.push(await chapterHtml(c, i));

const index = `${head(I.title, I.description, '/', '<script src="/assets/js/reveal.js" defer></script>\n')}
<body>
<svg width="0" height="0" class="sr" aria-hidden="true">
${icons}</svg>

${topbar(I.project)}

<section class="cover" aria-labelledby="title">
  <div class="wrap">
    <div class="left">
      <span class="tag ribbon">${esc(I.kicker)}</span>
      <h1 class="logo" id="title">
        <img src="/${esc(I.art.emblem)}" alt="" width="74" height="74">
        <span class="letter">${esc(I.wordmark)}</span>
      </h1>
      ${coverArt}
    </div>

    <div class="doors">
      <a class="door try" href="/try"><span class="txt"><b>${esc(doors.playTitle || 'Try it on your phone')}</b><span>${inline(doors.playText)}</span></span><span class="go" aria-hidden="true">&rarr;</span></a>
      <a class="door" href="#ch${firstChapter}"><span class="txt"><b>${esc(doors.readTitle || 'Read the issue')}</b><span>${inline(doors.readText || 'How every part works, chapter by chapter, with the technical detail.')}</span></span><span class="go" aria-hidden="true">&darr;</span></a>
    </div>

    <div class="caption intro reveal">
      ${I.intro.map((p) => `<p>${inline(p)}</p>`).join('\n      ')}
    </div>

    <nav class="panel contents reveal" aria-labelledby="contents-title">
      <h3 id="contents-title">In this issue</h3>
      <ol>
        ${I.chapters.map((c, i) => `<li><a href="#ch${i + firstChapter}"><span>${i + firstChapter}</span><b>${esc(c.title)}</b></a></li>`).join('\n        ')}
      </ol>
    </nav>
  </div>
</section>

<main>
${chapters.join('\n\n')}
</main>

<footer class="end">
  <span class="letter white">${esc(I.closing[0])}</span>
  <span class="letter white">${esc(I.closing[1])}</span>
  <span class="letter">${esc(I.closing[2])}</span>
  <img src="/${esc(I.art.emblem)}" alt="" width="86" height="86">
  <p class="sign">End of Issue #${I.issue} · <span>${esc(I.group)}</span></p>
</footer>
<p class="fine">${inline(I.footnote || 'This site sends nothing anywhere. The game runs entirely on your phone.')}</p>
</body>
</html>
`;

const g = I.game;
const tryPage = `${head(g.title || `Try it · ${I.project}`, g.description || I.description, '/try', `<script src="/assets/js/md.js" defer></script>
<script src="/assets/js/crypto.js" defer></script>
<script src="/issue.js" defer></script>
<script src="/assets/js/game.js" defer></script>
`)}
<body class="game" data-avatar="${esc(avatar)}">
${topbar('Try it')}
<main class="play" id="play"></main>
<nav class="controls" aria-label="Steps">
  <button class="btn alt" type="button" id="back">Back</button>
  <button class="btn" type="button" id="next">Start</button>
</nav>
</body>
</html>
`;

const notFound = `${head(`Page not found · ${I.project}`, I.description, '/404')}
<body>
<main class="lost">
  <img src="/${esc(I.art.emblem)}" alt="" width="96" height="96">
  <h1 class="letter">Wrong panel!</h1>
  <p class="caption">This page isn't in Issue #${I.issue}. The whole story is on one page.</p>
  <p><a class="btn" href="/">Back to the cover</a></p>
</main>
</body>
</html>
`;

const c = I.colors;
const theme = `/* Written by tools/build.mjs from issue.js colors. Edit issue.js, not this file. */
:root {
  --accent: ${c.accent};
  --accent-deep: ${c.accentDeep};
  --on-accent: ${c.onAccent};
  --shadow: ${c.shadow};
  --ribbon: ${c.ribbon};
}
`;

const headers = `/*
  Content-Security-Policy: default-src 'none'; script-src 'self'${I.analytics ? ' https://static.cloudflareinsights.com' : ''}; style-src 'self'; img-src 'self'; font-src 'self'; connect-src ${I.analytics ? 'https://cloudflareinsights.com' : "'none'"}; manifest-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Cross-Origin-Opener-Policy: same-origin

/assets/fonts/*
  Cache-Control: public, max-age=31536000, immutable
`;

// ---------- write dist/ ----------
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(resolve(engine, 'assets'), resolve(dist, 'assets'), { recursive: true, filter: (p) => !p.endsWith('icons.svg') });
cpSync(resolve(root, 'art'), resolve(dist, 'art'), { recursive: true });
if (existsSync(resolve(root, 'static'))) cpSync(resolve(root, 'static'), dist, { recursive: true }); // favicons and manifest
cpSync(resolve(root, 'issue.js'), resolve(dist, 'issue.js'));
cpSync(resolve(engine, 'robots.txt'), resolve(dist, 'robots.txt'));
writeFileSync(resolve(dist, 'assets/css/theme.css'), theme);
writeFileSync(resolve(dist, 'index.html'), index);
writeFileSync(resolve(dist, 'try.html'), tryPage);
writeFileSync(resolve(dist, '404.html'), notFound);
writeFileSync(resolve(dist, '_headers'), headers);
console.log(`built dist/ for Issue #${I.issue} · ${I.project}. Next: node tools/og.mjs renders the share preview, dist/og.jpg.`);
