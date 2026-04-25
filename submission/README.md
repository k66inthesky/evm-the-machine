# Submission assets

Itch.io page copy, cover image, screenshots, and build for the Gamedev.js Jam 2026 submission.

- `cover.png` — 630×500 page thumbnail.
- `screenshot-01-limit.png` … `screenshot-08-merge.png` — 1280×720 stills, one per chapter, showing each chapter's diegetic focal scene.
- `description.md` — itch.io page copy (markdown; itch converts inline).
- `build.zip` — `dist/` zipped for upload (regenerate with `npm run build && cd dist && zip -r ../submission/build.zip .`).
- `DEPLOY.md` — step-by-step upload checklist for itch.io / Wavedash / Sepolia.

The screenshots match the v2 chapter set (LIMIT · WHITEPAPER · SPACESHIP · CROWDSALE · THE DAO · FORK · BLOOM · MERGE) and were captured at 1280×720 from the actual game build, then run through `pngquant --quality=70-92 --strip` for a ~7× size reduction.

## Re-capturing screenshots

If you change a chamber's visuals and want to refresh the screenshot:

1. `npm run dev` and open `localhost:5175` in Chrome at 1280×720.
2. Click "BEGIN" → click the chapter card → dismiss the briefing.
3. Stand at the spawn point looking at the focal object (default yaw is correct).
4. DevTools console → `document.querySelector('canvas').toDataURL('image/png')` and save the data URL as `submission/screenshot-NN-name.png`.
5. Run `pngquant --quality=70-92 --strip --force --ext=.png submission/screenshot-*.png` to compress.
