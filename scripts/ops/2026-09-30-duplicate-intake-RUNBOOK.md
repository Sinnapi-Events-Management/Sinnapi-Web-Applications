# Duplicate vendor application — production runbook

**Incident:** 2026-09-30, `murungiaisha872@gmail.com`
**Target:** production = `mnecsflrsyackeibixfn` (the project the CLI is linked to, so no
`--project-ref` needed — but check `supabase/.temp/project-ref` before every command anyway).

## What went wrong

One applicant submitted three times: a typo in the business name on the first, corrected on the
next two. Compliance approved the **first**, was asked to disregard it, then approved the
**second**. Three separate defects combined:

1. **No password in the second email.** `promote-intake` resolves the applicant by email. The
   first approval had created the account, so the second found an existing profile, reused it,
   left `tempPassword` null, and switched to the "you already have an account" copy.
2. **Two live vendors and two trial subscriptions.** `approve_vendor` inserts into `vendors`
   unconditionally and nothing constrained `owner_id`. `ux_subscription_active` is unique per
   _vendor_id_, so a second vendor slipped straight past it. Both listings were `active` and
   `public`.
3. **She could not have used the portal either way.** `VendorProvider` resolves the signed-in
   vendor with `.maybeSingle()` on `owner_id`, which _errors_ on a second row — so the portal
   would have shown "no vendor" with a valid password.

The only de-duplication that existed was on `submission_ref`, which the form mints once per
**page view**. It stops a double-click and nothing else.

## It is bigger than one applicant

Running 0930d on its own in the SQL editor on 2026-09-30 produced:

```
ERROR: cannot add one-vendor-per-owner constraint: duplicate live vendors exist ->
  owner_id=e8694a90-… (2 vendors); owner_id=bc7b29c7-… (2 vendors);
  owner_id=fa4a0638-… (2 vendors); owner_id=d3e0b354-… (4 vendors)
```

**Four** owners, one with **four** listings. That is the guard working, not a problem with it —
nothing was applied. Every one of those owners currently cannot open the Business Portal, because
`.maybeSingle()` errors on their second row.

`approve_vendor` never checked for an existing vendor, so two routes lead here: approved twice, or
**created by the legacy import and then approved** (that row shows `application_id is null`). The
diagnostic's `cause` column separates them.

## Everything is a soft delete — this is not optional

`20260618000010_triggers.sql` puts `tg_soft_delete` (a BEFORE DELETE trigger) on **every table with
a `deleted_at` column**. It sets `deleted_at` and returns NULL, cancelling the physical delete.
Verified on a local replica:

- `delete from public.vendors …` sets `deleted_at`. The row stays.
- **`ON DELETE CASCADE` never fires**, so quotations, bookings and reviews are untouched.
- **`get diagnostics row_count` returns 0**, because the trigger suppressed the row. All counts in
  these migrations are taken by `SELECT` for that reason.

This is what `ux_vendors_one_live_per_owner` wants — it is partial on `deleted_at is null`, so a
retired listing frees the owner's slot and stays fully recoverable.

**Subscriptions must be retired explicitly.** `subscription-lifecycle` filters `deleted_at` on the
_subscription_ and never checks whether the vendor is soft-deleted. A trialing row left on a retired
listing keeps mailing its owner trial-expiry reminders for a business that no longer exists.

## Order matters

Four migrations must land in sequence, and `db push` guarantees it:

| #     | Migration                                            | Does                                                                                                                           |
| ----- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 0930a | `20260930000001_intake_withdrawn_status.sql`         | Adds the `withdrawn` status + `superseded_by_intake_id`; `set_intake_status` accepts it and refuses to move an approved intake |
| 0930b | `20260930000002_fix_duplicate_intake_2026_09_30.sql` | **Aisha only.** Retires _both_ her listings and re-queues her newest submission, so approval provisions a fresh password       |
| 0930c | `20260930000003_retire_duplicate_vendors.sql`        | **Every other duplicated owner.** Keeps one listing per owner under the rule below, retires the rest                           |
| 0930d | `20260930000004_one_vendor_per_owner.sql`            | Adds `ux_vendors_one_live_per_owner`                                                                                           |

0930b needs 0930a's status; 0930c and 0930d need the retirements before them. Aisha is handled
separately because she is the one owner where **both** listings go — 0930c's keep-rule would leave
one of hers standing, and she needs a clean re-approval to get a password.

### 0930c's keep rule

1. If exactly **one** of an owner's listings has client history (quotation, booking or review),
   that one survives — retiring it would hide a listing a client has transacted against.
2. If **none** has client history, the **newest** survives.
3. If **two or more** have client history, 0930c **refuses** and names the owner. Choosing there
   means deciding what happens to that client activity, which is your call, not a script's.

Rule 3 is why this is safe to run unattended: the ambiguous case stops the push instead of guessing.

## Steps

### 1. Diagnose (read-only)

Run **`2026-09-30-duplicate-vendors-diagnose.sql`** — this is now the important one. Five result
sets covering all four owners.

- **Result set 5 predicts whether 0930c will refuse.** If `retirable_no_client_activity` equals
  `live_vendors - 1` for every owner, the run is mechanical. Anything lower means rule 3 fires and
  we decide together first.
- **Result set 1** is the decision table: `cause` tells you import-vs-approval, and the per-vendor
  activity counts show what each listing actually holds.

Also run `2026-09-30-duplicate-intake-diagnose.sql` for Aisha specifically. **Query 2** there tells
you whether she has ever signed in, which decides whether the approval email can carry a password
(step 5).

### 2. Snapshot

Confirm PITR / take a snapshot. These migrations soft-delete vendor, subscription and application
rows across four owners.

### 3. Optional dry run

