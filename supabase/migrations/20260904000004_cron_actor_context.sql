-- =====================================================================
-- Sinnapi — 0904d The gap arguments cannot reach: pg_cron
--
-- 0904c makes the money RPCs take a context as an argument, which works for
-- everything an Edge Function calls. Two schedules are not reached that way at
-- all. They run INSIDE the database, invoked by pg_cron with no HTTP request,
-- no JWT and no Edge Function anywhere in the path:
--
--   sinnapi_settlement_sla        (0809e:131) files overdue payouts as
--                                 reconciliation exceptions — a money RPC,
--                                 called straight from a cron body
--   sinnapi_suspension_expiry     (0810b:527) lifts expired suspensions,
--                                 which writes `profiles`, an audited table
--
-- Both fire `tg_write_audit` with `auth.uid()` null, so both produced 'system'
-- rows indistinguishable from an IPN's. Passing a context is impossible for
-- them — there is no caller to pass it — so they set it themselves.
--
-- Three more RPCs are reached from the two lifecycle Edge Functions and so
-- COULD take an argument. They take one, and they also DEFAULT to a cron
-- context rather than to null:
--
--   apply_subscription_state    rolls trials and periods over, writing
--                               `subscriptions`, and can hide a vendor
--   auto_request_release        writes `escrow_transactions`
--   remind_subscription_renewal writes `subscriptions`
--
-- A null default would mean the sweep silently writing 'system' rows on the
-- day someone forgets to pass one, and an unattributed vendor hiding is
-- exactly the event someone will later be asked to explain. Defaulting to
-- 'cron' makes the safe answer the automatic one.
--
-- NOT INCLUDED, deliberately: `sinnapi_quote_expiry` and `sinnapi_dispute_sla`
-- (0016:57, 0016:63). Neither writes a table `tg_write_audit` is attached to —
-- one expires quotations, the other inserts notifications — so neither
-- produces an audit row to mis-attribute. Adding context to them would be
-- ceremony.
-- =====================================================================

-- ---------------------------------------------------------------------
-- apply_subscription_state — the body is untouched; it gains a context and a
-- default, the same rename-and-wrap treatment 0904c gave the eleven.
--
-- `p_context` is not defaulted to null here but to a cron context. The
-- function has exactly one caller — the fifteen-minute `subscription-lifecycle`
-- sweep — and there is no plausible second one that is not also a schedule.
-- A null default would mean the sweep silently writing 'system' rows on the
-- day someone forgets to pass it.
-- ---------------------------------------------------------------------
alter function public.apply_subscription_state() rename to apply_subscription_state_core;

create function public.apply_subscription_state(p_context jsonb default null)
returns integer language plpgsql security definer set search_path = public as $$
begin
  perform public._set_payment_context(
    coalesce(p_context, jsonb_build_object(
      'actor_kind', 'cron', 'actor_label', 'subscription-lifecycle')),
    'apply_subscription_state');
  return public.apply_subscription_state_core();
end;$$;

revoke all on function public.apply_subscription_state_core()
  from public, anon, authenticated, service_role;
revoke all on function public.apply_subscription_state(jsonb) from public, anon, authenticated;
grant execute on function public.apply_subscription_state(jsonb) to service_role;

-- ---------------------------------------------------------------------
-- expire_vendor_suspensions — same treatment.
--
-- This one is worth naming precisely because it looks harmless. It lifts a
-- suspension, which means it writes `profiles.status` — and `profiles` has
-- carried `trg_audit_log` since 0618j. An admin suspending an account and the
-- clock un-suspending it produced audit rows that differed only in the
-- direction of the status change. Now one says 'user' with a name on it and
-- the other says 'cron / vendor-suspension-expiry'.
-- ---------------------------------------------------------------------
alter function public.expire_vendor_suspensions() rename to expire_vendor_suspensions_core;

create function public.expire_vendor_suspensions(p_context jsonb default null)
returns integer language plpgsql security definer set search_path = public as $$
begin
  perform public._set_payment_context(
    coalesce(p_context, jsonb_build_object(
      'actor_kind', 'cron', 'actor_label', 'vendor-suspension-expiry')),
    'expire_vendor_suspensions');
  return public.expire_vendor_suspensions_core();
end;$$;

revoke all on function public.expire_vendor_suspensions_core()
  from public, anon, authenticated, service_role;
revoke all on function public.expire_vendor_suspensions(jsonb) from public, anon, authenticated;
grant execute on function public.expire_vendor_suspensions(jsonb) to service_role;

-- ---------------------------------------------------------------------
-- The two remaining RPCs the lifecycle sweeps reach that write an AUDITED
-- table. Same treatment; the reason for including exactly these two is worth
-- stating, because the sweeps call eight RPCs between them and six are not
-- here.
--
--   auto_request_release        writes `escrow_transactions`   -> audited
--   remind_subscription_renewal writes `subscriptions`         -> audited
--
-- Not included, and deliberately: `escalate_settlement` (writes
-- `settlement_requests`), `remind_booking_payment` and
-- `flag_booking_payment_overdue` (both write `bookings`). None of those three
-- tables carries `trg_audit_log`, so none of them produces an audit row that
-- could be mis-attributed. Wrapping them would add an argument, an
-- indirection and a maintenance rule in exchange for nothing.
--
-- The line being drawn is "does this write a table `tg_write_audit` is
-- attached to", not "is this part of the payment flow" — because the defect
-- being fixed is specifically that audit rows name nobody.
-- ---------------------------------------------------------------------
alter function public.auto_request_release(uuid) rename to auto_request_release_core;

