# Wishlist Development

## Prerequisites

- node v24.15.x
- [pnpm](https://pnpm.io/installation) v11.x

## Install dependencies

```sh
pnpm install
```

## Running Locally

### Create an env file

Copy `.env.example` to `.env`. The Prisma config (`prisma.config.ts`), the Prisma
client, and SvelteKit all load `.env` automatically via `dotenv`.

```sh
cp .env.example .env
```

Database URL needs to be an **absolute** `file:` URL.

```sh
echo "DATABASE_URL=\"file:$(pwd)/prisma/dev.db\"" >> .env
```

### First Time Run

Create the 'uploads' directory in the project root to store item images.

```sh
mkdir -p uploads
```

Setup Prisma ORM and development database:

```sh
pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma db seed
pnpm db:patch
```

### Start dev server

```sh
pnpm dev
```

### Running checks

These checks are run in the CI pipeline.

```sh
pnpm check
pnpm lint
pnpm format --write
```

### Build

```sh
pnpm run build
```

## Demo data for the native preview

After starting `pnpm preview:native` once, run `pnpm db:seed:dev` to add demo data
to `data/m3-preview/wishlist.db`. This command ignores `DATABASE_URL` and only
targets that local preview database. Existing data and subsequent edits to demo
lists, reservations, passwords and active groups are preserved on repeated runs.

The seed adds six accounts, three groups, thirteen lists (one empty), 74 wishes,
and reservations covering single items, partial quantities, multiple reserving
users, purchased items and unlimited quantities. It also includes a public list
with a guest reservation, pending suggestions, a delegated list manager, an item
shared across two groups' lists and a shared planning list allowing owner claims.

Log in at `http://localhost:4173` with any of `demo.anna`, `demo.ben`, `demo.clara`,
`demo.david`, `demo.emma` or `demo.felix`. Their initial password is
`Wunschliste2026!`. Anna manages the family group, Clara the friends group and
Emma the team group. These are group roles; the demo users are regular users
globally.

The existing `preview` account also joins all three demo groups, keeping its
current active group and password. Switch to **Demo · Familie**,
**Demo · Freundeskreis** or **Demo · Team** in the group selector to see the lists.
The preview user has reservations to edit immediately under **My Claims**.

For example, open **Annas Geburtstag** as `demo.ben`: the backpack is free, the
bottle is reserved, the headlamp is purchased, and the socks have two of four
units reserved. **Teamfeier · gemeinsam planen** also allows its owner Emma to
reserve items. Open `/lists/dev-demo-list-emma-public` in a private browser window
to test guest reservations.

## English README demo and screenshots

A separate South Park demo lives in `data/readme-demo`; it never uses
`DATABASE_URL` or changes the native preview database. Run `pnpm db:seed:readme`
to initialize it, `pnpm preview:readme` to browse it, or
`pnpm screenshots:readme` to start it temporarily and capture the README gallery.
Build the application first. See [the screenshot guide](docs/readme-screenshots.md)
for accounts, data, image sources and the complete workflow.

## App icons

After replacing `src/lib/assets/wishlist-logo.png`, run `pnpm icons:generate` to
regenerate the PNG icons and multi-size favicon. The app uses a transparent logo;
Apple touch icons and maskable PWA icons use an opaque tonal background. The
maskable icon keeps the entire gift and scroll inside the central safe circle.
Safari uses the simplified monochrome gift and scroll in `static/safari-pinned-tab.svg`.
When changing the artwork, also update that silhouette and bump the icon URL
version in `src/app.html` and `vite.config.ts` so cached icons can refresh.

The supplied Gemini original is preserved in `assets/branding/wishlist-gemini-original.jpg`.
`src/lib/assets/wishlist-logo.png` is the transparent app rendition prepared with
the built-in ImageGen background-removal tool. Its gift, scroll and list motif
is retained. All platform icons are generated from that PNG without AI resizing.

## Building Docker

```sh
docker build . --tag wishlist-dev:latest
```

Specific platform, current linux/amd64 and linux/arm64 are confirmed supported

```sh
docker build . --tag wishlist-dev:amd64 --platform linux/amd64
docker build . --tag wishlist-dev:arm64 --platform linux/arm64
```

## Internationalization (I18n)

Edit only the en.json file. All other language translations will be handled via Weblate. [See README's Translation section for more infomraiton](README.md#translations)
