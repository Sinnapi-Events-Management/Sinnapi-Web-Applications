<!--
  Thanks for contributing to Sinnapi! 🎉
  Please fill out every section below. Delete the HTML comments before submitting.
  Keep the PR focused — one logical change per PR makes review faster and safer.
-->

## Summary

<!-- What does this PR do and why? Explain the change in 1–3 sentences for a reviewer who lacks context. -->

## Jira

<!--
  Link the Jira ticket this PR resolves. Replace SNP-XXX with the ticket key.
  Tip: include the key in the PR title (e.g. "SNP-123: Add vendor onboarding") so Jira auto-links the PR.
-->

- Ticket: [SNP-XXX](https://sinnapi.atlassian.net/browse/SNP-XXX)

## Type of change

<!-- Check all that apply. -->

- [ ] ✨ Feature (new user-facing capability)
- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ♻️ Refactor (no functional change)
- [ ] 🎨 Style / UI (visual changes only)
- [ ] ⚡ Performance
- [ ] 🧰 Chore / tooling / dependencies
- [ ] 🗄️ Database / migration
- [ ] 📝 Documentation
- [ ] 💥 Breaking change (requires coordinated rollout or consumer changes)

## Scope

<!-- Which apps/packages does this touch? Check all that apply. -->

- [ ] `apps/web-public`
- [ ] `apps/client-portal`
- [ ] `apps/vendor-portal`
- [ ] `apps/admin-portal`
- [ ] `packages/ui`
- [ ] `supabase` (functions / migrations)
- [ ] Repo tooling (CI, config, scripts)

## How to test

<!--
  Step-by-step instructions for a reviewer to verify the change locally.
  Include the workspace command, e.g. `yarn dev:vendor`, and any test data / accounts needed.
-->

1.
2.
3.

## Screenshots / recordings

<!-- Required for any UI change. Provide before/after. Delete this section if not applicable. -->

| Before | After |
| ------ | ----- |
|        |       |

## Database & migrations

<!-- Complete this section if this PR touches Supabase schema, migrations, RLS, or functions. Otherwise check "No DB changes". -->

- [ ] No DB changes in this PR
- [ ] Migration included and reviewed (`yarn db:diff` output checked)
- [ ] Row Level Security (RLS) policies reviewed for affected tables
- [ ] Change is backward compatible / safe to roll out without downtime
- [ ] Seed data / fixtures updated if needed

## Breaking changes & rollout

<!-- Describe any breaking changes, required env var changes, or migration/rollout order. Write "None" if not applicable. -->

- Env var changes:
- Rollout / coordination notes:

## Checklist

- [ ] PR title follows `SNP-123: short description` and is linked to a Jira ticket
- [ ] Self-reviewed the diff; no debug code, secrets, or stray `console.log`
- [ ] `yarn typecheck` passes
- [ ] `yarn lint` passes
- [ ] `yarn format:check` passes
- [ ] Manually tested the change (steps documented above)
- [ ] Screenshots added for UI changes
- [ ] Docs / README updated where relevant
- [ ] Breaking changes and env var changes are called out above
