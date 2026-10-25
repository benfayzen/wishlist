# Wishlist logo

`wishlist-gemini-original.jpg` is the Gemini design supplied by the user on
2026-10-24. Keep this original when preparing future assets.

The built-in ImageGen tool prepared a transparent rendition in
`src/lib/assets/wishlist-logo.png`. The app displays it with `object-fit: contain`
without corner clipping. Platform sizes are rendered deterministically by
`pnpm icons:generate`; Apple and maskable Android icons use the app's light tonal
background. The Safari mask is a separate simplified monochrome SVG.

Background-removal prompt:

> Use case: background-extraction. Edit the supplied finished Gemini Wishlist logo ONLY to remove its white background. Preserve the exact gift and parchment drawing, exact geometry and placement, exact lavender, purple and golden yellow colors, all three horizontal purple lines, every curl and the hollow ribbon bow. Do NOT redesign, simplify, restyle, add objects, change proportions, alter colors, or introduce shadows. All white background pixels, including enclosed white holes within both bow loops, become genuinely transparent. Retain antialiased clean edges. Keep the complete logo uncropped with a little transparent margin and a square canvas. Deliver one isolated exact logo on actual transparent background, no mockup, no text, no white tile.

## Verification — 2026-10-24

- `pnpm check`: zero errors; ten existing Svelte warnings.
- `pnpm build`: passed, including service-worker generation. Existing chunk-size
  and empty prerender-glob warnings remain.
- Targeted Prettier and ESLint: passed.
- Fourteen Chromium tests: setup, adaptive navigation at six widths, German
  light/dark UI at three widths, and custom list palette inheritance/reset.
- Seven PNG dimensions/alpha channels, three ICO frames, manifest entries, and
  the maskable foreground's placement inside the safe circle: verified.
- All nine versioned platform icon URLs returned HTTP 200 with networking
  disabled after installing the production service worker in Chromium.
- Platform previews and actual desktop/mobile app screenshots reviewed. Native
  iOS/Android installation was not tested on physical devices.
- All five README gallery screenshots refreshed from an isolated copy of the
  preview database using demo accounts; no page errors or horizontal overflow.

Local logs and screenshots are in the ignored `data/logo-*` files/directories.
