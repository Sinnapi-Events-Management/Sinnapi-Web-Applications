# Legacy import — 2026-09-06

Imports `verified-users-and-vendors-2026-09-06.csv` into production.

**172 accounts: 71 clients · 98 vendors · 3 pending applicants.**

## Run these in the Supabase SQL editor, in order

| File               | Writes?      | What it does                                                                                                             |
| ------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `00_preflight.sql` | no           | Proves the project, the schema, that you can write, and that none of these accounts already exist. Read every result.    |
| `01_staging.sql`   | staging only | Loads all 225 CSV rows into `migration_legacy_users` and defines the derivations. Touches no production table.           |
| `02_validate.sql`  | no           | Shows exactly what the import will write — every city, phone, name, slug, plan and category. **Read this one properly.** |
| `03_import.sql`    | **yes**      | The import. One transaction, idempotent.                                                                                 |
| `99_rollback.sql`  | **yes**      | Undoes it completely. Only if you need it.                                                                               |

Once the import has landed and the site is live, `04_mail_tracking.sql` plus the
`send-migration-credentials` function deliver the credentials —
see **[SENDING-CREDENTIALS.md](SENDING-CREDENTIALS.md)**.

Between files 2 and 3 you can change your mind about any row by updating
`migration_legacy_users.excluded_reason` — file 2 says how.

## Decisions baked in

|               |                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Excluded (53) | 3 admins · 7 test accounts · 34 bot signups · **9 operator-excluded** (any `full_name` naming Caleb or Lwanga, plus `krkemisha8@gmail.com`) |
| Vendor state  | `approved` → active/public (92) · `rejected` → hidden/hidden (6)                                                                            |
| Subscriptions | all `trialing`, 30 days from the run, on the legacy tier's plan                                                                             |
| Categories    | 55-term taxonomy; all 266 legacy links become `vendor_services`; `primary_category_id` left null for onboarding                             |
| Passwords     | generated, `must_change_password: true`, **parked in `migration_legacy_users.temp_password` — no email sent**                               |
| Onboarding    | `onboarding_completed_at` null on all 98 vendors, so they go through the wizard                                                             |

One of the operator exclusions is an approved vendor — `zara@lwangzo.com`, trading as
`Oeuvre Cakes`. Its listing goes with the account. It had no categories, so no
category links are lost.

## Two things to know

**102 of the 172 accounts could not keep their legacy id.** The old platform used
32-character base62 ids for its earlier cohort and `auth.users.id` is a `uuid`.
Those ids are derived deterministically and both are recorded in
`migration_legacy_users`. **That table is the only record of the mapping — do not
drop it.** All 98 vendor ids were valid UUIDs and are preserved verbatim.

**The passwords are live credentials sitting in plaintext.** They are delivered by
the `send-migration-credentials` function — see
[SENDING-CREDENTIALS.md](SENDING-CREDENTIALS.md) — and the column is dropped once
every recipient reads `sent`.

## Rehearsed, not assumed

Every file was run against `supabase/postgres:17.6.1.166` with all 147 Sinnapi
migrations applied and the auth schema brought up to a live project's shape.
Verified: accounts created, every password verifies against its stored bcrypt hash,
every account passes `_evaluate_portal_access` for its portal (the sole denial is the
one blocked account), unique slugs, no orphans. The import was run twice to prove it
is idempotent, and the full import → rollback → re-import cycle was exercised.
