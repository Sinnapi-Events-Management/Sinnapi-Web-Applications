-- =====================================================================
-- A 100% advance must still be releasable.
--
-- The quotation builder offers 75% and 100% advance presets (and the field
-- has always accepted up to `advance_rate_default`, which can be 100). With a
-- 100% advance that has already been released, the vendor is owed nothing at
-- release time, and 0818d's approve_escrow_release:
--   * posted a `vendor_payable` credit of 0 — rejected by
--     `ledger_entries.amount > 0`, so the admin could never approve, and the
--     commission and processing fee stayed in `escrow_held` for good;
--   * would then have inserted a 0 balance payout, leaving the escrow at
--     `payout_approved` waiting for a payout nobody needs to send.
--
-- This replaces only the core (0904c renamed it and wraps it with the money
-- context; the wrapper and the grants are untouched). Changes vs 0818d:
--   * ledger legs of 0 are skipped (escrow_held too, for the no-commission,
--     no-fee case);
--   * when nothing is owed to the vendor, no payout is created and the escrow
--     goes straight to `paid_out` — the same terminal state the balance
--     payout's settlement would have set. Returns null in that case.
-- Every case where the vendor is still owed something behaves exactly as before.
-- =====================================================================

create or replace function public.approve_escrow_release_core(p_escrow_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  e         public.escrow_transactions;
  v_grp     uuid;
  v_payout  uuid;
  v_bank    uuid;
  v_label   text;
  v_blocked text;
  v_held    numeric;
  v_vendor  numeric;
begin
  if not public.has_permission('escrow.release') then perform public._forbidden(); end if;

  select * into e from public.escrow_transactions where id = p_escrow_id for update;
  if e.id is null then raise exception 'not_found'; end if;
  if e.status <> 'release_requested' then
    raise exception 'invalid_state: need client confirmation or auto-release first (%)', e.status;
  end if;

  if exists (
    select 1 from public.settlement_requests s
    where s.escrow_id = p_escrow_id
      and s.status in ('vendor_requested', 'admin_forwarded', 'awaiting_vendor_consent', 'consented')
      and (s.approved_amount is null or s.approved_amount < s.requested_amount)
  ) then
    raise exception 'settlement_pending';
  end if;

  -- What the vendor is still owed: the balance, plus the advance if it never left.
  v_vendor := e.balance_amount
              + case when e.advance_released_at is null then e.advance_amount else 0 end;
  v_held   := v_vendor + e.commission_amount + e.psp_fee_amount;

  if v_vendor > 0 then
    select ba.id, ba.bank_name || ' ••••' || coalesce(ba.account_number_last4, '')
      into v_bank, v_label
    from public.vendor_bank_accounts ba
    where ba.vendor_id = e.vendor_id and ba.is_primary and ba.deleted_at is null
    limit 1;
    if v_bank is null then v_blocked := 'vendor_has_no_primary_bank_account'; end if;

    update public.escrow_transactions
       set status = 'payout_approved',
           admin_approved_by = auth.uid(),
           admin_approved_at = now(),
           balance_released_at = now()
     where id = p_escrow_id;
  else
    -- Fully paid up front: nothing to send, so this approval closes the escrow.
    update public.escrow_transactions
       set status = 'paid_out',
           admin_approved_by = auth.uid(),
           admin_approved_at = now(),
           balance_released_at = now(),
           released_at = now()
     where id = p_escrow_id;
  end if;

  v_grp := gen_random_uuid();
  if v_held > 0 then
    perform public.post_ledger(v_grp, 'escrow_held', 'debit', v_held, e.currency,
                               'Escrow released', p_escrow_id);
  end if;
  if v_vendor > 0 then
    perform public.post_ledger(v_grp, 'vendor_payable', 'credit', v_vendor,
                               e.currency, 'Vendor balance', p_escrow_id);
  end if;
  if e.commission_amount > 0 then
    perform public.post_ledger(v_grp, 'commission_revenue', 'credit', e.commission_amount,
                               e.currency, 'Platform commission', p_escrow_id);
  end if;
  if e.psp_fee_amount > 0 then
    perform public.post_ledger(v_grp, 'psp_fee_expense', 'credit', e.psp_fee_amount,
                               e.currency, 'Processing fee recovered', p_escrow_id);
  end if;
  perform public.assert_balanced(v_grp);

  if v_vendor > 0 then
    insert into public.payouts (vendor_id, escrow_id, bank_account_id, amount, currency,
        kind, status, requested_by, destination_label, blocked_reason, due_at)
    values (e.vendor_id, e.id, v_bank, v_vendor,
        e.currency, 'balance', 'requested', auth.uid(), v_label, v_blocked, now())
    returning id into v_payout;
  end if;

  perform public.escrow_notify(
    p_escrow_id, 'payout_approved', 'escrow.release_approved',
    true, true, true, e.balance_amount,
    case when v_payout is null then '{}'::jsonb
         else jsonb_build_object('payout_id', v_payout) end);

  return v_payout;
end;$$;

revoke all on function public.approve_escrow_release_core(uuid) from public, anon, authenticated, service_role;
