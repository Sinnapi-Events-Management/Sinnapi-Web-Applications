# Contributing to Sinnapi

Thanks for contributing! This guide covers how we branch, commit, and open pull
requests so that every change moves through review the same way. For project
setup and commands, see the [README](./README.md).

## Table of contents

- [Prerequisites](#prerequisites)
- [Local setup](#local-setup)
- [Branching](#branching)
- [Commit conventions](#commit-conventions)
- [Before you push](#before-you-push)
- [Opening a pull request](#opening-a-pull-request)
- [Review & merge](#review--merge)
- [Database changes](#database-changes)

## Prerequisites

- **Node 20** (`nvm use` — see [`.nvmrc`](./.nvmrc))
- **Yarn 1.x** (the repo pins `yarn@1.22.22` via `packageManager`)
- **Supabase CLI** (only needed for database / edge-function work)

## Local setup

```bash
nvm use            # Node 20
yarn install       # installs every workspace from the root
yarn setup:env     # creates apps/*/.env.local from each .env.example
yarn dev:all       # runs all apps (web-public + 3 portals)
```

## Branching

Create a branch off `main` named after its Jira ticket and a short slug:

```
<type>/SNP-<id>-<short-slug>
```

| `<type>`   | Use for                             |
| ---------- | ----------------------------------- |
| `feat`     | New user-facing capability          |
| `fix`      | Bug fix                             |
| `chore`    | Tooling, dependencies, config       |
| `refactor` | Internal change, no behavior change |
| `docs`     | Documentation only                  |

Examples:

```
feat/SNP-123-vendor-onboarding
fix/SNP-145-booking-date-timezone
```

Keep branches focused — one logical change per branch keeps reviews fast and safe.

## Commit conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/). Include
the Jira key so commits link back to the ticket:

```
<type>(<scope>): <summary>  [SNP-123]
```

- **type**: `feat`, `fix`, `chore`, `refactor`, `docs`, `style`, `perf`, `test`
- **scope** (optional): the affected app/package, e.g. `vendor-portal`, `ui`, `supabase`

Examples:

```
feat(vendor-portal): add onboarding wizard  [SNP-123]
fix(ui): correct StatusChip color mapping  [SNP-145]
```

## Before you push

A husky **pre-commit** hook runs `lint-staged` and `yarn typecheck` automatically.
Before opening a PR, run the full verification suite from the repo root and make
sure it passes:

```bash
yarn verify        # typecheck + lint + format:check
```

You can also run the gates individually:

```bash
yarn typecheck
yarn lint
yarn format:check  # or `yarn format` to auto-fix
```

## Opening a pull request

1. Push your branch and open a PR against `main`.
2. The [PR template](./.github/PULL_REQUEST_TEMPLATE.md) loads automatically —
   **fill out every section** and delete the helper comments.
3. Title the PR `SNP-123: short description` so Jira auto-links it.
4. Complete the checklist: link the Jira ticket, document test steps, attach
   before/after screenshots for UI changes, and call out DB and breaking changes.
5. Mark the PR as a **Draft** if it isn't ready for review.

## Review & merge

- At least **one approving review** is required before merge.
- Resolve all review threads and ensure CI / verification gates are green.
- Keep the PR up to date with `main` (rebase or merge) before merging.
- Prefer **Squash and merge** so `main` stays a clean, linear history; the squash
  commit message should keep the `SNP-123` reference.

## Database changes

When a PR touches Supabase schema, migrations, RLS, or edge functions:

- Generate and review the diff: `yarn db:diff`.
- Verify locally with `yarn db:reset` (re-runs all migrations) and
  `yarn functions:serve` for edge functions.
- Confirm Row Level Security policies for any affected tables.
- Prefer backward-compatible, zero-downtime migrations; flag anything that
  requires a coordinated rollout in the PR's **Breaking changes & rollout** section.