create function public.auto_request_release(
  p_escrow_id uuid,
  p_context   jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._set_payment_context(
    coalesce(p_context, jsonb_build_object(
      'actor_kind', 'cron', 'actor_label', 'escrow-lifecycle')),
    'auto_request_release');
  -- The release is of money that arrived on the escrow's funding payment, so
  -- that payment's trace is this action's trace.
  perform public._ensure_correlation((
    select p.correlation_id
      from public.escrow_transactions t
      join public.payments p on p.id = t.funding_payment_id
     where t.id = p_escrow_id));
  perform public.auto_request_release_core(p_escrow_id);
end;$$;

revoke all on function public.auto_request_release_core(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.auto_request_release(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.auto_request_release(uuid, jsonb) to service_role;

alter function public.remind_subscription_renewal(uuid, integer)
  rename to remind_subscription_renewal_core;

create function public.remind_subscription_renewal(
  p_subscription_id uuid,
  p_day_mark        integer,
  p_context         jsonb default null)
returns text language plpgsql security definer set search_path = public as $$
begin
  perform public._set_payment_context(
    coalesce(p_context, jsonb_build_object(
      'actor_kind', 'cron', 'actor_label', 'subscription-lifecycle')),
    'remind_subscription_renewal');
  return public.remind_subscription_renewal_core(p_subscription_id, p_day_mark);
end;$$;

revoke all on function public.remind_subscription_renewal_core(uuid, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.remind_subscription_renewal(uuid, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.remind_subscription_renewal(uuid, integer, jsonb) to service_role;

-- ---------------------------------------------------------------------
-- RESCHEDULE the two pure-SQL jobs so their bodies name themselves.
--
-- `sinnapi_settlement_sla` is re-registered with the same expression it has
-- always had plus the eleventh argument 0904c added to
-- `raise_reconciliation_exception`. Everything else about it — the schedule,
-- the SLA setting, the dedupe key — is reproduced exactly from 0809e:131.
-- The body is four lines of SQL, so unlike the money RPCs there is nothing
-- here that reproduction can silently get wrong.
--
-- `sinnapi_suspension_expiry` needs no change to its body: the default context
-- is inside the function now. It is re-registered anyway so its `select` names
-- the new one-argument signature explicitly rather than resolving to it by
-- luck of the default.
--
-- Skipped cleanly when pg_cron is absent, mirroring 0016_cron.sql and every
-- scheduling block since. Local development and the migration-verification
-- container both run without it.
-- ---------------------------------------------------------------------
do $$
begin
  if to_regnamespace('cron') is null then
    raise notice 'pg_cron not installed; skipping 0904d cron re-registration';
    return;
  end if;

  perform cron.unschedule(jobid) from cron.job where jobname = 'sinnapi_settlement_sla';
  perform cron.schedule('sinnapi_settlement_sla', '30 6 * * *', $f$
    select public.raise_reconciliation_exception(
             'overdue_settlement',
             'payout:' || p.id::text || ':overdue',
             'Payout has been awaiting settlement past the configured SLA',
             jsonb_build_object('vendor_id', p.vendor_id, 'kind', p.kind),
             p.amount, null, p.escrow_id, null, p.id, 'critical',
             jsonb_build_object('actor_kind', 'cron', 'actor_label', 'settlement-sla',
                                'source', 'pg_cron:sinnapi_settlement_sla'))
    from public.payouts p
    where p.status in ('requested', 'approved')
      and p.due_at is not null
      and p.due_at < now() - make_interval(hours =>
            coalesce((public.get_setting('escrow_settlement_sla_hours') #>> '{}')::integer, 48));
  $f$);

  perform cron.unschedule(jobid) from cron.job where jobname = 'sinnapi_suspension_expiry';
  perform cron.schedule('sinnapi_suspension_expiry', '20 * * * *', $f$
    select public.expire_vendor_suspensions(
             jsonb_build_object('actor_kind', 'cron', 'actor_label', 'vendor-suspension-expiry',
                                'source', 'pg_cron:sinnapi_suspension_expiry'));
  $f$);
end$$;

-- ---------------------------------------------------------------------
-- VERIFY. Same reasoning as 0904c's assertion block: the rename leaves the
-- old name reachable if anything went wrong, and an overload here breaks the
-- subscription sweep at the next quarter hour rather than at deploy.
-- ---------------------------------------------------------------------
do $$
declare r record; v_n integer; v_def text;
begin
  for r in
    select * from (values
      ('apply_subscription_state',    1),
      ('expire_vendor_suspensions',   1),
      ('auto_request_release',        2),
      ('remind_subscription_renewal', 3)
    ) as t(fname, nargs)
  loop
    select count(*) into v_n
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = r.fname;
    if v_n <> 1 then
      raise exception '% has % definitions, expected exactly 1 (PGRST203)', r.fname, v_n;
    end if;

    select pg_get_functiondef(p.oid), p.pronargs into v_def, v_n
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = r.fname;
    if v_n <> r.nargs then
      raise exception '% takes % arguments, expected %', r.fname, v_n, r.nargs;
    end if;
    if v_def not like '%_set_payment_context%' then
      raise exception '% no longer establishes an audit context', r.fname;
    end if;
  end loop;
end$$;
