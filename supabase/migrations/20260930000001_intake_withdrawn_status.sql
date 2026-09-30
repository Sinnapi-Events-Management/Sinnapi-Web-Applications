-- =====================================================================
-- Sinnapi — 0930a Intake: 'withdrawn' status + supersede link
--
-- THE INCIDENT THIS COMES FROM
-- One applicant submitted the same email three times (a typo in the business
-- name on the first, corrected on the next two). All three sat in the review
-- queue as independent rows, indistinguishable from three separate businesses.
-- Compliance approved the first, was told to disregard it, then approved the
-- second — and `approve_vendor` happily created a SECOND live vendor and a
-- SECOND trial subscription for the same owner, while `promote-intake` skipped
-- the password because the account already existed. Three bugs, one root cause:
-- nothing in the intake table could express "this submission was replaced".
--
-- WHAT THIS ADDS
--   • status 'withdrawn' — a fourth, terminal-but-reversible state for a
--     submission that should not be acted on: superseded by a newer one from
--     the same applicant, or retired by an admin. Deliberately NOT 'rejected':
--     rejection is a decision about the business and emails the applicant a
--     reason. A withdrawn duplicate is bookkeeping and says nothing about them.
--   • superseded_by_intake_id — which submission replaced this one, so the
--     queue can show the chain instead of leaving a reviewer guessing.
--
-- Nothing is deleted. The applicant's terms acceptances, marketing-consent
-- evidence, IP and user agent are the record that they applied at all, and are
-- exactly what we would need if a submission were ever disputed.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Widen the status domain.
-- The column is a text + CHECK rather than an enum, so this is a constraint
-- swap. Named explicitly because the original was created inline (and so
-- carries a generated name we cannot rely on across environments).
-- ---------------------------------------------------------------------
do $$
declare v_con text;
begin
  select con.conname into v_con
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'vendor_application_intake'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%status%'
    and pg_get_constraintdef(con.oid) ilike '%submitted%'
  limit 1;

  if v_con is not null then
    execute format('alter table public.vendor_application_intake drop constraint %I', v_con);
  end if;
end$$;

alter table public.vendor_application_intake
  add constraint vendor_application_intake_status_check
  check (status in ('submitted', 'reviewing', 'approved', 'rejected', 'withdrawn'));

-- ---------------------------------------------------------------------
-- 2. The supersede link.
-- Self-referencing and nullable: only a withdrawn-because-replaced row carries
-- it. `on delete set null` so removing an intake never strands a dangling id.
-- ---------------------------------------------------------------------
alter table public.vendor_application_intake
  add column if not exists superseded_by_intake_id uuid
    references public.vendor_application_intake(id) on delete set null;

comment on column public.vendor_application_intake.superseded_by_intake_id is
  'The newer submission from the same owner_email that replaced this one. Set by '
  'the vendor-application Edge Function when it withdraws a pending duplicate.';

-- The queue filters on status constantly; 'withdrawn' rows are the ones it most
-- wants to exclude, so keep them out of the way of the common scan.
create index if not exists ix_intake_pending_email
  on public.vendor_application_intake(owner_email)
  where status in ('submitted', 'reviewing');

-- ---------------------------------------------------------------------
-- 3. set_intake_status accepts 'withdrawn'.
-- 'approved' stays unexpressible here for the original reason: approval must
-- create an auth user, which only the promote-intake Edge Function can do.
--
-- Withdrawing is gated on `vendor.review` like every other transition, and the
-- guard below is the important part: an APPROVED intake can never be withdrawn.
-- Doing so would orphan the vendor, subscription and application that approval
-- created — the same reason set-intake-status already treats approved as
-- terminal. Undoing a live approval is a deliberate, scripted operation, not a
-- button.
-- ---------------------------------------------------------------------
create or replace function public.set_intake_status(
  p_intake_id uuid,
  p_status    text,
  p_notes     text default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_current text;
begin
  if not public.has_permission('vendor.review') then perform public._forbidden(); end if;
  if p_status not in ('submitted', 'reviewing', 'rejected', 'withdrawn') then
    raise exception 'invalid_status: %', p_status;
  end if;

  select status into v_current
  from public.vendor_application_intake
  where id = p_intake_id
  for update;

  if v_current is null then raise exception 'not_found'; end if;

  -- An approved intake owns a live vendor. Moving it anywhere else would leave
  -- that vendor with no submission behind it.
  if v_current = 'approved' then
    raise exception 'intake_already_approved';
  end if;

  update public.vendor_application_intake
     set status       = p_status,
         review_notes = coalesce(nullif(btrim(p_notes), ''), review_notes),
         reviewed_by  = auth.uid(),
         reviewed_at  = now()
   where id = p_intake_id;
end;$$;

grant execute on function public.set_intake_status(uuid, text, text) to authenticated;
