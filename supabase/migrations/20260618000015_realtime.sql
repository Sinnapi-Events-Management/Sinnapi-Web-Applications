-- =====================================================================
-- Sinnapi — 0015 Realtime
-- (1) postgres_changes: add streamed tables to the supabase_realtime
--     publication; base-table RLS already governs which rows a user sees.
-- (2) Broadcast/Presence: channel authorization policies on realtime.messages.
-- =====================================================================

-- ---------- postgres_changes publication ----------
do $$
declare r record;
begin
  for r in select unnest(array[
    'messages','conversations','notifications','bookings','quotations',
    'escrow_transactions','subscriptions','event_interests','disputes','payouts','reviews'
  ]) as t
  loop
    -- capture full old row on update so client-side filters work
    execute format('alter table public.%I replica identity full;', r.t);
    -- add to publication if not already a member
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=r.t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', r.t);
    end if;
  end loop;
end$$;

-- ---------------------------------------------------------------------
-- Channel authorization helper (Broadcast/Presence)
-- Topic conventions:
--   conversation:{id} | booking:{id} | quotation:{id} | escrow:{id}
--   vendor:{id}:dashboard | subscription:{id} | event:{id}:interests
--   user:{id}:notifications | admin:alerts | admin:moderation
-- ---------------------------------------------------------------------
create or replace function public.can_access_topic(p_topic text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_prefix text := split_part(p_topic, ':', 1);
        v_id text := split_part(p_topic, ':', 2);
        v_uuid uuid;
begin
  if auth.uid() is null then return false; end if;
  begin v_uuid := v_id::uuid; exception when others then v_uuid := null; end;

  return case v_prefix
    when 'conversation' then public.is_conversation_participant(v_uuid) or public.has_permission('moderation.manage')
    when 'booking' then exists (select 1 from public.bookings b where b.id=v_uuid
                         and (b.client_id=auth.uid() or public.is_vendor_owner(b.vendor_id) or public.has_permission('bookings.read')))
    when 'quotation' then exists (select 1 from public.quotations q where q.id=v_uuid
                         and (q.client_id=auth.uid() or public.is_vendor_owner(q.vendor_id)))
    when 'escrow' then exists (select 1 from public.escrow_transactions e where e.id=v_uuid
                         and (e.client_id=auth.uid() or public.is_vendor_owner(e.vendor_id) or public.has_permission('escrow.read')))
    when 'subscription' then exists (select 1 from public.subscriptions s where s.id=v_uuid
                         and (public.is_vendor_owner(s.vendor_id) or public.has_permission('subscriptions.manage')))
    when 'vendor' then public.is_vendor_owner(v_uuid) or public.has_permission('vendor.manage')
    when 'event' then exists (select 1 from public.events e where e.id=v_uuid and e.posted_by=auth.uid()) or public.is_admin()
    when 'user' then v_uuid = auth.uid()
    when 'admin' then public.is_admin()
    else false
  end;
end;$$;

-- ---------- Policies on realtime.messages (Broadcast & Presence) ----------
-- These govern who may subscribe to / publish on a channel topic.
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema='realtime' and table_name='messages') then

    execute $p$
      create policy sinnapi_realtime_receive on realtime.messages
        for select to authenticated
        using ( public.can_access_topic((select realtime.topic())) );
    $p$;

    execute $p$
      create policy sinnapi_realtime_send on realtime.messages
        for insert to authenticated
        with check ( public.can_access_topic((select realtime.topic())) );
    $p$;
  end if;
end$$;
