# Repository instructions

These instructions apply throughout this repository. Preserve this fork's
Material 3 Expressive design and custom behavior when integrating upstream work.

## Integrating updates from the original project

Treat upstream updates as reviewed integration work. Fetching upstream changes
does not change the working files; a successful merge alone does not establish
that the application still works or that its design is intact.

1. **Inspect and preserve the current state.** Read `git status`, local and remote
   branches, recent commits, and the applicable instructions. Identify the branch
   containing the latest intended fork changes; do not assume a local `main` or
   `feat/material-3-expressive` is current. Preserve existing uncommitted work and
   distinguish it from the update task's changes. Use a separate checkout when
   needed; never discard, reset, or silently include unrelated user changes.
   Record the fork's starting commit as a rollback reference before integration.
2. **Verify the original repository and fetch it.** The original project is
   `https://github.com/cmintey/wishlist`; this fork uses its own `origin`. Inspect
   configured remotes and verify the upstream identity before adding a missing
   `upstream` remote or fetching. Preserve `origin` and determine upstream's
   actual default branch or the release being integrated rather than guessing.
3. **Review the incoming changes.** Compare upstream with the fork's common
   ancestor and inspect release notes and changes to behavior, dependencies,
   configuration, database migrations, container startup, and CI. Explain
   material compatibility concerns before deployment. Integrate a suitable
   release or coherent update range; use cherry-picks for isolated fixes only
   when their dependencies and migration implications have been checked.
4. **Integrate on a dedicated branch.** Create a `codex/upstream-...` branch from
   the intended fork baseline and normally merge the selected upstream revision
   there, preserving shared history. Avoid rebasing published fork history,
   force-pushing, or replacing the fork branch with upstream. Do not use a direct
   GitHub fork sync on a publishing branch as a shortcut around this process.
5. **Resolve conflicts deliberately.** Reconcile each conflict with both the new
   upstream behavior and the fork's customizations. Do not resolve all conflicts
   with a blanket choice of either side. Inspect automatically merged code too:
   semantic and visual regressions can occur without textual conflicts. Adapt
   new upstream screens and controls to the fork's Material 3 Expressive UI.
6. **Validate before integration into a publishing branch.** Use the package
   manager and scripts currently declared in `package.json`. Run type/Svelte
   checks and a production build (`pnpm check`, `pnpm build` at the time of
   writing), relevant lint checks, and tests covering changed behavior. Review
   affected UI at desktop and mobile sizes. Check the relevant flows, such as
   authentication, wishlist editing, claims, navigation, and account controls,
   according to the changes. For container or database changes, verify startup
   and migrations using disposable data or a database copy. Report failures and
   unavailable checks explicitly; do not claim unperformed checks passed.
7. **Prepare a reviewable result.** Summarize the upstream revision/range, retained
   fork behavior, conflict resolutions, validation results, and any required
   configuration or migration steps in the PR or handoff. Follow existing user
   authorization for publishing or merging; do not infer a deployment request
   from a request merely to inspect or prepare an update.
8. **Release the verified result.** Inspect the current workflow triggers and
   image tags before pushing or merging. At the time of writing, pushes to both
   `main` and `feat/material-3-expressive` trigger image publication via
   `.github/workflows/build_push.yml`. Require the relevant CI checks and
   container smoke tests to pass before updating a running installation.

## Deployment and rollback considerations

- Preserve the fork's image namespace, branding, configuration, volumes, and
  platform support when adapting upstream build or deployment files.
- Record the currently deployed immutable image tag or digest before an upgrade.
  Verify that a new image corresponds to the reviewed commit.
- Back up the database and uploads before deploying an update that may migrate
  data. Application startup can apply pending Prisma migrations automatically;
  inspect `entrypoint.sh` and the migration files when planning the upgrade.
- Git commits allow code rollback, but switching to an old image may not undo a
  database migration. Plan data restoration or verify backward compatibility
  before relying on an image rollback.
- Keep update checks separate from automatic integration and deployment. Any
  automation must follow the user's authorized scope and this review process.

## Public data and commit identity

- Use reserved example domains and fictional accounts in documentation, Compose
  examples, screenshots and test fixtures. Never copy a real installation URL,
  personal email address, local user path, credential or runtime database into
  tracked files.
- Before publishing, inspect all new text and image metadata for personal data,
  and verify screenshots show only the intended demo accounts. Keep private audit
  reports and backups outside the published Git tree.
- Use the repository owner's public GitHub noreply identity for new fork commits.
  Preserve original upstream authorship and license information.
- Continue from this repository's clean upstream-based history. Do not merge,
  cherry-pick or push branches from an archived checkout that contains the old
  fork history; transfer reviewed file changes instead.
