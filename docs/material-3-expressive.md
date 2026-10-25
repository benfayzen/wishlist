# Wishlist Material 3 Expressive

## Baseline and inventory

The original UI mixed Skeleton standalone inputs, input-group grids, per-cell tonal surfaces,
Tailwind forms resets, a global `> * + *` divider with `!important`, and local ring utilities.
This gave composed fields multiple outlines. Shared Input/Label covered profile forms but
not raw admin/claim inputs. Some actions were excluded from the tab order. Auth forms and
profile had fixed minimum widths. Entire clickable cards inherited heavier typography.

Migration inventory:

| Area                                                 | Shared contract / implementation                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Login, registration, setup, forgotten/reset password | m3-label/input/button, PasswordInput, CreateAccountForm                                           |
| Item create/edit/import                              | FieldShell, CurrencyInput, FileUpload, MarkdownEditor, FormSection, choice lists and form actions |
| List create/manage                                   | ClearableInput, IconSelector, Checkbox, MarkdownEditor, common actions and preview card           |
| Account and admin profile                            | Input, Label, PasswordInput, native Skeleton profile-photo upload trigger                         |
| Admin/group/system settings                          | SettingsGroup → FormSection; all native inputs/selects use the same primitives                    |
| Reservations and prompts                             | BaseModal/ModalContent, shared native input/button primitives                                     |
| Menus and comboboxes                                 | Retained Skeleton keyboard/focus behavior, semantic M3 surface roles and global context           |
| List and tile cards                                  | Separate layouts; common content, claims, manage and reorder actions                              |

`src/styles/material.css` owns the explicit `m3-*` class contract. Native controls and Svelte
wrappers use these same primitives, rather than adding a second style system over Skeleton
input components. Removed `styles/input.css` and `styles/button.css` implementations are
retained as comments for downstream compatibility. No route-specific CSS or new `!important`
fixes are required. Existing print-only important rules remain.

## Material source versus product decisions

