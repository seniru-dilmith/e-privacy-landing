# Building a stall website: instructions for the agent

You are helping a student group build the public website their stall QR code points to. It is a comic "issue" that matches their printed backdrop, with two parts:

- **The reading page** (`/`): a cover with their hero or crowd, two doors ("Try it on your phone" and "Read the issue"), then chapters that explain the project, each with a static figure, a speech bubble and an optional technical "Behind the panel" section.
- **The game** (`/try`): a two-minute, one-step-per-screen experience on the visitor's phone. Some steps run real cryptography in the browser.

Everything specific to the group lives in **one file, `issue.js`**, plus their art in `art/`. The engine (`engine/`) and tools (`tools/`) are shared by every group: don't edit them for one group's content.

`examples/etendering/issue.js` is a complete, finished issue (Issue #1). Read it before you write anything: it shows every kind of figure, a full game and the tone to aim for.

Read this whole file before you change anything.

## What "done" means

- `node tools/build.mjs` succeeds, `node tools/og.mjs` writes the share preview and `node tools/check.mjs` reports no problems.
- You have looked at every screenshot in `tools/out/` and fixed anything that reads badly or looks wrong.
- Every claim on the site is true of what the group actually built. Nothing is invented, inflated or guessed.
- No placeholder text anywhere. If you don't know something, you ask. The build refuses `null` and empty fields on purpose.
- The group has read the site on their own phone and said it's right.

## Step 1: read what's already there

Open the group's `issue.js`. The top part was prefilled from their printed backdrop (issue number, project name, kicker, group name, the hero's line, colours, art). **Those match what's printed: don't change them unless the group asks.** Everything under the `ASK` line is yours to fill with the group.

If the group points you to their report, README, repository or slides, read those before you ask anything, and only ask about what's missing.

## Step 2: interview the group

Ask one question at a time, wait for the answer, and follow up when an answer is vague. You need:

1. Anything marked `ASK` in `issue.js` (for example the site address, and for some groups their group name or art).
2. What the project does, in one sentence a friend would understand.
3. Who it's for, and what goes wrong for those people today, specifically.
4. The idea that fixes it, in one line.
5. The three to six ideas a visitor should understand. For each: what the user sees, what happens underneath, and why it matters.
6. The cryptography or technique behind each idea, precisely: algorithm names, parameters, what is proven or hidden from whom. This becomes the "Behind the panel" text.
7. What is honestly not done or not claimed: assumptions, limits, things still to build.
8. Proof: tests, measurements, numbers. Only use numbers they can back up.
9. What a visitor should do or feel in the game, and which steps can be the real thing on a phone.

Then, **before writing any `issue.js`**, show the group a plain outline in the chat: the chapter list (title, one-line lede, what the figure shows) and the game steps (title, what the visitor does, live, toy or illustration). Get them to approve it or change it.

## Step 3: write `issue.js`

### Top-level fields

| Field | What it is |
|---|---|
| `issue`, `project`, `wordmark`, `kicker`, `group`, `says` | From the backdrop. `wordmark` is the big lettering next to the emblem; `says` is the hero's speech bubble. |
| `siteUrl` | The full `https://` address the site will live at. Used for the share preview and canonical links. |
| `title` | The browser tab and share title, about 60 characters. |
| `description` | One or two sentences for search results and link previews. |
| `colors` | `accent` (lettering, buttons), `accentDeep`, `onAccent` (text on accent buttons, dark or white, whichever reads), `shadow` (the offset shadow behind lettering), `ribbon` (the kicker tag). Hex only. |
| `art` | `cover`, `emblem` and `avatar` files in `art/`; `kind` is `"hero"` (one tall figure) or `"crowd"` (a wide group); `side` is `"left"` or `"right"` for a hero; `alt` describes the cover art in one sentence. |
| `doors.playText` | One line under "Try it on your phone": what the visitor does, and how long it takes. |
| `intro` | One or two short cover paragraphs. The first states the problem, the second your answer. |
| `startAt` | Optional. The first chapter number, default 1. eTendering uses 0 for "the old way". |
| `chapters` | The reading page, see below. |
| `closing` | Exactly three short lines that the whole issue has been proving. The third is highlighted. |
| `footnote` | Optional. The small line at the very bottom. |
| `analytics` | Optional. Set `true` only if the group switches on Cloudflare Web Analytics; it allows Cloudflare's script in the security headers. Then change `footnote` so it no longer says the site sends nothing. |
| `game` | The game, see below. |

