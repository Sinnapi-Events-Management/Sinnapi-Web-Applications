-- =====================================================================
-- Sinnapi — bank crypto: resolve pgcrypto through `extensions`
--
-- `set_vendor_bank_account` failed with:
--   42883  function pgp_sym_encrypt(text, text) does not exist
--
-- Not a missing extension — a missing SCHEMA on the search path. pgcrypto's
-- home differs between a Supabase project that enabled it from the Dashboard
-- (`extensions`) and one where 0001's bare `create extension` placed it
-- (`public`). Both functions below were pinned to `set search_path = public`,
-- so on a project of the first kind `pgp_sym_encrypt` is simply not visible,
-- however correctly the call is written.
--
-- The fix is the one already used by `gen_reference_token` (0807a) and the
-- newsletter RPCs (0816c): list BOTH schemas. A schema in `search_path` that
-- does not exist is ignored, so this is correct on either kind of project, and
-- the qualification stays out of the call sites.
--
-- `security definer` + an explicit `search_path` is what makes that safe: the
-- path is fixed at definition time, so a caller cannot point these functions at
-- a `pgp_sym_encrypt` of their own.
--
-- Bodies are otherwise VERBATIM from 0618n — Postgres has no way to amend a
-- function's `search_path` without recreating it.
-- =====================================================================

create or replace function public.set_vendor_bank_account(
  p_vendor_id uuid, p_bank_name text, p_account_name text,
  p_account_number text, p_branch text, p_is_primary boolean default true)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
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

-- The read side has the same defect and would fail the first time finance
-- opened an account for a payout — fixed here rather than left to be
-- rediscovered from a failed payout run.
create or replace function public.get_vendor_bank_account_secure(p_bank_account_id uuid)
returns table(bank_name text, account_name text, account_number text, branch text)
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.has_permission('payout.process') then perform public._forbidden(); end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, occurred_at)
  values (auth.uid(), 'bank_account_decrypt', 'vendor_bank_accounts', p_bank_account_id, now());
  return query
    select b.bank_name, b.account_name,
           pgp_sym_decrypt(b.account_number_encrypted, public._bank_key()), b.branch
    from public.vendor_bank_accounts b where b.id = p_bank_account_id;
end;$$;
