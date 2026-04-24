# Submission assets

Itch.io page copy, cover image, screenshots, and GIF for the Gamedev.js Jam 2026 submission.

- `cover.png` — 630×500 page thumbnail (TODO: capture from title screen)
- `screenshot-01.png` … `screenshot-05.png` — 1280×720 gameplay stills (TODO)
- `gameplay.gif` — 10–15 second loop (TODO)
- `description.md` — itch.io page copy (ready)
- `build.zip` — `dist/` zipped for upload (regenerate with `npm run build && cd dist && zip -r ../submission/build.zip .`)

Capture instructions:
1. `npm run dev`, open in Chrome.
2. Set window to 1280×720 (DevTools → Toggle device toolbar → Responsive → 1280×720).
3. Title screen screenshot → `cover.png` (crop to 630×500) + `screenshot-01.png`.
4. Chamber select → `screenshot-02.png`.
5. One screenshot per chamber at a characteristic moment (cube detonating, portal pulse, etc.).
6. Record the first 15 seconds of Genesis → The DAO using a screen recorder, export as GIF (ffmpeg `palettegen` works well).