Paste the body of 0930b and then 0930c into the SQL editor inside one `begin; … rollback;`. The
`NOTICE` lines name every owner, which listing is kept, why ("has client history" or "newest"), and
what is retired. The rollback undoes all of it.

### 4. Push

```bash
supabase db push            # linked to mnecsflrsyackeibixfn
```

**Five** migrations are pending, not four — `20260926000001_storage_owner_id_policies.sql` is still
unapplied on production and will go first. That is the storage `owner_id` RLS fix; confirm you want
it live before pushing, because this push is the moment it ships.

Expected notices on production:

```
[0930b] keep=<uuid> unwind={<uuid>,<uuid>} applications={…} vendors={…}
[0930b] retired 2 subscription(s)
[0930b] retired 2 vendor(s)
[0930b] retired 2 vendor_application(s)
[0930b] OK — approve intake <uuid> in the admin portal
[0930c] owner <uuid>: 2 live, keeping <uuid> (has client history|newest), retiring {…}
[0930c] owner <uuid>: 4 live, keeping <uuid> (newest), retiring {…,…,…}
[0930c] OK — 3 owner(s) reconciled, N listing(s) retired
```

Three owners in the 0930c block, not four — Aisha's was already handled by 0930b.

If **0930c refuses**, an owner has two listings that both carry client history (rule 3). If **0930d
refuses**, 0930c left something behind. Either way nothing is half-applied: each migration completes
or rolls back as a unit.

### 4a. If a migration is already recorded as applied

Because you ran 0930d by hand in the SQL editor, check before pushing:

```bash
supabase migration list --linked
```

A migration run by hand in the SQL editor is **not** recorded in
`supabase_migrations.schema_migrations`, so `db push` will run it again. All four are written to be
idempotent, so a second run is safe — 0930b skips with "already applied", 0930c reports "nothing to
do", and 0930a/0930d use `if not exists`. Verified by re-running the whole chain twice.

### 5. Deploy the functions

```bash
supabase functions deploy vendor-application promote-intake set-intake-status
```

All three changed. `vendor-application` carries the new duplicate guard, `promote-intake` the
one-vendor rule and the credential re-issue, `set-intake-status` the `withdrawn` transition.

### 6. Approve

In the admin portal, Applications → the one `submitted` row for her email → **Approve & promote**.

- If query 2 showed `last_sign_in_at` **is null**: the fixed `promote-intake` issues a fresh
  one-time password and the email carries it. This is the expected path.
- If it is **not null**: she already has a working password, and the approval email correctly
  tells her to use it rather than shipping a new one. If she has forgotten it, use the
  password-reset flow — not `resend-vendor-credentials`, which is gated on never-having-signed-in.

### 7. Verify

For Aisha:

- One vendor for her owner id, `active` + `public`.
- One `trialing` subscription.
- The two older intakes read `withdrawn` in the queue, greyed rather than red, each linked to the
  survivor.
- She can sign in to the Business Portal and is prompted to change her password.

For the other three owners — this is the part that is easy to forget, and they never reported a
problem because they simply could not get in:

```sql
-- must return no rows
select owner_id, count(*) from public.vendors
where deleted_at is null group by owner_id having count(*) > 1;

-- must return no rows: a live subscription on a retired listing
select s.id, s.vendor_id, s.status from public.subscriptions s
join public.vendors v on v.id = s.vendor_id
where v.deleted_at is not null and s.deleted_at is null
  and s.status in ('trialing','active','past_due','grace');
```

Then have each of the three sign in and confirm the Business Portal resolves their listing. **Tell
them** — they have been locked out with an approved, live business, and the retirement may have
changed which business name their listing shows. If 0930c kept the wrong one, the undo is
`update public.vendors set deleted_at = null where id = '<the other>'` after retiring the current
live one (the index enforces that order — confirmed).

## What stops this recurring

- **`vendor-application`** refuses a submission whose email is already an approved intake or a
  live vendor (409), and auto-withdraws earlier _pending_ submissions from the same email,
  pointing each at its replacement. The public form explains the 409 instead of showing
  "something went wrong".
- **`promote-intake`** refuses an owner who already has a live vendor, and re-issues a password
  for any account that has never been signed into — so an approval email is never again
  credential-less to someone with no other way in.
- **`ux_vendors_one_live_per_owner`** makes the duplicate-vendor state impossible in the schema,
  not just in the code path that happened to cause it.
- **Admin portal** gains a "Withdraw as duplicate" action, distinct from Reject: it sends the
  applicant nothing, because a duplicate says nothing about their business.

## Deliberately not done

- **Nothing is hard-deleted anywhere.** The soft-delete trigger makes that structurally true for
  every table with a `deleted_at` column, and it is the behaviour we want: all of this is
  reversible.
- **Nothing in `vendor_application_intake` is touched except status.** The terms acceptances,
  marketing-consent wording, IP and user agent on those rows are the record that she applied, and
  are what we would need if a submission were ever disputed. `withdrawn` removes them from the
  queue instead.
- **The auth accounts are untouched.** They hold no vendor data, and deleting one would cascade
  through `profiles`.
- **Media and services on retired listings are left in place.** Nothing reads them while the
  vendor is soft-deleted, and leaving them is what makes `deleted_at = null` a complete undo.
- **Her `vendor` role is left granted** between the retirement and the re-approval. With no vendor
  row the portal simply shows nothing, and `approve_vendor` re-grants it idempotently.
- **Retired vendors keep their `SV…` ids in `public_id_registry`.** That is by design — the
  registry retains ids for gone rows so `resolve_public_id` can answer "that record is retired"
  rather than "no such id".
- **`approve_vendor` itself is not changed.** The unique index plus the `promote-intake` check
  cover it from both sides. Rewriting a `security definer` RPC that every approval depends on, in
  the same change as a production data fix, is more risk than it removes.
