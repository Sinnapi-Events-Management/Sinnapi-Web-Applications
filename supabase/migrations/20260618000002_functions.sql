-- =====================================================================
-- Sinnapi — 0002 Helper & Trigger Functions
-- Authorization helpers (used by RLS) + cross-cutting trigger functions
-- (updated_at, optimistic locking, audit actor, audit log, outbox,
--  append-only guard, derived rollups).
-- =====================================================================

-- ---------------------------------------------------------------------
-- AUTHORIZATION HELPERS  (stable, SECURITY DEFINER, fixed search_path)
-- These are the single source of truth referenced by every RLS policy.
--
-- NOTE: every helper below references tables that are created in LATER
-- migrations (user_roles, roles, vendors, subscriptions, …). They are written
-- in LANGUAGE plpgsql on purpose: plpgsql function bodies are NOT parsed or
-- validated at CREATE time (name resolution is deferred to first execution),
-- so this migration runs cleanly even though those tables do not exist yet.
-- A LANGUAGE sql body would be validated immediately and fail with
-- "relation public.user_roles does not exist".
-- ---------------------------------------------------------------------

create or replace function public.current_user_id()
returns uuid
language sql stable
as $$ select auth.uid(); $$;

-- Does the current user hold the given permission via any of their roles?
create or replace function public.has_permission(p_permission text)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
begin
  return exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p       on p.id = rp.permission_id
    where ur.profile_id = auth.uid()
      and p.key = p_permission
  );
end;
$$;

-- Does the current user hold a role flagged as an admin role?
create or replace function public.is_admin()
returns boolean
language plpgsql stable security definer set search_path = public
as $$
begin
  return exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.profile_id = auth.uid()
      and r.is_admin = true
  );
end;
$$;

create or replace function public.has_role(p_role_key text)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
begin
  return exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.profile_id = auth.uid()
      and r.key = p_role_key
  );
end;
$$;

create or replace function public.is_vendor_owner(p_vendor_id uuid)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
begin
  return exists (
    select 1 from public.vendors v
    where v.id = p_vendor_id and v.owner_id = auth.uid()
  );
end;
$$;

create or replace function public.is_conversation_participant(p_conversation_id uuid)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
begin
  return exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.profile_id = auth.uid()
  );
end;
$$;

-- Vendor is approved AND currently entitled to be visible / transact.
create or replace function public.is_approved_active_vendor(p_vendor_id uuid)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
begin
  return exists (
    select 1
    from public.vendors v
    join public.subscriptions s on s.vendor_id = v.id
    where v.id = p_vendor_id
      and v.owner_id = auth.uid()
      and v.deleted_at is null
      and v.status = 'active'
      and s.status in ('trialing','active','grace')
  );
end;
$$;

-- ---------------------------------------------------------------------
-- CROSS-CUTTING TRIGGER FUNCTIONS
-- ---------------------------------------------------------------------

-- Maintain updated_at on every UPDATE.
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Optimistic locking: if the client supplies an unchanged version equal to
-- the stored one we bump it; if it supplies a *stale* version we reject.
create or replace function public.tg_bump_version()
returns trigger language plpgsql as $$
begin
  if new.version is distinct from old.version then
    -- client passed a version: must match current row (optimistic lock)
    if new.version <> old.version then
      raise exception 'optimistic_lock_conflict: stale version % (current %)',
        new.version, old.version
        using errcode = '40001';
    end if;
  end if;
  new.version := old.version + 1;
  return new;
end;
$$;

-- Stamp created_by / updated_by from the JWT subject.
create or replace function public.tg_set_audit_actor()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.created_by is null then new.created_by := auth.uid(); end if;
    new.updated_by := auth.uid();
  elsif tg_op = 'UPDATE' then
    new.updated_by := auth.uid();
  end if;
  return new;
end;
$$;

-- Convert a hard DELETE into a soft delete (set deleted_at) and cancel the
-- physical removal. Attach as a BEFORE DELETE trigger on soft-deletable tables.
create or replace function public.tg_soft_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  execute format(
    'update %I.%I set deleted_at = now(), deleted_by = $1 where id = $2 and deleted_at is null',
    tg_table_schema, tg_table_name
  ) using auth.uid(), old.id;
  return null; -- cancel the physical DELETE; row is now soft-deleted
end;
$$;

-- Generic immutable-table guard for append-only ledgers / logs / events.
create or replace function public.tg_block_mutations()
returns trigger language plpgsql as $$
begin
  raise exception 'append_only: % on % is not permitted', tg_op, tg_table_name
    using errcode = '0A000';
end;
$$;

-- Generic audit writer. Attach with: ... execute function tg_write_audit('action_label')
create or replace function public.tg_write_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_action     text := coalesce(tg_argv[0], lower(tg_op) || '_' || tg_table_name);
  v_entity_id  uuid;
  v_before     jsonb;
  v_after      jsonb;
begin
  if tg_op = 'DELETE' then
    v_entity_id := old.id; v_before := to_jsonb(old); v_after := null;
  elsif tg_op = 'UPDATE' then
    v_entity_id := new.id; v_before := to_jsonb(old); v_after := to_jsonb(new);
  else
    v_entity_id := new.id; v_before := null; v_after := to_jsonb(new);
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, before, after, occurred_at)
  values (auth.uid(), v_action, tg_table_name, v_entity_id, v_before, v_after, now());

  return coalesce(new, old);
end;
$$;

-- Generic transactional-outbox emitter for async fan-out.
-- Attach with: ... execute function tg_enqueue_outbox('event_type')
create or replace function public.tg_enqueue_outbox()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_event text := coalesce(tg_argv[0], tg_table_name || '_changed');
begin
  insert into public.outbox(aggregate_type, aggregate_id, event_type, payload, status, available_at)
  values (tg_table_name, new.id, v_event, to_jsonb(new), 'pending', now());
  return new;
end;
$$;

-- Recalculate vendor rating rollup when reviews change.
create or replace function public.tg_recalc_vendor_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_vendor uuid := coalesce(new.vendor_id, old.vendor_id);
begin
  update public.vendors v
  set avg_rating = sub.avg_rating, review_count = sub.cnt
  from (
    select coalesce(round(avg(rating)::numeric, 2), 0) as avg_rating, count(*) as cnt
    from public.reviews
    where vendor_id = v_vendor and status = 'published' and deleted_at is null
  ) sub
  where v.id = v_vendor;
  return null;
end;
$$;

-- When a booking is confirmed, auto-block the vendor's date.
create or replace function public.tg_auto_block_date()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'confirmed' and (old.status is distinct from new.status) then
    insert into public.vendor_blocked_dates(vendor_id, blocked_date, source, booking_id, reason)
    values (new.vendor_id, new.event_date, 'booking', new.id, 'Confirmed booking')
    on conflict (vendor_id, blocked_date, source) do nothing;
  end if;
  return new;
end;
$$;
