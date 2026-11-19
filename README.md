# Vice Coast Cover Studio

[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/competitions/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/bismilahdestia/gta6-cover-art-01-entry-v1/rank.svg)](https://make.fun/competitions/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/bismilahdestia/gta6-cover-art-01-entry-v1/reward.svg)](https://make.fun/competitions/gta6-cover-art-01)

An offline web app that turns any photo into GTA-style multi-panel cover art —
the Vice City sunset-poster look, exported as a PNG to share. Everything runs
in the browser from static files; photos are read on your own machine and never
uploaded.

## How it works

1. **Add photos** from your machine, or load the two bundled sample photos.
2. Pick one of **6 layouts**: Nine-Panel Grid, Hero + Three, Full Bleed,
   Tilted Snapshots, Diagonal Split, or Triptych.
3. Click a panel to select it, click a photo in the tray to fill it, then
   **drag to pan** and slide to zoom. One photo can fill several panels.
4. Pick one of **6 colour grades** (Vice Sunset, Neon Night, Palm Gold,
   Teal Noir, Hot Pink, Mono Ink) — gradient-map duotones with a warm overlay.
5. Edit the **caption**: big Anton title, Pacifico neon-script subtitle,
   badge ribbon, title colour and outline, plus grain, halftone and vignette.
6. **Export PNG** in 1080 × 1080, 1080 × 1350 or 1920 × 1080 — one size, or
   all three at once. Undo and redo cover every change.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network request: every script, font and image is a file
under `app/`. Fonts are Anton and Pacifico under the SIL Open Font License
(see `app/fonts/`). All artwork is original — no Rockstar Games logo,
artwork or font.

## Entry

Built for the make.fun bounty **gta6-cover-art-01** ("Make GTA 6 Cover Art").
`main.ts` copies `app/` and `screenshots/` to `/output` and writes
`/output/dossier.json` with the vendored make.fun library.
