-- =====================================================================
-- Sinnapi — 0018 Vendor Application Intake: compliance review actions
-- Stage 1 of the intake → vendor_applications promotion funnel.
--
-- The admin portal now reads `vendor_application_intake` (the anonymous,
-- account-less public submissions) as its "Applications" queue. This adds
-- the server-side transition compliance uses to triage an intake:
--   submitted → reviewing → rejected
-- Approval/promotion (creating an auth user + vendor_applications row) is a
-- separate service-role Edge Function shipped in Stage 2 and deliberately
-- NOT expressible as a SQL RPC (it must create an auth.users row).
--
-- No change to `vendor_applications` or its approve/reject/transition RPCs.
-- =====================================================================

-- When compliance last acted on the intake (distinct from created_at/updated_at).
alter table public.vendor_application_intake
  add column if not exists reviewed_at timestamptz;

-- Set by the Stage 2 promote-intake Edge Function to the vendor_applications
-- row it creates. Null until an intake is promoted; lets the UI show the link
-- and makes promotion idempotent.
alter table public.vendor_application_intake
  add column if not exists promoted_application_id uuid references public.vendor_applications(id);

-- Triage an intake. Guarded by `vendor.review` (same permission that already
-- gates the intake_read/intake_update RLS policies). 'approved' is intentionally
-- NOT allowed here — approval happens via the promote-intake Edge Function so a
-- vendor is only ever created through the auth-bound pipeline.
create or replace function public.set_intake_status(
  p_intake_id uuid,
  p_status    text,
  p_notes     text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_permission('vendor.review') then perform public._forbidden(); end if;
  if p_status not in ('submitted', 'reviewing', 'rejected') then
    raise exception 'invalid_status: %', p_status;
  end if;

  update public.vendor_application_intake
     set status       = p_status,
         review_notes = coalesce(nullif(btrim(p_notes), ''), review_notes),
         reviewed_by  = auth.uid(),
         reviewed_at  = now()
   where id = p_intake_id;

  if not found then raise exception 'not_found'; end if;
end;$$;

-- The blanket grant in 0014 only covered functions that existed then; grant the
-- new one explicitly (PostgREST calls it as the authenticated role).
grant execute on function public.set_intake_status(uuid, text, text) to authenticated;
