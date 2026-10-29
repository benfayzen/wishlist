# Material 3 Expressive UI

## Shared components and styles

The UI uses Svelte components with shared `m3-*` classes. The main style files are
`src/styles/material.css`, `src/styles/expressive.css` and
`src/styles/account-menu.css`. Administration layouts use `src/styles/admin.css`.

| Area                     | Implementation                                                              |
| ------------------------ | --------------------------------------------------------------------------- |
| Text and compound fields | `FieldShell`, `Input`, `Label`, `PasswordInput`, `CurrencyInput`            |
| Forms                    | `FormSection`, `FileUpload`, `MarkdownEditor`, `ManageListForm`, `ItemForm` |
| Selection and filters    | `ConnectedButtonGroup`, `AdaptivePicker`, wishlist chips                    |
| Dialogs and item details | `BaseModal`, `ModalContent`, `ItemDrawer`                                   |
| Navigation               | `NavigationDrawer`, `NavigationRail`, `BottomTabs`, `NavMenu`               |
| Wishlist content         | `ListCard`, `GridItemCard`, `ListItemCard`, shared item content and actions |

Skeleton primitives provide behavior such as dialog focus management and menu
keyboard interaction. Shared styles provide the application's appearance.

## Theme and list colors

`src/lib/theme.ts` uses Material Color Utilities to generate light and dark
palettes. Components use paired semantic roles such as primary/on-primary and
surface/on-surface. The default palette uses the application's brand colors;
custom list colors use `SchemeTonalSpot`.

List display, creation, management and item-edit loaders supply a list color
only after their existing access checks. Color seeds must be opaque six-digit
hexadecimal values. Invalid seeds fall back to the application default.

`src/routes/+layout.svelte` applies the palette for the current page. Portaled
menus and dialogs inherit that palette, and unrelated pages use the default.
Keep palette generation free of mutable server-wide state.

## Responsive navigation and cards

The navigation rail is used from 840 CSS pixels; narrower layouts use bottom
navigation. `navigation.ts` determines the active destination, including the
personal-list filter. Page content scrolls inside the main pane, with space for
bottom navigation and floating actions.

`GridItemCard` provides the image-based tile layout. `ListItemCard` uses a leading
image from 640 CSS pixels and a full-width text layout below that breakpoint.
Mobile rows retain the localized Most Wanted label, item information and actions
without a product image or placeholder. The detail dialog can still show images.

The list-view preference is stored in a cookie. The light, dark or system theme
preference is stored locally; its initialization lives in the document shell.

These layouts and visual compositions are project choices. For Material guidance,
see [Material Design](https://m3.material.io/) and
[Material Color Utilities](https://github.com/material-foundation/material-color-utilities).

## Interaction and motion

- Keep accessible names, focus indicators and keyboard operation when changing
  shared controls.
- Filters keep draft selection separate from the applied URL state. Cancelling
  a picker discards its draft.
- `SplitSubmitButton` uses a form-owned submitter for the create-another action,
  preserving native validation and the SvelteKit action contract.
- Motion helpers in `src/lib/motion.ts` and reduced-motion CSS honor the user's
  motion preference.
- Loading indicators represent pending work; claimed quantities and password
  strength remain static values.

## Development and regression checks

See [development setup](../DEVELOPMENT.md) for commands and isolated preview
storage. Run generation, checks and builds sequentially within one checkout.

Relevant browser tests include `tests/ui/material.spec.ts`,
`tests/ui/navigation.spec.ts`, `tests/ui/expressive-controls.spec.ts`,
`tests/ui/scroll-pane.spec.ts` and `tests/ui/admin-responsive.spec.ts`.
Product-import UI tests stub API responses for deterministic results; scraper
integration needs separate validation when its behavior changes.

See [logo assets](../assets/branding/README.md) for icon maintenance and
[README screenshots](readme-screenshots.md) for the documentation demo.
