# Logo assets

- Reference artwork: `wishlist-gemini-original.jpg`.
- Application source: [`wishlist-logo.png`](../../src/lib/assets/wishlist-logo.png).
- Generated favicon, touch, PWA and Windows icons: [`static/`](../../static/).
- Safari monochrome mask: [`safari-pinned-tab.svg`](../../static/safari-pinned-tab.svg).

After changing the application source, regenerate the platform icons:

```sh
pnpm icons:generate
```

The generator uses the transparent application PNG. Apple touch and maskable
Android icons receive an opaque background; the maskable icon keeps the artwork
inside the safe area.

The Safari mask is maintained separately. Update it when the artwork changes,
and update the versioned icon URLs in `src/app.html` and `vite.config.ts` so
installed clients can refresh cached icons.
