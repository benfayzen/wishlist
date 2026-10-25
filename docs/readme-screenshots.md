# README screenshots

The gallery is captured from the real production build, with an English UI and
English demo content. It uses a dedicated SQLite database and upload directory
under `data/readme-demo`. The scripts ignore `DATABASE_URL`; neither the existing
native preview nor a running installation is modified.

## Reproduce the gallery

Use the Node and pnpm versions declared in `package.json`:

```sh
pnpm install --frozen-lockfile
pnpm exec svelte-kit sync
pnpm prisma generate
pnpm build
pnpm exec playwright install --with-deps chromium
pnpm screenshots:readme
```

The capture command initializes the database, starts the production server at
`http://127.0.0.1:4183`, signs in through the normal login form, captures the PNGs
in `assets/`, and stops its server. Port 4183 must be available. It waits for
visible images, icons and fonts, checks the English document language and
horizontal overflow, and fails on browser errors. Most desktop captures use 1440 × 960; the full form uses 1440 × 1600
and the wide dark-mode view uses 1920 × 960. Mobile captures use 390 × 844. Motion is reduced for stable captures.

For a manual preview:

```sh
pnpm preview:readme
```

With that server already running, use
`pnpm screenshots:readme --existing-server` to capture without starting or stopping
another server. `pnpm db:seed:readme` initializes the demo without starting it.

## Fictional accounts and scenarios

All seven accounts start with the local demo password `SouthPark2026!` and prefer
English. These credentials belong only to the documentation database.

| Username      | Character       | Groups                           |
| ------------- | --------------- | -------------------------------- |
| `demo.stan`   | Stan Marsh      | Marsh Family; South Park Friends |
| `demo.randy`  | Randy Marsh     | Marsh Family                     |
| `demo.sharon` | Sharon Marsh    | Marsh Family, group manager      |
| `demo.shelly` | Shelly Marsh    | Marsh Family                     |
| `demo.kyle`   | Kyle Broflovski | South Park Friends               |
| `demo.kenny`  | Kenny McCormick | South Park Friends               |
| `demo.eric`   | Eric Cartman    | South Park Friends               |

Stan manages South Park Friends and initially views Marsh Family. There are 11
lists, 44 approved wishes, two pending suggestions and 33 claims, covering
available, reserved, purchased and partially claimed quantities. Prices use USD.
The two shared planning lists allow owner claims and have a delegated manager;
Sharon's Cozy Corner is public. Email addresses use the reserved `.example` domain.

Seeding again preserves passwords, active groups, edits and claims. The capture
script switches Stan's active group through the application API and restores
Marsh Family after a successful run. It fills the create-wish form without
submitting a new item. To recover the exact original fixtures after manual edits,
stop this demo server and remove only `data/readme-demo` before seeding again.
Never remove a production database or another preview directory.

## Gallery

| File                             | What it shows                                                     |
| -------------------------------- | ----------------------------------------------------------------- |
| `assets/homepage-desktop.png`    | Marsh Family, availability and stacked pending approval           |
| `assets/homepage-mobile.png`     | Compact overview and bottom navigation                            |
| `assets/friends-desktop.png`     | Stan, Kyle, Kenny and Eric, with the group picker open            |
| `assets/my-wishes-mobile.png`    | Owner controls and own wishes in the mobile text-only list        |
| `assets/wishes-mobile.png`       | A friend's wishes and claim controls in the mobile text-only list |
| `assets/account-menu-mobile.png` | Identity, groups, language and theme controls                     |
| `assets/wishes-desktop-dark.png` | Dark mode and the list's generated color palette                  |
| `assets/claims-desktop.png`      | Gifts for Shelly in tile view, grouped by recipient               |
| `assets/wish-form.png`           | Filled English wish form with an uploaded image                   |

## Image sources

Character names and artwork belong to their respective owners. The characters are
fictional examples; this project is not affiliated with South Park.

Character images are referenced from the article images for
[Stan](https://en.wikipedia.org/wiki/Stan_Marsh),
[Kyle](https://en.wikipedia.org/wiki/Kyle_Broflovski),
[Kenny](https://en.wikipedia.org/wiki/Kenny_McCormick),
[Eric](https://en.wikipedia.org/wiki/Eric_Cartman), and the South Park Archives
pages for [Randy](https://southpark.wiki.gg/wiki/Randy_Marsh),
[Sharon](https://southpark.wiki.gg/wiki/Sharon_Marsh) and
[Shelly](https://southpark.wiki.gg/wiki/Shelley_Marsh).
Product photographs come from [Unsplash](https://unsplash.com/); their image IDs
are recorded in `prisma/seed-readme.ts`.

The seed downloads images into the ignored demo upload directory on its first run
and caches them for later use. Network access is required for the first seed and
for the application's Iconify icons. Only the resulting application screenshots
are committed, together with the seed and capture scripts.