Text fields may use `**bold**`, `` `code` `` and `[links](https://...)`. `deeper` text may also use blank lines between paragraphs, `### ` headings, `- ` lists and fenced code blocks. Never put HTML in `issue.js`: it is escaped.

### Chapters

Each chapter is one idea, in the order a user meets them:

```js
{
  title: 'Sealed on your device',          // short, becomes the comic heading
  lede: 'One or two plain sentences.',     // the quiet paragraph under the heading
  figure: { title: 'What leaves your browser', blocks: [ /* see below */ ] },
  says: "I store your bid. I just can't read it.",   // the hero's one-liner, optional
  deeper: `### A heading\nTechnical detail...`,      // "Behind the panel", optional but expected
}
```

A chapter with `cards: [['Title', 'Text'], ...]` instead of a figure shows red cards. Use it for the honest "what we don't claim" chapter, which every issue should end with.

### Figure blocks

A figure is a list of blocks, drawn top to bottom. Static: nothing on the reading page is clickable except links. The hands-on part belongs in the game.

| Block | Shows |
|---|---|
| `{ kv: [['Label', 'value'], ['Label', 'value', 'bad']] }` | Labelled boxes. `'bad'` or `'key'` colours one. |
| `{ via: 'Sealed with AES-128-GCM', icon: 'lock' }` | A small labelled arrow between boxes. |
| `{ rules: [['yes', 'text'], ['no', 'text']] }` | Green tick and red cross rows. |
| `{ timeline: [['Label', 'text'], ['Label', 'text', 'open' or 'sealed']] }` | A compact numbered sequence. Keep it under about seven steps so it fits one phone screen. |
| `{ checks: ['...', '...'] }` | A ticked checklist. |
| `{ spots: [['icon', 'problem', 'fix', chapterNumber]] }` | Problem cards with their fix and a link to the chapter. |
| `{ tiles: [['Title', 'value'], ...] }` | Small tiles in a row (three fit a phone). |
| `{ table: { head: [...], rows: [[...]], win: rowIndex } }` | A small table, one row highlighted. |
| `{ note: 'text' }` | A grey caption. |
| `{ status: ['good' or 'bad', 'text'] }` | A green or red result box. |
| `{ tryLink: 'Seal your own value in the game' }` | A button to `/try`. Use it at the end of figures the game lets visitors do themselves. |
| `{ sealDemo: { plain: 'text', labels: {...} } }` | Real AES-128-GCM output for that text, computed at build time. |
| `{ shamirDemo: { holders: ['A', 'B', 'C'] } }` | Real Shamir 2-of-3 shares of the previous `sealDemo` key. |
| `{ merkleDemo: { entries: [8 strings], edit: [index, 'edited text'] } }` | A real RFC 9162 Merkle tree with the edited path in red. Use 2, 4 or 8 entries. |
| `{ sharesDemo: { rows: [['A', 42, 'Result']], win: 0, holders: [...] } }` | Real additive shares of each number. |

Icons for `spots` and `via`: mail, lock, unlock, key, eye, eye-off, mega, doc, check, x, shield, mask, server, link, trophy, clock, clip, cpu, globe, users, browser, building, vault, gavel.

### The game

`game: { title, description, steps: [...] }`. Five to eight steps works best: about two minutes. Every step has a `type` and usually `title`, `text`, `tag` (the small red label, like "Step 2 · Seal"), `next` (the bottom button's label) and `badge`.

**`badge` is a promise to the visitor, so get it right:**

- `'live'`: the step runs the real cryptography on the phone (seal, shamir, hash, merkle).
- `'toy'`: real pieces, simplified (aggregate: the shares are real but the phone adds them up itself).
- `'illustration'`: nothing is computed; it shows what the real system does (checks, story).

`says` adds the hero's bubble (`saysTop: true` puts it above the panel, `saysBig: true` makes it larger).

| Type | What the visitor does | Key fields |
|---|---|---|
| `story` | Reads | `text` |
| `input` | Types a value | `key` (name to use later), `kind: 'number'` or text, `unit`, `label`, `example`, `min`, `max`, `error` |
| `seal` | Watches their value get encrypted (AES-128-GCM) | `plain` (the text to seal, for example `'{"vote":"{choice:raw}"}'`), `show`, `labels` |
| `shamir` | Taps holders: one share is noise, two rebuild the key | `holders` (three names), `one`, `two` |
| `hash` | Edits text and watches its SHA-256 change | `from` or `text`, `label`, `same`, `changed`, `flag` |
| `merkle` | Edits their log entry; the tree and root turn red | `entries`, `mine` (their index), `ok`, `caught` |
| `aggregate` | Their value plus others, combined on shares | `op: 'min'`, `'max'`, `'sum'` or `'average'`, `from`, `others: { count, label, min, max, step }`, `win`, `lose`, `tie`, `result` |
| `choice` | Picks one of a few buttons | `options: [{ label, reply, good, flag }]`, `required` |
| `checks` | Watches a checklist tick through | `items`, `result` |
| `recap` | Reads a summary of what they did. Must be last | `lines`, `readHref` |
| `custom` | Anything else, in JavaScript | `render(api)` and `reset(api)`, see below |

Templates in text: `{name}` shows a value the visitor entered, formatted (`LKR 12,000,000`); `{name:raw}` is the plain value (`12000000`). Steps also set `{sealedHash}`, `{rebuiltBy}`, `{winner}`, `{winnerValue}` and `{result}`. Any text field can depend on what happened: `{ if: 'won', then: '...', else: '...' }`. Flags set by steps: `rebuilt`, `tampered`, `changed` (or your `flag`), `won`, `lost`, `tie`, `computed`, plus any `flag` on a choice.

A `custom` step gets `api` with `body` (the element to draw into), `state` (values, flags, vars), `E` (the crypto helpers in `engine/assets/js/crypto.js`: `seal`, `open`, `split2of3`, `combine2`, `merkleLevels`, `shareAdditive`, `addShares`, `hex`, `random`, `R`), `MD` (text formatting), `fill`, `say(el, text, 'good'|'bad')`, `wait(ms)` and `ready(true|false)` to enable the Next button. Use it only when no built-in type fits, and keep it honest: if it isn't the real algorithm, badge it `'toy'` or `'illustration'` and say so in its text.

Game design that works at a stall:

- Start with a short `story` that sets the scene and casts the visitor in a role ("You're a student giving feedback").
- Get one value from them early (`input`) and carry it through every later step, so the story is about *their* value.
- Give them one chance to try to cheat and get caught. It's the step people remember.
- End with an outcome (they win or lose, their vote counted) and a `recap` built from what they actually did.

## Writing rules

People read this on a phone, standing up, in a noisy hall.

- Chapter titles: four words or so. Ledes: two sentences, about 40 words at most. Figure notes: one or two sentences.
- Plain words first. Name a technical term when the reader needs it, and say what it gives them in the same breath. Save the detail for `deeper`.
- `deeper` can be properly technical: algorithms, parameters, what is proven and to whom. It is for lecturers and judges, so be precise.
- No hype: no "revolutionary", "seamless", "cutting-edge", "next-generation", "leveraging", "empower". No exclamation marks except in the hero's speech bubbles.
- Don't use em dashes. Use a comma, a colon, or two sentences.
- Sound like a person explaining their own project. Short sentences, active voice.
- Never claim what isn't built. If something is planned, say "next" or leave it out.
- End the chapters with an honest "What we don't claim" chapter using `cards`.

## Step 4: art

The group's art is in `art/`. If something is missing, ask for it:

- **Cover:** a hero (a tall figure, transparent background) or a crowd (wide, transparent), as WebP or PNG, about 600 to 1000 px wide. Over about 300 KB, resize it.
- **Emblem:** the square logo mark, transparent, SVG or PNG (256 px is plenty). It's also the browser tab icon.
- **Avatar:** a 240 x 240 crop of the hero's face (or one face from the crowd), for the speech bubbles.

To crop an avatar with Python and Pillow: `Image.open('art/hero.webp').crop((x, y, x + s, y + s)).resize((240, 240)).save('art/avatar.webp')`. Show the group the crop before you keep it.

## Step 5: build and check

```bash
node tools/build.mjs                    # writes dist/; lists anything missing and stops if so
cd tools && npm install && npx playwright install chromium && cd ..   # once
node tools/og.mjs                       # writes dist/og.jpg, the share preview
node tools/check.mjs                    # phone and laptop screenshots, plays the game to the end
```

Run `og.mjs` again after every build, since the build clears `dist/`. Then look at every screenshot in `tools/out/`. The checker catches errors, sideways scrolling and a stuck game, but not a sentence that reads badly, a figure that crowds the screen or a colour that's hard to read. Fix what you find, rebuild and check again.

## Step 6: hand it over

Tell the group, in a few lines:

- The chapter list and the game steps, one sentence each.
- Anything you left open or couldn't verify.
- How to deploy: upload the **contents** of `dist/` to Cloudflare Pages (Create project, Direct Upload) or any static host. `dist/_headers` sets a strict security policy on Cloudflare Pages; other hosts ignore it.
- That `siteUrl` must match where they deploy, or the share preview won't show.
