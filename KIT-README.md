# Stall site kit

The website your stall QR code points to: a comic "issue" that matches your printed backdrop, with a two-minute game people play on their phones. You fill in one file, `issue.js`, and the build turns it into a static site you can upload to Cloudflare Pages.

See it working: **https://etendering.syvendra.com** is Issue #1, built from `examples/etendering/issue.js`.

## What you get

- **A cover:** your hero or crowd art, your logo and lettering, and the speech bubble from your backdrop. Under them sit two buttons: *Try it on your phone* and *Read the issue*.
- **The reading page:** one chapter per idea, each with a plain explanation, a static comic figure, a one-liner from your hero, and a *Behind the panel* section for the technical detail.
- **The game** at `/try`: one step per screen. The visitor types a value and watches it get sealed, split, hashed or combined with real cryptography in their browser, tries to cheat, and sees the outcome.
- Phone first, works on a laptop, nothing loads from the internet, and a strict security policy.

## Getting started

1. Unzip this kit.
2. Unzip your group's file (`<project>-issue.zip`) **into the kit folder**, so `issue.js` and `art/` sit next to `engine/`.
3. Open the kit folder in Claude Code (or another coding agent) and paste:

   > Read AGENTS.md and help us build our stall website. Interview us one question at a time, and show us the chapter and game outline before you write issue.js. Our project report is at `<path or link>`.

4. Have ready: your report, README or slides, and an answer to everything marked `ASK` in `issue.js` (for example the address your site will live at).

The top of your `issue.js` is already filled in from your backdrop: issue number, name, kicker, speech bubble, colours and art. The rest comes from you. The build refuses to run while anything is missing, so a half-finished site can't go live by accident.

## Building it yourself

You need Node 20 or later.

```bash
node tools/build.mjs        # checks issue.js and writes dist/
cd tools && npm install && npx playwright install chromium && cd ..   # once, for the next two
node tools/og.mjs           # the share preview, dist/og.jpg
node tools/check.mjs        # screenshots in tools/out/ and a play-through of the game
```

To preview the finished example: copy `examples/etendering/issue.js` and its `art/` folder to the kit root, then build.

## Deploying

Upload the **contents** of `dist/` to Cloudflare Pages (*Create a project → Direct Upload*), then add your custom domain if you have one. `siteUrl` in `issue.js` must match the final address, or link previews won't show your image.

If you switch on Cloudflare Web Analytics, set `analytics: true` in `issue.js` and rebuild. Otherwise the security policy blocks Cloudflare's script, which only shows up as a console error.

## Folder map

| Path | What it is |
|---|---|
| `issue.js`, `art/` | Yours: everything specific to your issue. |
| `AGENTS.md` | Instructions for the agent: the interview, every field, figure block and game step, and the writing rules. |
| `engine/` | Shared: styles, fonts, the game engine and the cryptography. Don't edit it for one group's content. |
| `tools/` | Build, share preview and checker. |
| `examples/etendering/` | A complete issue to learn from. |

## Credits

Fonts: Bangers, Sora and JetBrains Mono, under the SIL Open Font License (licences in `engine/assets/fonts/`). Built from the eTendering stall site by group r00tk1t.
