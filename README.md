# E-Privacy: landing page, game and slides

The public face of [E-Privacy](https://github.com/seniru-dilmith/E-Privacy), built with the stall kits.

| Folder | What it is |
|---|---|
| `dist/` | The built landing page and the phone game (`/try`). Upload the contents to any static host. |
| `static/` | Favicons and the web manifest, copied into `dist/` on build. |
| `issue.js`, `art/` | The content and artwork. Edit `issue.js`, then rebuild. |
| `engine/`, `tools/` | The shared site engine, build and check scripts (see `KIT-README.md`). |
| `presentation/` | The looping stall slides. Open `presentation/index.html` in Chrome, no server needed. |

## Rebuild the site

```bash
node tools/build.mjs
cd tools && npm install && npx playwright install chromium && cd ..   # once
node tools/og.mjs      # share preview, dist/og.jpg
node tools/check.mjs   # screenshots and a play-through of the game
```

`siteUrl` in `issue.js` is `https://e-privacy.seniru.dev`; change it if you host elsewhere.

The page links to the running app at `/login`, so host the site on the same domain as the app, or edit that link in `issue.js`.

An academic project by group Trazeus. Fonts under the SIL Open Font License (see `engine/assets/fonts/`).