Sources: [Material Color Utilities](https://github.com/material-foundation/material-color-utilities),
[Material guidelines](https://m3.material.io/), the installed `m3-expressive` skill's
`references/tokens.md`, `component-tokens.md` and component input/button/containment references.

From M3: semantic paired roles (primary/on-primary, secondary container/on-secondary-container,
surface/on-surface, error/on-error), HCT tonal palettes, tone-based surface containers,
56px outlined-field height adapted to CSS, the 8/12/16/28px shape steps, 14/20px label typography,
16/24px body typography, selective emphasis, visible states, and non-overshooting effects
motion. Effect transitions use the documented web approximation (200ms, .34/.8/.34/1);
pressed button shape uses the fast-spatial fallback (350ms, .42/1.67/.21/.9).

Product decisions (not official Material templates):

- A logo-derived default palette: violet `#8b1fea` for primary actions, periwinkle `#9298e9`
  for secondary selection and golden amber `#f7bc2d` for tertiary accents. These are product
  color choices, not official M3 brand colors. Material Color Utilities generates paired
  roles for light and dark modes, with softly violet-tinted neutral surfaces. Custom list
  colors continue to use SchemeTonalSpot. The create-item FAB uses the tertiary container
  and its paired foreground to echo the logo's golden scroll, including matching hover layers.
- Google Sans Flex for all text, with roundness/width axes for display headlines. Font is
  self-hosted from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/googlesansflex);
  `static/fonts/google-sans-flex/OFL.txt` and TRADEMARKS.md ship with it. No Google Fonts requests.
- Page titles live in the persistent header at every viewport width. Inspired by the supplied
  reference, the title uses a fully rounded surface-container-lowest pill, primary text,
  800-weight italic Google Sans Flex and up to two lines for long names. On mobile (below
  640px), the title stays on one line and overflows with an ellipsis. The full text is retained
  for assistive technology and in the native tooltip. These are product choices,
  not an official M3 app-bar template. Signed-in pages show the logo only in the desktop rail;
  the bottom-navigation layout has no logo. The content title is retained for printing.
- 12px field corners (M3 outlined fields use 4px), 48px minimum button hit boxes, static labels
  above fields, responsive form grouping, 80rem content width and compact spacing.
- List icon colors use a native color picker inside the shared outlined field, with a 48px
  swatch, readable hex output and a reset action. This composition and the 8px gap above the
  icon combobox are product decisions; Material Web has no official color picker component.
- Image occupying one third of item rows from 640px, cropped with a fade/blur confined to its edge;
  compact mobile rows show text and actions without an image or placeholder, retaining a Most Wanted label;
  contain-fit tiles, full wrapping titles, adaptive content height, grid-aligned list cards.
- The form sections and product/login card layouts are Wishlist layouts, not M3 templates.
- “Most wanted” uses a decorative scalloped rosette with a star and an attached tonal text
  pill. This is a product composition inspired by M3 Expressive shape and emphasis tactics,
  not the official notification Badge component. The rosette uses tertiary/on-tertiary;
  the label uses tertiary-container/on-tertiary-container. The custom 40px emblem, 12/16px
  bold label, overlap and placement are product choices. In row images narrower than 192px,
  only the emblem is visible; the localized label remains available to assistive technology.
- Reduced-motion users receive no CSS animations or transitions; action behavior is unchanged.

## Context and authorization

`theme.ts` uses official Material Color Utilities to generate both light/dark role sets and an
adapter palette for retained Skeleton behavior/presets. Error, warning and success hues remain
semantic. Only opaque `#RRGGBB` seeds are accepted; invalid input falls back to the default.
The generated stylesheet contains only computed hex colors, selector literals and declarations.

List display/create/manage loaders return the stored seed only after their existing access
checks. Item edit accepts an origin list only if the item belongs to it, the user may access
that context and may edit there. Colors in arbitrary query parameters are never used.
The root layout derives its stylesheet from current page data, so body-portaled dialogs/menus
inherit it. Navigation to an unrelated page restores the default, including SSR and reloads.
There is no global mutable server theme store and no data-model migration.

### Logo palette verification — 2026-10-22

The logo-derived default was checked in the production build. The targeted Chromium run
passed all 11 tests, including the six German 320/768/1440px light/dark matrices, persisted
and system mode selection, and custom list palette inheritance/reset. A separate calculation
checked 110 text/background role pairs across the default and four custom seeds in both modes;
the lowest contrast was 5.47:1. Build, targeted Prettier/ESLint and diff checks passed;
Svelte check reported zero errors and ten existing warnings. Eight preview screenshots cover
the default overview and a custom-colored list at 320/1440px in both modes, with no page errors
or horizontal overflow. Logs are in `data/m3-verification/brand/`, screenshot metadata is in
`data/m3-verification/brand-review.json`, and captures are in `data/screenshots/logo-theme-*`.

## Isolated native preview and tests

Prerequisites: Node 24 and pnpm 12.13.0. Install dependencies, run `pnpm exec svelte-kit sync`,
`pnpm exec prisma generate`, then `pnpm build`.

- `pnpm preview:native`: serves the compiled application at http://localhost:4173 with its own
  `data/m3-preview/wishlist.db` and `data/m3-preview/uploads/`. First launch uses the normal setup wizard.
- `pnpm test:native`: uses `playwright.native.config.ts`, compiled build, port 4280 and a fresh
  `data/m3-tests/` database/uploads. It runs the existing UI suite and additional Material regressions.
- The original Docker-based test configuration is intentionally not used. Native commands do
  not invoke Docker. Explicit database URLs override dotenv values. No production data is copied.
- Browser layout assertions await `document.fonts.load` and `document.fonts.ready` before measuring.
- Screenshots and traces are test artifacts, not assertions that unvisited screens were reviewed.

Actual results and exceptions are recorded after execution below; the inventory alone is not
proof of browser coverage.

## Executed verification — 2026-10-21

- Production build: `pnpm build`, successful (Node 24.22.1, Chromium via Playwright 1.64).
- Full compiled-app run: **54 passed, 0 failed, no retries** in 1.8 minutes.
  Existing auth, claims, multi-list items, managers/permissions, public registry, suggestions,
  URL import and list CRUD tests ran together with the new regressions.
- After the final semantic text-button contrast/hit-area fix, the targeted palette/context test
  and setup ran again: **2 passed, 0 failed**. It checks both light/dark button roles and 48px height,
  create/edit/manage context, body-portaled dialog and default-theme reset.
- `pnpm lint`: passed (Prettier and ESLint). Generated test/runtime files and original font
  license files are excluded; source files remain checked.
- `pnpm check`: **0 errors, 12 warnings**. Eleven concern initial prop/state captures in existing
  components; one concerns the conditional button/none role and tabindex on the interactive item
  card. Enter/Space behavior is browser-tested, but the compiler warning remains visible.
- Six German layout matrices: 320/768/1440 CSS px × light/dark. Visited login, signup,
  forgotten password, list overview, item creation, list management, account/profile/security,
  admin users/groups and general/security/email settings, plus deletion dialog. Measurements wait
  for Google Sans Flex; assertions cover page overflow, composed-field inner contours and paired
  semantic role contrast. Admin direct-route selected tabs are asserted.
- Additional tests: real upload, markdown preservation, quantity/unlimited, create-another and
  imported-URL reset, keyboard import refresh/clear, real password reset token and new-password
  login, 1/3-width full-height desktop row image, text-only mobile rows, bounded content-driven card height, contain-fit tile,
  failed-image fallback, long titles, mobile reorder, reduced motion, RTL compound-field geometry
  and reservation dialog in both modes.
- Native preview manually inspected in Chromium with separate German demo account/data and real
  uploaded sample images. Twelve final captures cover list/item form at desktop/320px, profile at
  320px and admin at desktop in both modes. Font and visible Iconify icons load before captures.
  No page errors or horizontal overflow were reported in that audit.
- Independent read-only source and screenshot review completed. Findings about nested error
  contours, labels, authorized edit context, reorder width, product import reset, intrinsic image
  height, German select width and dark description text were fixed.

For filesystem performance under WSL, compilation/tests ran in `/tmp/wishlist-runtime/workspace`
with a source-identical copy and local dependencies. Sources and final compiled build were copied
back to this checkout. The active preview serves a stable build copy and uses only this project's
`data/m3-preview/` database/uploads/templates. The complete 54-test HTML report and logs are saved
under `data/m3-verification/`; final screenshots are under `data/screenshots/` (all ignored by Git).

Limits: automated browser coverage is Chromium, not Firefox/Safari. Live SMTP delivery and external
OIDC-provider integration were not exercised; their settings forms were checked. Not every possible
permission/state combination or modal was individually photographed. Retained Skeleton widgets
continue to own their keyboard behavior and consume the shared semantic palette. Original Iconify
icons still use the existing lazy-loading mechanism and may appear after the first frame.
Full-page screenshots can retain blank offscreen icons even after those icons loaded while scrolled
into view; those captures are not proof that all offscreen icons rendered simultaneously.
No production container/database was accessed or changed. No commit, push or deployment was made.

### Native preview login correction

The preview is opened at `http://localhost:4173`; its fixed ORIGIN must use that same host.
The initial `127.0.0.1` setting caused localhost form submissions to receive HTTP 403 from
SvelteKit's CSRF protection. The native runner now uses localhost for preview and retains
127.0.0.1 for the isolated test server. Use the advertised preview URL. The running preview
was restarted with the corrected setting, without replacing its data.

Verified in the compiled Chromium preview: clicking Sign in with the demo account succeeds,
redirects to lists, sets the session cookie and survives reload. Requests from another origin
(including the alternate loopback hostname) still receive 403. CSRF protection remains enabled.
The earlier full suite used 127.0.0.1 and did not cover this preview-host mismatch.

## Expressive navigation and connected selection controls

The view selector and light/dark/system selector now use the shared Svelte
`ConnectedButtonGroup` component with native toggle buttons and `aria-pressed`.
From M3: connected groups replace segmented buttons; use a 2px gap, small 40px visual
buttons inside at least 48px touch targets, independent selection/press shape morphs,
and tonal toggle colors. Tab moves between buttons; Space/Enter selects. Product
choice: both selectors require exactly one selection, use icon buttons with localized
names/tooltips, and retain the existing view cookie and theme localStorage preference.

Navigation now adapts by viewport rather than installation status. From M3: flexible
navigation bar with vertical items in compact windows and horizontal items in medium
windows; collapsed/expanded navigation rail on larger screens; surface-container fill,
secondary-container active indicators, and filled active/outlined inactive icons.
Geometry uses the published 64px bar, 96px collapsed rail and 56px expanded items.
Product choices: switch to the rail at 840 CSS px, expand it to 280px on request, keep
it collapsed initially, and stretch expanded indicators across the destination target.
The bar is fixed with safe-area padding and matching content clearance; the floating add
button uses the same clearance so it cannot cover a destination. Navigation uses short,
localized labels so the collapsed rail remains legible. Standard rail
expansion adjusts the content region; print removes navigation space. Unrelated account
and administration routes have no selected primary destination. List/item detail routes
belong to the overview destination; filtered personal lists retain their own selection.

Theme initialization and system preference observation live in the document shell so
system color changes work while the account menu is closed. New components share the
existing expressive spatial/effects motion tokens and reduced-motion behavior. These
are implementations of the M3E specification in Svelte, not official Google web widgets.

Validation of this follow-up: production build passed; Svelte check reported 0 errors
and the existing 12 warnings in unrelated components; targeted ESLint and formatting
checks passed. All 21 Chromium setup/material/navigation tests passed, including
320/768/1024/1440px navigation, exclusive selection and reload persistence, keyboard
activation, system theme changes with the menu closed, reduced motion, and FAB clearance
above the navigation bar. Reports are saved under `data/m3-verification/navigation/`.

Final visual review also removed inherited account-menu button padding from the connected
mode control and restored its focus ring. Seven targeted navigation/setup tests passed
again, including a 2px visual separation assertion for the mode selector.

### Popup stacking correction

Shared portaled popovers now default to the existing menu layer above navigation and
below modal backdrops. Explicit overrides for popovers inside dialogs remain supported.
This fixes the list filter being covered by the navigation rail. Production build,
targeted lint and all eight navigation/setup tests passed. The regression test checks
menu hit testing and layer order for collapsed/expanded rails in light/dark mode,
then selects and applies filters. Preview captures confirm the menu remains in front.
Reports: `data/m3-verification/popup-layer/`.

Filter menus now use logical start alignment (`bottom-start`) with their trigger rather
than centering beneath it. The shared popup exposes placement while preserving existing
placement for account and other menus. The navigation regression also verifies matching
left edges for the list filter with both rail states.

Alignment follow-up validation: production build and Svelte check passed (0 errors,
12 pre-existing warnings); targeted lint/format checks passed. The updated list-filter
regression passed with both rail states and light/dark modes, including applying and
resetting the filter. Preview screenshots confirm matching left edges; fractional
browser coordinates are allowed within half a CSS pixel. Reports are saved under
`data/m3-verification/popup-alignment/`.

### Rounded content pane and compact app bar

From M3: a scaffold separates bars, rails and content panes; body/pane uses surface,
navigation uses surface-container. The small app bar has a 64dp container height and
uses title-large typography. Product decisions: adapt that bar to 64 CSS px with a
32px product logo, 40px avatar inside a 48px target, and place the content in a surface
pane with the M3 extra-large 28px shape and an 8px outer gutter. The pane radius and
gutter are choices for this product, not prescribed pane measurements. The desktop
leading edge joins the navigation rail; compact screens retain a gutter on both sides.
The main region retains its maximum reading width. On compact screens, the 8px pane
gutter plus 8px inner padding preserve the 16px total content margin and usable width.
The compact signed-out theme selector hides its visual group label while retaining its
accessible name, allowing the bar to remain compact. Print removes the decorative frame.

Validation: production build, lint and formatting passed; Svelte check has 0 errors and
12 existing warnings. All 22 material/navigation/setup tests passed; six mobile tests
passed again after preserving compact content width. Ten German preview captures cover
claims at desktop, expanded rail, tablet and 320px in both modes, plus populated lists.
The preview audit checks header height, pane radius, page overflow and runtime errors.
Reports: `data/m3-verification/content-pane/`.

### Persistent rounded viewport

The app shell now fills the dynamic viewport and keeps the header, navigation and rounded
pane stationary. The main landmark scrolls inside the pane, whose overflow clips content
at its rounded corners. This preserves the silhouette even after scrolling a long list.
Browser history entries retain independent pane scroll positions through typed SvelteKit
page state; changing destinations resets the pane, while query-only updates preserve it.
Active-destination actions and create-another scroll the pane rather than the window.
Standalone pull-to-refresh checks the pane's scroll position. Print expands the pane
and disables clipping so content beyond the first viewport remains printable.

Validation: all 24 material/navigation/scroll/setup Chromium tests passed. New real-scroll
regressions cover mouse wheel and PageDown, stable pane geometry and corner clipping,
no document scrolling or horizontal pane overflow, last-item access, modal/query changes,
route reset, Back restoration, and print expansion at 320/1440px in both themes.
Production build, targeted lint and formatting passed; Svelte check has 0 errors and
12 existing warnings. Reports: `data/m3-verification/persistent-corners/`.

### Edge-to-edge content with bottom navigation

When bottom navigation is visible (below the 840px rail breakpoint), authenticated
content panes have no leading or trailing outer gutter. Compact inner padding keeps
the 16px text margin. Desktop rail layouts and signed-out layouts retain their gutters.
The stationary rounded viewport and bottom spacing are unchanged.

Validated in the compiled preview at 320/768/839/840/1024/1440px: panes exactly match
viewport edges with bottom navigation, rail layout gutters remain unchanged, compact
text padding stays 16px, and content has no horizontal overflow. Signed-out gutters
were checked separately. Production build and formatting passed.

## Component audit implementation — 2026-10-22

Claims grouping now reuses the labeled ConnectedButtonGroup. Filter triggers have a
shared chip treatment with explicit active state. BaseChip derives committed values
from the URL, matches sort value and direction together, safely handles malformed or
unknown values, and keeps draft multi-selection separate until Apply. Cancel, outside
click and Escape discard drafts. Native radio/checkbox inputs expose the selected state.
AdaptivePicker preserves a contextual popover on larger screens and uses a modal bottom
sheet with Dialog focus management in compact windows. The breakpoint at 600 CSS px,
panel width, spacing and 28px container corners are product layout decisions.

The person filter includes its category in the trigger (`People: All` / `Personen: Alle`).
Filter triggers share the connected controls' pill shape, 40px visible surface, 48px hit
target and 20px icons. Their tonal default and stronger secondary selected surface match
the adjacent grouping and view buttons. This is a product customization of the M3 chip
pattern. Selected filters use a leading check and emphasized weight.
Multiple selections retain a visible `+N` count; long names truncate while the full selection
remains in the accessible name and native tooltip. The existing Svelte implementation
follows the M3 filter-chip pattern. Compact claims layouts reserve room for the view controls
beside the filter, with grouping on its own row.

Manage uses a text button, reorder uses an outlined button and Finish becomes primary.
The add action now uses a distinct FAB style: published baseline 56px geometry and 16px
corners; above the existing 840px navigation breakpoint it becomes a labeled small
extended FAB. This breakpoint and the chosen primary-container color are product choices.
The accessible name and hover title use the existing localized create-item label.
The purchased icon toggle exposes aria-pressed; password visibility retains its toggle.
Help and currency-expansion actions have explicit targets. Copy feedback uses a live status.

New-item creation uses a SplitSubmitButton with Skeleton Menu keyboard behavior. The main
button submits normally, while the alternative calls requestSubmit with a hidden, form-owned
submit button. This preserves native validation and the existing SvelteKit submitter identity
for create-another even though the menu is portaled outside the form. The split uses the
published small group's 2px separation and retains Wishlist's 48px minimum button targets.
Edit forms keep a single Save action; Cancel is a text button.

Short loading now uses a custom smooth silhouette sequence following the M3E loading
pattern. These are product-authored vector silhouettes, not Google's official shape-library
assets. The 3.5s loop and continuous rotation are product animation decisions. Reduced
motion swaps the SVG resource for a static mask, disabling visible SMIL as well as CSS motion.
Navigation uses an indeterminate linear indicator instead of a fabricated percentage.
Product import shows local linear progress at its URL field; other processing notices are
nonblocking status surfaces. The 1.6s linear progress cycle is a product animation decision.
Static claimed ratios and password-strength values remain distinct from loading feedback.

Feedback uses inverse-surface Snackbar roles and a single visible message. New feedback
replaces stale feedback, while promise updates retain the same underlying store behavior.
The 6s timeout, idle pause and geometry are product choices. Bottom spacing includes navigation
and, on list detail pages, FAB clearance (112px of extra clearance is a product decision).
Copy, settings save and create-another also provide inline status. Snackbar close remains
available and keyboard behavior comes from Skeleton/Zag.

This change implements the primary component replacements. Optional larger flow changes
from the audit (desktop side-sheet details, mobile admin tables as lists, alternative color
swatches, and broader custom list/menu redesign) remain separate design opportunities.

### Verification of the component audit implementation

- Clean production build passed. Type check: 0 errors, 10 existing warnings.
- Full formatting and ESLint checks passed. The final URL-import test fixture also
  passed its targeted formatting/lint checks.
- Full Chromium run: 71 of 72 tests passed. The remaining test depended on live
  Amazon scraping and exceeded its ten-second import wait. It now supplies a
  deterministic product API response and checks the saved product URL. Targeted
  rerun: setup and URL import both passed (2/2). All 72 distinct checks therefore
  have passing results against this application implementation.
- New behavior coverage includes URL-restored sorting, malformed sort values,
  applied versus cancelled filters, reload persistence, modal mobile selection
  and focus return, exclusive grouping, split-button validation/focus and
  create-another submission, local import progress, failed-import recovery,
  static reduced-motion masks, and purchased-state persistence.
- Existing coverage includes authentication, permissions, public lists, list/item
  CRUD, uploads, markdown, German layout matrices, theme/context roles, keyboard
  controls, navigation geometry, scrolling/history/print and password reset.
- A split-button validation focus regression found in the initial run was fixed:
  native validation now runs after the menu's focus restoration. Broad CSS-only
  test selectors were narrowed to the intended action.
- Build/check generation must run sequentially within one workspace. A check's
  SvelteKit sync during a build produced inconsistent client/server payload
  metadata in the initial local build; the delivered build was generated cleanly
  in the temporary workspace and copied back only after completion.
- Reports and logs: `data/m3-verification/component-audit/`. Build output was
  refreshed in the checkout; previous output remains recoverable in that folder.
  Preview data remains in the existing separate `data/m3-preview/` database.
- No live marketplace integration success is inferred from the stubbed UI test.
  No production deployment, database migration against production, commit or push
  was performed.

Final visual follow-up: labeled connected buttons now size to their contents and keep
labels on one line. This fixes the German “Benutzer” label at 320px. Grouping and view
selection passed their targeted checks; after explicitly setting the fixture user's
stored language, the added German layout check and setup also passed (2/2). Together
with the prior suite and import recheck, 73 distinct UI checks have passing results.
The initial header-only locale setup was insufficient because the stored user language
takes precedence. The final build and targeted lint passed again; type check remains
0 errors and 10 existing warnings.

Final preview review captured ten stable German screenshots across 320px/1440px,
light/dark, list actions, claims grouping, compact filter sheet and split-submit menu.
Visible Iconify icons and fonts were awaited; capture uses reduced motion to avoid
transition frames. No page errors or document overflow were observed. The final images
are `data/screenshots/m3e-components-*.png`; measurements and capture log are in
`data/m3-verification/component-audit/visual-review.json` and `visual-review-final.log`.

### Application logo — 2026-10-24

The user-supplied Gemini gift-and-scroll logo pays homage to the original artwork.
Its original JPEG is preserved in `assets/branding/wishlist-gemini-original.jpg`;
the transparent app rendition is `src/lib/assets/wishlist-logo.png`. The shared
`AppLogo` component displays it at 48px with a localized accessible name and links
to the home page. `object-fit: contain` and unclipped corners preserve the complete
motif. These dimensions and the logo palette are product decisions.

Desktop navigation places the logo at the top of the rail, with the menu toggle
below it in collapsed and expanded states. Signed-out pages show it in the header.
Signed-in mobile pages retain the existing title-only header and bottom navigation.

The README uses the same app image and current screenshots. Email templates use
the regenerated public 512px icon. Favicons, Apple touch icons, Windows tiles and
the Safari monochrome gift-and-scroll mask are updated. Maskable Android icons
use an opaque tonal background and fit the full motif inside the safe circle.
Versioned icon URLs refresh the branding; the service worker ignores the version
parameter when matching precached images so those URLs also work offline.

Verification: production build, targeted formatting/ESLint, fourteen Chromium
checks, PNG dimensions/transparency, three ICO frames and manifest entries passed.
All nine platform icon URLs returned HTTP 200 with networking disabled. Desktop
and mobile captures were reviewed in light and dark themes. Type check reported
0 errors and 10 existing warnings. Native iOS/Android installation was not tested
on physical devices. Reports and captures are in the ignored `data/logo-*` files;
source and preparation notes are in `assets/branding/README.md`.
