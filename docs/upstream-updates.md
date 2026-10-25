# Upstream integration history

This document records the upstream behavior included in the current application
snapshot. Historical fork commit and pull-request references are intentionally
omitted; the upstream revision below remains the integration baseline.

## 2026-10-24

### Revisions and scope

- Original project: `cmintey/wishlist`, branch `main`.
- Previous common upstream baseline: `2c458fb`.
- Integrated upstream revision: `a76e1277e39d3e2d98cb715a9a07b663bab23dee`.
- Target: the fork's `main`. The preserved application snapshot includes the
  wish card refinements and mobile action/FAB improvements.

The seven incoming commits include the Weblate translation merge and its three
language commits (Czech, French, Swedish), updated Node and Alpine image pins,
and the admin clear-sessions fix. The fix connects the existing confirmation
button to session invalidation instead of user deletion, and adds success/error
feedback. There are no incoming database migrations, dependency-lockfile changes,
or new required environment variables.

### Integration decisions

- Merged upstream with shared history; no textual conflicts occurred.
- Reviewed the automatic merges in the Dockerfile, English translations, and
  admin user page. Retained the fork's architecture-specific compiler flags,
  Material 3 Expressive buttons, confirmation dialogs, branding, and image
  publishing configuration.
- Committed the repository-wide upstream workflow in `AGENTS.md`.
- Added admin-session regression coverage for cancellation, multiple devices,
  preservation of the user account and credentials, unaffected other users,
  admin-only access, and mobile/desktop light/dark layout.
- Excluded the pre-existing local `entrypoint.sh` executable-bit change; its
  contents and committed executable mode are preserved.

### Verification

Verification uses Node 24.22.1 and the project's pinned pnpm 12.13.0 in WSL with
the existing Linux dependencies. Test data belongs to `data/m3-tests/`; the
preview database and any deployed installation are outside the test scope.

- `pnpm check`: passed, zero errors and ten existing warnings in unchanged
  components/routes.
- `pnpm lint`: passed (full Prettier and ESLint checks).
- `pnpm build`: passed. Build output also reports large chunks, a PWA glob with
  no prerendered files, and an empty generated environment chunk; these areas
  are unchanged by the incoming update.
- `pnpm test:native`: all 85 pre-existing cases passed. The five new session
  cases initially exposed two incorrect test assumptions (a profile input ID
  and SvelteKit's JSON-versus-HTML redirect response). After correcting the
  tests, `pnpm test:native tests/ui/admin-sessions.spec.ts` passed all six cases
  (setup plus five regressions). All 90 distinct cases have therefore passed
  across these runs; the application code did not change between them.
- Reviewed admin page/dialog captures at 320px light and 1440px dark; all four
  width/theme combinations also passed overflow and dialog containment checks.
- Final test changes passed targeted Prettier and ESLint checks.

### Release considerations

The update branch itself does not publish an image. Merging into `main` triggers
the fork's `latest`/`edge` image workflow; the `material-3-expressive` tag follows
`feat/material-3-expressive` and needs that branch to include the update as well.
Use the tested commit's immutable SHA tag or digest when choosing a deployment.

Docker is unavailable locally, so container builds and startup smoke tests must
be verified through CI. No production deployment or data migration is performed
as part of this preparation. Back up the database and uploads before deployment;
a code rollback does not itself restore database contents.
