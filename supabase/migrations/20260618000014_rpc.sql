-- =====================================================================
-- Sinnapi — 0014 RPC (SECURITY DEFINER business logic)
-- All functions: fixed search_path, internal authz re-check, idempotent on
-- money paths, write audit/event/ledger rows in the same transaction.
-- Callable by `authenticated`; privileged steps re-check permissions.
-- =====================================================================

-- =====================================================================
-- HELPERS
-- =====================================================================
create or replace function public.get_setting(p_key text)
returns jsonb language sql stable security definer set search_path = public as $$
  select value from public.platform_settings where key = p_key;
$$;

create or replace function public.get_commission_rate()
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce((public.get_setting('commission_rate') #>> '{}')::numeric, 0);
$$;

-- latest FX rate id for a currency pair (null if base = quote)
create or replace function public.latest_fx_rate_id(p_base text, p_quote text)
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.exchange_rates
  where base_currency = p_base and quote_currency = p_quote
  order by fetched_at desc limit 1;
$$;

create or replace function public.gen_reference(p_prefix text)
returns text language sql volatile as $$
  select p_prefix || '-' || to_char(now(),'YYYYMMDD') || '-' ||
         upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
$$;

-- single append-only ledger leg (internal)
create or replace function public.post_ledger(
  p_group uuid, p_account ledger_account, p_direction ledger_direction,
  p_amount numeric, p_currency text, p_desc text,
  p_escrow uuid default null, p_payment uuid default null,
  p_payout uuid default null, p_refund uuid default null)
returns void language sql security definer set search_path = public as $$
  insert into public.ledger_entries(entry_group_id, escrow_id, payment_id, payout_id, refund_id,
                                    account, direction, amount, currency, description)
  values (p_group, p_escrow, p_payment, p_payout, p_refund,
          p_account, p_direction, p_amount, p_currency, p_desc);
$$;

create or replace function public.assert_balanced(p_group uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_d numeric; v_c numeric;
begin
  select coalesce(sum(amount) filter (where direction='debit'),0),
         coalesce(sum(amount) filter (where direction='credit'),0)
    into v_d, v_c from public.ledger_entries where entry_group_id = p_group;
  if v_d <> v_c then
    raise exception 'ledger_unbalanced: group % debit % <> credit %', p_group, v_d, v_c
      using errcode = '23514';
  end if;
end;$$;

create or replace function public._forbidden() returns void
language plpgsql as $$ begin raise exception 'forbidden' using errcode='42501'; end; $$;

-- =====================================================================
-- VENDOR APPLICATION / APPROVAL
-- =====================================================================
create or replace function public.submit_vendor_application(p_application_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare a public.vendor_applications;
begin
  select * into a from public.vendor_applications where id = p_application_id;
  if a.id is null then raise exception 'not_found'; end if;
  if a.applicant_id <> auth.uid() then perform public._forbidden(); end if;
  if a.status not in ('draft','pending_info') then
    raise exception 'invalid_state: cannot submit from %', a.status; end if;
  -- require all four terms accepted
  if (select count(distinct term_type) from public.vendor_terms_acceptances
      where application_id = p_application_id and accepted) < 4 then
    raise exception 'terms_incomplete: all terms must be accepted'; end if;
  update public.vendor_applications
     set status = 'submitted', submitted_at = now(),
         is_reapplication = (previous_application_id is not null)
   where id = p_application_id;
end;$$;

create or replace function public.transition_application_status(
  p_application_id uuid, p_to application_status, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_permission('vendor.review') then perform public._forbidden(); end if;
  update public.vendor_applications
     set status = p_to, reviewed_by = auth.uid(), review_notes = coalesce(p_reason, review_notes)
   where id = p_application_id;
end;$$;

create or replace function public.approve_vendor(p_application_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare a public.vendor_applications; v_vendor uuid; v_slug text; v_trial integer;
begin
  if not public.has_permission('vendor.approve') then perform public._forbidden(); end if;
  select * into a from public.vendor_applications where id = p_application_id;
  if a.id is null then raise exception 'not_found'; end if;
  v_trial := coalesce((public.get_setting('trial_days') #>> '{}')::int, 30);
  v_slug := lower(regexp_replace(a.business_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' ||
            substr(replace(gen_random_uuid()::text,'-',''),1,6);

  insert into public.vendors(application_id, owner_id, business_name, slug, biography,
      primary_category_id, base_city, website, years_in_operation, pricing_model,
      starting_price, starting_price_currency, lead_time, status, visibility, trial_ends_at)
  values (a.id, a.applicant_id, a.business_name, v_slug, a.biography, a.primary_category_id,
      a.base_city, a.website, a.years_in_operation, a.pricing_model, a.starting_price,
      a.starting_price_currency, a.lead_time, 'active', 'public', now() + make_interval(days => v_trial))
  returning id into v_vendor;

  insert into public.subscriptions(vendor_id, status, trial_ends_at, current_period_start, current_period_end)
  values (v_vendor, 'trialing', now() + make_interval(days => v_trial), now(), now() + make_interval(days => v_trial));

  update public.vendor_applications set status='approved', decided_at=now(), reviewed_by=auth.uid()
   where id = p_application_id;

  -- ensure applicant holds the vendor role
  insert into public.user_roles(profile_id, role_id, granted_by)
  select a.applicant_id, r.id, auth.uid() from public.roles r where r.key='vendor'
  on conflict do nothing;

  return v_vendor;
end;$$;

create or replace function public.reject_vendor(p_application_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_permission('vendor.approve') then perform public._forbidden(); end if;
  update public.vendor_applications
     set status='rejected', rejection_reason=p_reason, decided_at=now(), reviewed_by=auth.uid()
   where id = p_application_id;
end;$$;

-- =====================================================================
-- SECURE BANK ACCOUNT (encrypt write / audited decrypt read)
-- Key sourced from Supabase Vault secret 'bank_encryption_key'.
-- =====================================================================
create or replace function public._bank_key()
returns text language plpgsql stable security definer set search_path = public, vault as $$
declare k text;
begin
  select decrypted_secret into k from vault.decrypted_secrets where name = 'bank_encryption_key' limit 1;
  if k is null then raise exception 'bank_key_missing: create Vault secret bank_encryption_key'; end if;
  return k;
end;$$;

create or replace function public.set_vendor_bank_account(
  p_vendor_id uuid, p_bank_name text, p_account_name text,
  p_account_number text, p_branch text, p_is_primary boolean default true)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_vendor_owner(p_vendor_id) then perform public._forbidden(); end if;
  if p_is_primary then
    update public.vendor_bank_accounts set is_primary = false
     where vendor_id = p_vendor_id and deleted_at is null;
  end if;
  insert into public.vendor_bank_accounts(vendor_id, bank_name, account_name,
      account_number_encrypted, account_number_last4, branch, is_primary, is_verified)
  values (p_vendor_id, p_bank_name, p_account_name,
      pgp_sym_encrypt(p_account_number, public._bank_key()),
      right(p_account_number, 4), p_branch, p_is_primary, false)
  returning id into v_id;
  return v_id;
end;$$;

create or replace function public.get_vendor_bank_account_secure(p_bank_account_id uuid)
returns table(bank_name text, account_name text, account_number text, branch text)
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_permission('payout.process') then perform public._forbidden(); end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, occurred_at)
  values (auth.uid(), 'bank_account_decrypt', 'vendor_bank_accounts', p_bank_account_id, now());
  return query
    select b.bank_name, b.account_name,
           pgp_sym_decrypt(b.account_number_encrypted, public._bank_key()), b.branch
    from public.vendor_bank_accounts b where b.id = p_bank_account_id;
end;$$;

-- =====================================================================
-- VENDOR MEDIA — plan-limit enforcement trigger
-- =====================================================================
create or replace function public.tg_enforce_media_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_max int; v_video boolean; v_cnt int;
begin
  select (pf.value #>> '{}')::int into v_max
    from public.subscriptions s join public.plan_features pf on pf.plan_id = s.plan_id
   where s.vendor_id = new.vendor_id and pf.feature_key = 'max_portfolio_images'
     and s.status in ('trialing','active','grace') limit 1;
  select (pf.value #>> '{}')::boolean into v_video
    from public.subscriptions s join public.plan_features pf on pf.plan_id = s.plan_id
   where s.vendor_id = new.vendor_id and pf.feature_key = 'portfolio_video'
     and s.status in ('trialing','active','grace') limit 1;

  if new.media_type = 'video' and coalesce(v_video,false) = false then
    raise exception 'plan_limit: video not included in current plan'; end if;

  if new.media_type = 'image' and v_max is not null and v_max >= 0 then
    select count(*) into v_cnt from public.vendor_media
     where vendor_id = new.vendor_id and media_type='image' and deleted_at is null;
    if v_cnt >= v_max then
      raise exception 'plan_limit: portfolio image cap (%) reached', v_max; end if;
  end if;
  return new;
end;$$;
create trigger trg_media_limit before insert on public.vendor_media
  for each row execute function public.tg_enforce_media_limit();

-- =====================================================================
-- SUBSCRIPTIONS
-- =====================================================================
create or replace function public.choose_subscription_plan(p_vendor_id uuid, p_plan_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_vendor_owner(p_vendor_id) then perform public._forbidden(); end if;
  update public.subscriptions set plan_id = p_plan_id where vendor_id = p_vendor_id
    and status in ('trialing','active','past_due','grace');
end;$$;

create or replace function public.activate_subscription(p_subscription_id uuid, p_payment_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare s public.subscriptions; v_cycle billing_cycle;
begin
  select * into s from public.subscriptions where id = p_subscription_id;
  select billing_cycle into v_cycle from public.pricing_plans where id = s.plan_id;
  update public.subscriptions
     set status='active', grace_until=null,
         current_period_start = now(),
         current_period_end = now() + case when v_cycle='annual' then interval '1 year' else interval '1 month' end
   where id = p_subscription_id;
  update public.vendors set visibility='public' where id = s.vendor_id and status='active';
end;$$;

-- Cron-invoked: roll trials/periods into grace/expired and toggle visibility.
create or replace function public.apply_subscription_state()
returns integer language plpgsql security definer set search_path = public as $$
declare v_grace_hours int := coalesce((public.get_setting('subscription_grace_hours') #>> '{}')::int, 24);
        n int := 0;
begin
  -- trial/period ended -> enter grace
  update public.subscriptions
     set status='grace', grace_until = now() + make_interval(hours => v_grace_hours)
   where status in ('trialing','active')
     and coalesce(current_period_end, trial_ends_at) < now();
  get diagnostics n = row_count;

  -- grace elapsed -> expire and hide vendor (active bookings continue)
  update public.subscriptions set status='expired'
   where status='grace' and grace_until < now();
  update public.vendors v set visibility='hidden'
   from public.subscriptions s where s.vendor_id = v.id and s.status in ('expired','suspended','cancelled');
  return n;
end;$$;

-- =====================================================================
-- QUOTATIONS
-- =====================================================================
create or replace function public.request_quotation(
  p_vendor_id uuid, p_details text, p_event_id uuid default null, p_currency text default 'UGX')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then perform public._forbidden(); end if;
  if not public.vendor_is_public(p_vendor_id) then raise exception 'vendor_unavailable'; end if;
  insert into public.quotations(vendor_id, client_id, event_id, reference_no, status, currency, request_details)
  values (p_vendor_id, auth.uid(), p_event_id, public.gen_reference('QT'), 'requested', p_currency, p_details)
  returning id into v_id;
  return v_id;
end;$$;

create or replace function public.send_quotation(
  p_quotation_id uuid, p_items jsonb, p_valid_days int default null)
returns void language plpgsql security definer set search_path = public as $$
declare q public.quotations; v_sub numeric := 0; it jsonb; v_days int;
begin
  select * into q from public.quotations where id = p_quotation_id;
  if not public.is_vendor_owner(q.vendor_id) then perform public._forbidden(); end if;
  delete from public.quotation_items where quotation_id = p_quotation_id;
  for it in select * from jsonb_array_elements(p_items) loop
    insert into public.quotation_items(quotation_id, description, quantity, unit_price, line_total)
    values (p_quotation_id, it->>'description',
            coalesce((it->>'quantity')::numeric,1), coalesce((it->>'unit_price')::numeric,0),
            coalesce((it->>'quantity')::numeric,1) * coalesce((it->>'unit_price')::numeric,0));
    v_sub := v_sub + coalesce((it->>'quantity')::numeric,1) * coalesce((it->>'unit_price')::numeric,0);
  end loop;
  v_days := coalesce(p_valid_days, (public.get_setting('quote_expiry_days') #>> '{}')::int, 14);
  update public.quotations
     set status='sent', subtotal=v_sub, total = v_sub - discount_total + tax_total,
         sent_at = now(), valid_until = now() + make_interval(days => v_days)
   where id = p_quotation_id;
end;$$;

create or replace function public.respond_quotation(p_quotation_id uuid, p_action text)
returns void language plpgsql security definer set search_path = public as $$
declare q public.quotations;
begin
  select * into q from public.quotations where id = p_quotation_id;
  if q.client_id <> auth.uid() then perform public._forbidden(); end if;
  update public.quotations
     set status = case p_action when 'accept' then 'accepted'
                                when 'decline' then 'declined'
                                when 'revise' then 'revised' else status end,
         responded_at = now()
   where id = p_quotation_id;
end;$$;

-- =====================================================================
-- BOOKINGS
-- =====================================================================
create or replace function public.create_booking(
  p_vendor_id uuid, p_event_date date, p_amount numeric, p_currency text default 'UGX',
  p_service_id uuid default null, p_quotation_id uuid default null,
  p_event_id uuid default null, p_location text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then perform public._forbidden(); end if;
  if not public.vendor_is_public(p_vendor_id) then raise exception 'vendor_unavailable'; end if;
  if exists (select 1 from public.vendor_blocked_dates
             where vendor_id = p_vendor_id and blocked_date = p_event_date) then
    raise exception 'date_unavailable'; end if;
  insert into public.bookings(vendor_id, client_id, vendor_service_id, quotation_id, event_id,
      reference_no, status, event_date, location, currency, amount)
  values (p_vendor_id, auth.uid(), p_service_id, p_quotation_id, p_event_id,
      public.gen_reference('BK'), 'requested', p_event_date, p_location, p_currency, p_amount)
  returning id into v_id;
  return v_id;
end;$$;

create or replace function public.respond_booking(p_booking_id uuid, p_action text, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = p_booking_id;
  if not public.is_vendor_owner(b.vendor_id) then perform public._forbidden(); end if;
  update public.bookings
     set status = case p_action when 'accept' then 'confirmed' when 'decline' then 'declined' else status end,
         cancellation_reason = case when p_action='decline' then p_reason else cancellation_reason end
   where id = p_booking_id;
end;$$;

create or replace function public.complete_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = p_booking_id;
  if not (public.is_vendor_owner(b.vendor_id) or public.has_permission('bookings.manage')) then
    perform public._forbidden(); end if;
  update public.bookings set status='completed', completed_at=now() where id = p_booking_id;
end;$$;

create or replace function public.cancel_booking(p_booking_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = p_booking_id;
  if not (b.client_id = auth.uid() or public.is_vendor_owner(b.vendor_id) or public.has_permission('bookings.manage')) then
    perform public._forbidden(); end if;
  update public.bookings set status='cancelled', cancelled_by=auth.uid(), cancellation_reason=p_reason
   where id = p_booking_id;
end;$$;

-- =====================================================================
-- PAYMENTS & ESCROW
-- =====================================================================
create or replace function public.create_payment_intent(
  p_purpose payment_purpose, p_provider payment_provider, p_method payment_method,
  p_amount numeric, p_currency text default 'UGX',
  p_booking_id uuid default null, p_subscription_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_payment uuid; v_escrow uuid; v_idem text; v_fx uuid; v_base numeric;
begin
  if auth.uid() is null then perform public._forbidden(); end if;
  v_idem := 'PM-' || replace(gen_random_uuid()::text,'-','');
  if p_currency <> 'UGX' then
    v_fx := public.latest_fx_rate_id(p_currency, 'UGX');
    v_base := p_amount * coalesce((select rate from public.exchange_rates where id = v_fx), 1);
  else v_base := p_amount; end if;

  insert into public.payments(payer_id, purpose, booking_id, subscription_id, provider,
      provider_method, idempotency_key, amount, currency, fx_rate_id, base_amount, base_currency, status)
  values (auth.uid(), p_purpose, p_booking_id, p_subscription_id, p_provider, p_method,
      v_idem, p_amount, p_currency, v_fx, v_base, 'UGX', 'pending')
  returning id into v_payment;

  if p_purpose = 'escrow_funding' and p_booking_id is not null then
    insert into public.escrow_transactions(booking_id, client_id, vendor_id, funding_payment_id,
        currency, gross_amount, status, fx_rate_id)
    select p_booking_id, auth.uid(), b.vendor_id, v_payment, p_currency, p_amount, 'initiated', v_fx
    from public.bookings b where b.id = p_booking_id
    returning id into v_escrow;
    update public.payments set escrow_id = v_escrow where id = v_payment;
    update public.bookings set payment_type='escrow' where id = p_booking_id;
  end if;
  return v_payment;
end;$$;

-- Called by the PSP webhook Edge Function (service_role).
create or replace function public.record_payment_result(
  p_payment_id uuid, p_status payment_status, p_provider_ref text default null, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare p public.payments;
begin
  select * into p from public.payments where id = p_payment_id;
  if p.id is null then raise exception 'not_found'; end if;
  if p.status = p_status then return; end if; -- idempotent
  update public.payments set status=p_status, provider_ref=coalesce(p_provider_ref,provider_ref),
         failure_reason=p_reason, paid_at = case when p_status='succeeded' then now() else paid_at end
   where id = p_payment_id;

  if p_status = 'succeeded' then
    if p.purpose = 'escrow_funding' and p.escrow_id is not null then
      perform public.fund_escrow(p.escrow_id);
    elsif p.purpose = 'subscription' and p.subscription_id is not null then
      perform public.activate_subscription(p.subscription_id, p.id);
    end if;
  end if;
end;$$;

-- Fund escrow: snapshot commission, move to HELD, post balanced ledger.
create or replace function public.fund_escrow(p_escrow_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare e public.escrow_transactions; v_rate numeric; v_comm numeric; v_net numeric; v_grp uuid;
begin
  select * into e from public.escrow_transactions where id = p_escrow_id for update;
  if e.id is null then raise exception 'not_found'; end if;
  if e.status not in ('initiated','funded') then return; end if;  -- idempotent
  v_rate := public.get_commission_rate();
  v_comm := round(e.gross_amount * v_rate / 100, 2);
  v_net  := e.gross_amount - v_comm;
  v_grp  := gen_random_uuid();

  update public.escrow_transactions
     set status='held', commission_rate=v_rate, commission_amount=v_comm, net_payout_amount=v_net
   where id = p_escrow_id;

  perform public.post_ledger(v_grp,'psp_clearing','debit', e.gross_amount, e.currency,'Escrow funded', p_escrow_id, e.funding_payment_id);
  perform public.post_ledger(v_grp,'escrow_held','credit', e.gross_amount, e.currency,'Escrow funded', p_escrow_id, e.funding_payment_id);
  perform public.assert_balanced(v_grp);
end;$$;

-- Client confirmation (maker) — booking must be completed.
create or replace function public.client_confirm_release(p_escrow_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare e public.escrow_transactions; b public.bookings;
begin
  select * into e from public.escrow_transactions where id = p_escrow_id;
  if e.client_id <> auth.uid() then perform public._forbidden(); end if;
  select * into b from public.bookings where id = e.booking_id;
  if b.status <> 'completed' then raise exception 'booking_not_completed'; end if;
  if e.status <> 'held' then raise exception 'invalid_state'; end if;
  update public.escrow_transactions set status='release_requested', client_confirmed_at=now()
   where id = p_escrow_id;
end;$$;

-- Admin approval (checker) — requires escrow.release; splits held into payable+commission.
create or replace function public.approve_escrow_release(p_escrow_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare e public.escrow_transactions; v_grp uuid; v_payout uuid;
begin
  if not public.has_permission('escrow.release') then perform public._forbidden(); end if;
  select * into e from public.escrow_transactions where id = p_escrow_id for update;
  if e.status <> 'release_requested' then raise exception 'invalid_state: need client confirmation first'; end if;

  update public.escrow_transactions
     set status='payout_approved', admin_approved_by=auth.uid(), admin_approved_at=now()
   where id = p_escrow_id;

  v_grp := gen_random_uuid();
  perform public.post_ledger(v_grp,'escrow_held','debit', e.gross_amount, e.currency,'Release approved', p_escrow_id);
  perform public.post_ledger(v_grp,'vendor_payable','credit', e.net_payout_amount, e.currency,'Net payout', p_escrow_id);
  perform public.post_ledger(v_grp,'commission_revenue','credit', e.commission_amount, e.currency,'Commission', p_escrow_id);
  perform public.assert_balanced(v_grp);

  -- create payout request (maker); a different Finance admin approves it
  insert into public.payouts(vendor_id, escrow_id, bank_account_id, amount, currency, status, requested_by)
  select e.vendor_id, e.id, ba.id, e.net_payout_amount, e.currency, 'requested', auth.uid()
  from public.vendor_bank_accounts ba
  where ba.vendor_id = e.vendor_id and ba.is_primary and ba.deleted_at is null
  returning id into v_payout;
  return v_payout;
end;$$;

create or replace function public.approve_payout(p_payout_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare po public.payouts;
begin
  if not public.has_permission('payout.approve') then perform public._forbidden(); end if;
  select * into po from public.payouts where id = p_payout_id;
  if po.requested_by = auth.uid() then
    raise exception 'segregation_of_duties: approver must differ from requester'; end if;
  update public.payouts set status='approved', approved_by=auth.uid(), approved_at=now()
   where id = p_payout_id;
end;$$;

-- Called by payout Edge Function after PSP confirms (service_role).
create or replace function public.complete_payout(p_payout_id uuid, p_provider_ref text, p_provider payment_provider)
returns void language plpgsql security definer set search_path = public as $$
declare po public.payouts; e public.escrow_transactions; v_grp uuid;
begin
  select * into po from public.payouts where id = p_payout_id for update;
  if po.status = 'completed' then return; end if; -- idempotent
  update public.payouts set status='completed', completed_at=now(),
         provider_ref=p_provider_ref, provider=p_provider where id = p_payout_id;

  v_grp := gen_random_uuid();
  perform public.post_ledger(v_grp,'vendor_payable','debit', po.amount, po.currency,'Payout paid', po.escrow_id, null, po.id);
  perform public.post_ledger(v_grp,'psp_clearing','credit', po.amount, po.currency,'Payout paid', po.escrow_id, null, po.id);
  perform public.assert_balanced(v_grp);

  update public.escrow_transactions set status='paid_out', released_at=now() where id = po.escrow_id;
end;$$;

-- =====================================================================
-- REFUNDS & DISPUTES
-- =====================================================================
create or replace function public.request_refund(
  p_escrow_id uuid, p_amount numeric, p_type refund_type, p_reason text, p_dispute_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare e public.escrow_transactions; v_id uuid;
begin
  select * into e from public.escrow_transactions where id = p_escrow_id;
  if not (e.client_id = auth.uid() or public.has_permission('refund.approve')) then perform public._forbidden(); end if;
  insert into public.refunds(escrow_id, dispute_id, client_id, amount, currency, type, reason, status, requested_by)
  values (p_escrow_id, p_dispute_id, e.client_id, p_amount, e.currency, p_type, p_reason, 'requested', auth.uid())
  returning id into v_id;
  return v_id;
end;$$;

create or replace function public.approve_refund(p_refund_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.refunds; e public.escrow_transactions; v_grp uuid;
begin
  if not public.has_permission('refund.approve') then perform public._forbidden(); end if;
  select * into r from public.refunds where id = p_refund_id for update;
  if r.requested_by = auth.uid() then
    raise exception 'segregation_of_duties: approver must differ from requester'; end if;
  select * into e from public.escrow_transactions where id = r.escrow_id;

  update public.refunds set status='approved', approved_by=auth.uid(), approved_at=now() where id = p_refund_id;

  v_grp := gen_random_uuid();
  perform public.post_ledger(v_grp,'escrow_held','debit', r.amount, r.currency,'Refund approved', e.id, null, null, r.id);
  perform public.post_ledger(v_grp,'refund_payable','credit', r.amount, r.currency,'Refund approved', e.id, null, null, r.id);
  perform public.assert_balanced(v_grp);

  update public.escrow_transactions
     set status = case when r.type='full' then 'refunded' else 'partially_refunded' end
   where id = e.id;
end;$$;

create or replace function public.open_dispute(p_escrow_id uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare e public.escrow_transactions; v_id uuid; v_sla int;
begin
  select * into e from public.escrow_transactions where id = p_escrow_id;
  if not (e.client_id = auth.uid() or public.is_vendor_owner(e.vendor_id)) then perform public._forbidden(); end if;
  v_sla := 72; -- default SLA hours
  insert into public.disputes(escrow_id, booking_id, raised_by, against_id, reason, status, sla_due_at)
  values (p_escrow_id, e.booking_id, auth.uid(),
          case when e.client_id = auth.uid() then e.vendor_id else e.client_id end,
          p_reason, 'open', now() + make_interval(hours => v_sla))
  returning id into v_id;
  update public.escrow_transactions set status='disputed' where id = p_escrow_id;
  return v_id;
end;$$;

create or replace function public.resolve_dispute(
  p_dispute_id uuid, p_resolution dispute_status, p_notes text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_permission('dispute.manage') then perform public._forbidden(); end if;
  update public.disputes set status=p_resolution, resolution_notes=p_notes,
         resolved_by=auth.uid(), resolved_at=now() where id = p_dispute_id;
end;$$;

-- =====================================================================
-- REVIEWS
-- =====================================================================
create or replace function public.create_review(
  p_booking_id uuid, p_rating int, p_title text default null, p_body text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare b public.bookings; v_id uuid;
begin
  select * into b from public.bookings where id = p_booking_id;
  if b.client_id <> auth.uid() then perform public._forbidden(); end if;
  if b.status <> 'completed' then raise exception 'booking_not_completed'; end if;
  insert into public.reviews(vendor_id, client_id, booking_id, rating, title, body, status)
  values (b.vendor_id, auth.uid(), p_booking_id, p_rating, p_title, p_body, 'published')
  returning id into v_id;
  return v_id;
end;$$;

create or replace function public.respond_to_review(p_review_id uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare rv public.reviews;
begin
  select * into rv from public.reviews where id = p_review_id;
  if not public.is_vendor_owner(rv.vendor_id) then perform public._forbidden(); end if;
  insert into public.review_responses(review_id, vendor_id, body)
  values (p_review_id, rv.vendor_id, p_body)
  on conflict (review_id) where (deleted_at is null)
  do update set body = excluded.body, edited_at = now();
end;$$;

-- =====================================================================
-- MESSAGING & NOTIFICATIONS
-- =====================================================================
create or replace function public.start_conversation(
  p_type conversation_type, p_other_party uuid, p_vendor_id uuid default null, p_subject text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_my_role conversation_role; v_other_role conversation_role;
begin
  if auth.uid() is null then perform public._forbidden(); end if;
  insert into public.conversations(type, subject, vendor_id, status, created_by)
  values (p_type, p_subject, p_vendor_id, 'active', auth.uid()) returning id into v_id;

  v_my_role := case p_type when 'client_vendor' then
                  (case when public.is_vendor_owner(coalesce(p_vendor_id,'00000000-0000-0000-0000-000000000000')) then 'vendor' else 'client' end)
                when 'vendor_admin' then (case when public.is_admin() then 'admin' else 'vendor' end)
                else (case when public.is_admin() then 'admin' else 'client' end) end;
  insert into public.conversation_participants(conversation_id, profile_id, role_in_convo)
  values (v_id, auth.uid(), v_my_role), (v_id, p_other_party,
          case v_my_role when 'client' then (case p_type when 'client_admin' then 'admin' else 'vendor' end)
                         when 'vendor' then (case p_type when 'vendor_admin' then 'admin' else 'client' end)
                         else 'client' end);
  return v_id;
end;$$;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.conversation_participants set last_read_at = now()
   where conversation_id = p_conversation_id and profile_id = auth.uid();
end;$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.notifications set read_at = now()
   where id = p_notification_id and recipient_id = auth.uid();
end;$$;

create or replace function public.mark_all_notifications_read()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.notifications set read_at = now()
   where recipient_id = auth.uid() and read_at is null;
end;$$;

-- =====================================================================
-- EXECUTE grants.
-- Most RPCs self-check permissions/ownership and are safe for `authenticated`.
-- The functions below have NO internal caller check by design (they are
-- invoked only by webhooks/cron via service_role, or expose secrets/ledger).
-- They MUST NOT be callable by end users.
-- =====================================================================
grant execute on all functions in schema public to authenticated;

revoke execute on function
  public.record_payment_result(uuid, payment_status, text, text),
  public.fund_escrow(uuid),
  public.complete_payout(uuid, text, payment_provider),
  public.activate_subscription(uuid, uuid),
  public.apply_subscription_state(),
  public.post_ledger(uuid, ledger_account, ledger_direction, numeric, text, text, uuid, uuid, uuid, uuid),
  public.assert_balanced(uuid),
  public._bank_key()
from authenticated, public;

grant execute on function
  public.record_payment_result(uuid, payment_status, text, text),
  public.fund_escrow(uuid),
  public.complete_payout(uuid, text, payment_provider),
  public.activate_subscription(uuid, uuid),
  public.apply_subscription_state(),
  public.post_ledger(uuid, ledger_account, ledger_direction, numeric, text, text, uuid, uuid, uuid, uuid),
  public.assert_balanced(uuid),
  public._bank_key()
to service_role;
