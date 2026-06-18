-- =====================================================================
-- Sinnapi — 0010 Trigger Wiring
-- Generic cross-cutting triggers applied by column introspection, plus
-- domain-specific triggers (status history, events, audit, outbox).
-- =====================================================================

-- ---------------------------------------------------------------------
-- GENERIC: updated_at, optimistic locking, audit actor, soft delete
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  -- set_updated_at on every table that has an updated_at column
  for r in
    select c.table_name from information_schema.columns c
    where c.table_schema='public' and c.column_name='updated_at'
  loop
    execute format(
      'create trigger trg_updated_at before update on public.%I
         for each row execute function public.tg_set_updated_at();', r.table_name);
  end loop;

  -- optimistic locking on every table that has a version column
  for r in
    select c.table_name from information_schema.columns c
    where c.table_schema='public' and c.column_name='version'
  loop
    execute format(
      'create trigger trg_bump_version before update on public.%I
         for each row execute function public.tg_bump_version();', r.table_name);
  end loop;

  -- created_by/updated_by stamping where both columns exist
  for r in
    select t.table_name from information_schema.tables t
    where t.table_schema='public' and t.table_type='BASE TABLE'
      and exists (select 1 from information_schema.columns c
                  where c.table_schema='public' and c.table_name=t.table_name and c.column_name='created_by')
      and exists (select 1 from information_schema.columns c
                  where c.table_schema='public' and c.table_name=t.table_name and c.column_name='updated_by')
  loop
    execute format(
      'create trigger trg_audit_actor before insert or update on public.%I
         for each row execute function public.tg_set_audit_actor();', r.table_name);
  end loop;

  -- soft-delete routing on every table that has a deleted_at column
  for r in
    select c.table_name from information_schema.columns c
    where c.table_schema='public' and c.column_name='deleted_at'
  loop
    execute format(
      'create trigger trg_soft_delete before delete on public.%I
         for each row execute function public.tg_soft_delete();', r.table_name);
  end loop;
end$$;

-- ---------------------------------------------------------------------
-- APPEND-ONLY GUARDS (immutable ledgers / logs / event streams)
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select unnest(array[
      'audit_logs','ledger_entries','escrow_events','subscription_events',
      'application_status_history','booking_status_history','quotation_status_history',
      'payment_logs','login_history'
    ]) as t
  loop
    execute format(
      'create trigger trg_append_only before update or delete on public.%I
         for each row execute function public.tg_block_mutations();', r.t);
  end loop;
end$$;

-- ---------------------------------------------------------------------
-- STATUS HISTORY (application / booking / quotation)
-- ---------------------------------------------------------------------
create or replace function public.tg_application_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op='INSERT' or old.status is distinct from new.status then
    insert into public.application_status_history(application_id, from_status, to_status, actor_id, reason)
    values (new.id, case when tg_op='UPDATE' then old.status end, new.status, auth.uid(), new.review_notes);
  end if;
  return new;
end;$$;
create trigger trg_application_history after insert or update of status
  on public.vendor_applications for each row execute function public.tg_application_history();

create or replace function public.tg_booking_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op='INSERT' or old.status is distinct from new.status then
    insert into public.booking_status_history(booking_id, from_status, to_status, actor_id, reason)
    values (new.id, case when tg_op='UPDATE' then old.status end, new.status, auth.uid(), new.cancellation_reason);
  end if;
  return new;
end;$$;
create trigger trg_booking_history after insert or update of status
  on public.bookings for each row execute function public.tg_booking_history();

create or replace function public.tg_quotation_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op='INSERT' or old.status is distinct from new.status then
    insert into public.quotation_status_history(quotation_id, from_status, to_status, actor_id)
    values (new.id, case when tg_op='UPDATE' then old.status end, new.status, auth.uid());
  end if;
  return new;
end;$$;
create trigger trg_quotation_history after insert or update of status
  on public.quotations for each row execute function public.tg_quotation_history();

-- ---------------------------------------------------------------------
-- EVENT STREAMS (escrow / subscription)
-- ---------------------------------------------------------------------
create or replace function public.tg_escrow_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op='UPDATE' and old.status is distinct from new.status then
    insert into public.escrow_events(escrow_id, event_type, actor_id, amount, metadata)
    values (new.id, new.status::text::escrow_event_type, auth.uid(), new.gross_amount,
            jsonb_build_object('commission_amount', new.commission_amount,
                               'net_payout_amount', new.net_payout_amount));
  end if;
  return new;
end;$$;
create trigger trg_escrow_event after update of status
  on public.escrow_transactions for each row execute function public.tg_escrow_event();

create or replace function public.tg_subscription_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_evt subscription_event;
begin
  if tg_op='UPDATE' and old.status is distinct from new.status then
    v_evt := case new.status
               when 'trialing' then 'trial_started'
               when 'active'   then 'activated'
               when 'grace'    then 'grace_entered'
               when 'suspended'then 'suspended'
               when 'expired'  then 'expired'
               when 'cancelled'then 'cancelled'
               when 'past_due' then 'payment_failed'
               else 'created' end;
    insert into public.subscription_events(subscription_id, event_type, actor_id)
    values (new.id, v_evt, auth.uid());
  end if;
  return new;
end;$$;
create trigger trg_subscription_event after update of status
  on public.subscriptions for each row execute function public.tg_subscription_event();

-- ---------------------------------------------------------------------
-- ROLLUPS & SIDE EFFECTS
-- ---------------------------------------------------------------------
create trigger trg_recalc_rating after insert or update or delete
  on public.reviews for each row execute function public.tg_recalc_vendor_rating();

create trigger trg_auto_block_date after update of status
  on public.bookings for each row execute function public.tg_auto_block_date();

-- ---------------------------------------------------------------------
-- AUDIT LOGGING (sensitive tables)
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select unnest(array[
      'profiles','roles','role_permissions','user_roles','platform_settings',
      'vendor_bank_accounts','vendor_documents','subscriptions',
      'escrow_transactions','payouts','refunds','disputes','payments',
      'pricing_plans','data_retention_policies','erasure_requests'
    ]) as t
  loop
    execute format(
      'create trigger trg_audit_log after insert or update or delete on public.%I
         for each row execute function public.tg_write_audit();', r.t);
  end loop;
end$$;

-- ---------------------------------------------------------------------
-- OUTBOX (async fan-out: notifications / realtime / indexing / email)
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select unnest(array[
      'vendor_applications','bookings','quotations','escrow_transactions',
      'payments','subscriptions','reviews','event_interests','messages'
    ]) as t
  loop
    execute format(
      'create trigger trg_outbox after insert or update on public.%I
         for each row execute function public.tg_enqueue_outbox(%L);',
      r.t, r.t || '_changed');
  end loop;
end$$;
