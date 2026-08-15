-- =====================================================================
-- Sinnapi — 0810a Profile status lifecycle: `deactivated` and `blocked`
--
-- WHY THE ENUM WAS NOT ENOUGH
-- `profile_status` had exactly one way to say "this account cannot sign in":
-- `suspended`. That one value was being asked to carry three operationally
-- different decisions —
--
--   * a vendor put on hold for a fortnight while a dispute is investigated,
--   * a vendor who has wound the business down and asked to be switched off,
--   * a vendor barred for abuse, fraud or a chargeback pattern,
--
-- — which meant the console could not show an operator which of the three they
-- were looking at, and could not offer the right way back out. A hold that
-- expires on its own and a permanent bar are not the same state, and treating
-- them as one made the reversible case look irreversible and the irreversible
-- case look routine.
--
-- THE MODEL
--   active       may sign in.
--   pending      provisioned, never activated (unchanged).
--   suspended    TEMPORARY. Always carries `suspended_until`; lifts itself.
--   deactivated  Indefinite but NOT punitive — off by request or by disuse.
--                Reactivating is a routine, one-click operation.
--   blocked      Indefinite and punitive. Same mechanics as `deactivated`, but
--                the distinction is the whole point: it is what an operator
--                reads, what the audit trail records, and what stops a barred
--                account being waved back in as a housekeeping chore.
--
-- All three non-active states already lock sign-in with no further work:
-- `_evaluate_portal_access` (0802) refuses any profile whose status is not
-- `active` and derives its machine-readable deny reason as
-- 'profile_' || status, so these arrive as `profile_deactivated` and
-- `profile_blocked` in `portal_access_attempts` on their own.
--
-- WHY THE REASON LIVES ON THE ROW, NOT ONLY IN THE AUDIT LOG
-- `audit_logs` answers "what happened"; support needs "what is true now", on
-- the row they already have open, without a second query and without
-- reconstructing a timeline. The columns below are the current state's own
-- explanation. The audit log still records every transition — the two are
-- complements, not duplicates.
--
-- THIS MIGRATION ADDS VALUES ONLY. Everything that *reads* them (the admin
-- search RPCs, the expiry job, the blocked-accounts view) is in 0810b, because
-- Postgres refuses to use an enum value in the same transaction that added it.
-- =====================================================================

-- ---------------------------------------------------------------------
-- The two new lifecycle states.
--
-- `if not exists` so a re-run is a no-op: enum values cannot be dropped, and a
-- migration that fails halfway through must be safe to apply again.
-- ---------------------------------------------------------------------
alter type profile_status add value if not exists 'deactivated';
alter type profile_status add value if not exists 'blocked';

-- ---------------------------------------------------------------------
-- Why the account is in the state it is in, who put it there, and — for a
-- suspension — when it ends.
--
-- On `profiles` rather than a vendor-specific table on purpose: the columns
-- describe an ACCOUNT, and nothing about them is vendor-shaped. The admin
-- console only offers these transitions for vendor accounts today, but a
-- schema that encoded that would have to be unpicked the first time a client
-- account needs the same treatment.
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists status_reason     text,
  add column if not exists status_changed_at timestamptz,
  add column if not exists status_changed_by uuid references public.profiles(id),
  add column if not exists suspended_until   timestamptz;

comment on column public.profiles.status_reason is
  'Operator justification for the CURRENT status. Internal — never rendered to the account holder, and never returned by a portal-facing read.';
comment on column public.profiles.status_changed_by is
  'Staff profile that last moved this account between lifecycle states. Null for states set at provisioning time.';
comment on column public.profiles.suspended_until is
  'When a temporary suspension lifts. Non-null only while status = suspended; the auth ban is set to the same instant so both halves expire together.';

-- Serves the expiry sweep in 0810b, which asks only "which suspensions are due
-- to lift?" — a partial index keeps it proportional to that answer rather than
-- to the size of `profiles`.
create index if not exists ix_profiles_suspended_until
  on public.profiles(suspended_until)
  where suspended_until is not null;

-- Text matching for the vendor-accounts console search (0810b). `profiles` had
-- trigram coverage on neither name nor email, so that search would have been a
-- sequential scan over every account on the platform.
create index if not exists ix_profiles_full_name_trgm
  on public.profiles using gin (full_name gin_trgm_ops);
create index if not exists ix_profiles_email_trgm
  on public.profiles using gin ((email::text) gin_trgm_ops);
