---
name: issue-pr-workflow
description: >-
    End-to-end repository workflow that creates or links a GitHub issue, resolves
    the problem on a dedicated branch with local validation, and submits a pull
    request for maintainer approval. Use this skill whenever starting or finalizing
    a bug fix, feature, or repository change in benfayzen/wishlist.
---

# Issue-to-PR Workflow

Use this workflow to take a task from initial problem description to a validated
pull request ready for maintainer review and merge approval.

## Prerequisites

- Ensure the GitHub CLI (`gh`) is invoked (available at `gh` or
  `~/.local/bin/gh`) and targets `benfayzen/wishlist` (`-R benfayzen/wishlist`).
- Ensure commits use the repository owner's GitHub noreply identity:
    - `user.name`: `benfayzen`
    - `user.email`: `63108900+benfayzen@users.noreply.github.com`

## Steps

### 1. Inspect State and Create or Link a GitHub Issue

1. Check `git status --short -b` and fetch the latest `origin/main`:
    ```bash
    git fetch origin
    ```
2. Search open issues to avoid duplicates:
    ```bash
    gh issue list -R benfayzen/wishlist --state open
    ```
3. If the task does not already have an issue, create one matching the project's
   issue templates:
    - **Bug report** (`.github/ISSUE_TEMPLATE/bug_report.md`):
        ```bash
        gh issue create -R benfayzen/wishlist \
          --title "Bug: <concise summary>" \
          --label "bug" \
          --body "**Describe the bug**
        ...

        **To Reproduce**
        ...

        **Expected behavior**
        ..."
        ```
    - **Feature / enhancement** (`.github/ISSUE_TEMPLATE/feature_request.md`):
        ```bash
        gh issue create -R benfayzen/wishlist \
          --title "Feature: <concise summary>" \
          --label "enhancement" \
          --body "**Is your feature request related to a problem? Please describe.**
        ...

        **Describe the solution you'd like**
        ...

        **Describe alternatives you've considered**
        ...

        **Additional context**
        ..."
        ```
4. Record the created `<ISSUE_NUMBER>` for the branch and pull request.

### 2. Prepare a Dedicated Branch

1. Ensure the working branch is based on the latest `origin/main` (unless the
   user specifies another base branch). Never commit directly to `main` or
   `feat/material-3-expressive`.
2. If currently on `main`, create and switch to a descriptive branch (e.g.
   `fix/<short-topic>` or `feat/<short-topic>`). If already in a dedicated task
   worktree/branch, verify it is up to date with `origin/main`.

### 3. Implement and Validate Locally

1. Implement the fix or feature while preserving the fork's Material 3
   Expressive design and existing behavior.
2. In a fresh worktree without generated Prisma types, install dependencies and
   generate the Prisma client first:
    ```bash
    pnpm --config.engine-strict=false install --frozen-lockfile
    pnpm --config.engine-strict=false prisma generate
    ```
3. Format, lint, type-check, and build the project:
    ```bash
    pnpm format
    pnpm lint
    pnpm check
    pnpm build
    ```
4. Run the relevant automated tests covering the changed behavior (e.g.
   `pnpm test:native <spec>` or `pnpm test`).
5. Inspect `git diff` and `git status` to verify no unintended files, secrets,
   personal data, or temporary artifacts are included.

### 4. Commit, Push, and Open the Pull Request

1. Verify the commit author identity uses
   `63108900+benfayzen@users.noreply.github.com`.
2. Stage and commit the changes using Conventional Commits format (`fix: ...`,
   `feat: ...`, `docs: ...`, `chore: ...`, `test: ...`):
    ```bash
    git commit -m "<type>: <concise summary>"
    ```
3. Push the branch to `origin`:
    ```bash
    git push -u origin HEAD
    ```
4. Create the pull request against `main` following
   `.github/pull_request_template.md` and linking the issue with
   `Closes #<ISSUE_NUMBER>`:
    ```bash
    gh pr create -R benfayzen/wishlist \
      --base main \
      --title "<type>: <concise summary>" \
      --body "## Description
    <what problem this solves and why>

    ## Related Issues
    Closes #<ISSUE_NUMBER>

    ## AI Disclosure
    <brief disclosure of AI assistance and verification steps>

    ## Checklist
    - [x] I have tested my changes locally
    - [x] I have ran \`pnpm lint\` locally
    - [x] I have ran \`pnpm format\` locally
    - [x] I have ran \`pnpm check\` locally
    - [x] I have completed the AI Disclosure
    - [x] My changes do not introduce new warnings or errors

    ## Additional Notes
    <validation summary and reviewer context>"
    ```

### 5. Hand Off for Maintainer Approval

1. Report the issue URL, pull request URL, and validation results to the user.
2. Leave the pull request open so the user can review and approve/merge it. Do
   not merge the PR unless explicitly instructed by the user.
