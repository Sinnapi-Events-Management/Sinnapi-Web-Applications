-- =====================================================================
-- Sinnapi — 0816f Enum assignment casts
--
-- WHAT BROKE
--   respond_quotation raised, on every call:
--
--     42804  column "status" is of type quotation_status but expression is of
--            type text
--            HINT: You will need to rewrite or cast the expression.
--
-- WHY
-- An `UPDATE ... SET <enum column> = CASE ... END` whose every arm is a bare
-- string literal. Postgres types the arms of a CASE together: with at least one
-- arm of known type the untyped literals are resolved to it, but with *all* of
-- them untyped the expression falls back to `text` — and text has no implicit
-- assignment cast to an enum. The statement parses and then fails at the point
-- of assignment, which is why nothing caught it until a client pressed Accept.
--
-- Both sites in this file were written with a `else <column> end` arm, whose
-- column reference silently supplied the type. Both later had that arm replaced
-- with a literal — for good reasons, in each case — and neither replacement
-- carried the type the removed arm had been providing.
--
--   respond_quotation        `else status` → `else 'revised'` when the action
--   (0813b)                  was validated, so an unrecognised p_action could no
--                            longer fall through to a no-op that still reported
--                            success. The gate is right; the arm needed a type.
--
--   marketing_set_preference never had a column arm — a two-way toggle has no
--   (0816a)                  "leave it alone" case. Same failure, reached from
--                            the preference centre rather than from a quote.
--
-- WHY THIS IS A NEW FILE AND THE ORIGINALS ARE LEFT ALONE
-- 0813b and 0816a are applied migrations, and an applied migration is history:
-- it records what the database was actually told, and it is not edited. Editing
-- one is also simply ineffective — the CLI records it as run and will not
-- replay it — so a fix written into 0813b would repair a database built from
-- scratch tomorrow and leave every existing environment, including production,
-- exactly as broken as it is now. The correction has to arrive as its own
-- forward step, which is this file.
--
-- The consequence is deliberate and worth stating plainly: 0813b and 0816a
-- still contain the broken statements, and a `supabase db reset` still replays
-- them. It then replays this file, which `create or replace`s both functions,
-- and a from-scratch database ends up byte-identical to a migrated one. The
-- ordering is the guarantee, not the absence of the bug upstream.
--
-- WHICH DEFINITION WINS
-- `respond_quotation` is now defined in four migrations — 0618n, 0809c, 0813b
-- and here — and `void_quotation` in two. Only the last one to run exists in
-- the database; the earlier bodies are the record of how it got there. Anyone
-- greping this tree for one of these functions should read the highest
-- timestamp and stop. Anyone changing one should add a new file rather than
-- reopening any of them, including this one.
--
-- ALSO IN HERE
-- `for update` on the two quotation reads. Both functions read a status, decide
-- from it whether a write is allowed, and then write — and on `accept` that
-- write copies advance terms onto a booking that escrow later reads. Unlocked,
-- two answers arriving together both see `sent`, both pass the gate and both
-- act. This is not the reported bug; it is the same rows and the same window,
-- and it is cheaper to close it here than to leave a lock behind the fix.
-- =====================================================================

-- ---------------------------------------------------------------------
-- respond_quotation — the client answers an offer.
-- Body as 0813b, with the status arms typed and the row locked.
-- ---------------------------------------------------------------------
create or replace function public.respond_quotation(
  p_quotation_id uuid,
  p_action       text,
  p_reason       text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  q        public.quotations;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if p_action not in ('accept', 'decline', 'revise') then
    raise exception 'invalid_action';
  end if;
  if length(coalesce(v_reason, '')) > 500 then raise exception 'reason_too_long'; end if;

  select * into q from public.quotations
   where id = p_quotation_id and deleted_at is null
   for update;
  if q.id is null then raise exception 'not_found'; end if;
  if q.client_id <> auth.uid() then perform public._forbidden(); end if;

  -- A client answers an offer. `requested` and `draft` are not offers yet —
  -- there is no price to accept — and everything else is already settled.
  if q.status not in ('sent', 'revised') then
    raise exception 'quotation_not_answerable';
  end if;

  -- Only accepting is blocked by the clock. Declining or asking for a revision
  -- on a lapsed quote is how a client tells the vendor where they stand, and
  -- refusing that would strand the thread.
  if p_action = 'accept' and q.valid_until is not null and q.valid_until < now() then
    raise exception 'quotation_expired';
  end if;

  perform set_config('sinnapi.status_reason', coalesce(v_reason, ''), true);
  -- The ::quotation_status annotations are load-bearing. See the header.
  update public.quotations
     set status = case p_action
                    when 'accept'  then 'accepted'::quotation_status
                    when 'decline' then 'declined'::quotation_status
                    else                'revised' ::quotation_status
                  end,
         responded_at = now()
   where id = p_quotation_id;
  perform set_config('sinnapi.status_reason', '', true);

  if p_action = 'accept' then
    update public.bookings b
       set advance_rate                = q.advance_rate,
           advance_release_days_before = q.advance_release_days_before,
           advance_terms_note          = q.advance_terms_note
     where b.quotation_id = p_quotation_id
       and b.client_id = auth.uid()
       -- Never re-write terms the client has already consented to.
       and b.advance_terms_accepted_at is null;
  end if;
end;$$;

-- ---------------------------------------------------------------------
-- void_quotation — either party withdraws an unanswered quotation.
-- Body as 0813b, with the row locked so the idempotency check and the state
-- gate read a status no one else is mid-way through changing.
-- ---------------------------------------------------------------------
create or replace function public.void_quotation(
  p_quotation_id uuid,
  p_reason       text)
returns void language plpgsql security definer set search_path = public as $$
declare
  q          public.quotations;
  v_is_client boolean;
  v_is_vendor boolean;
  v_owner     uuid;
  v_reason    text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into q from public.quotations
   where id = p_quotation_id and deleted_at is null
   for update;
  if q.id is null then raise exception 'not_found'; end if;

  v_is_client := q.client_id = auth.uid();
  v_is_vendor := public.is_vendor_owner(q.vendor_id);
  if not (v_is_client or v_is_vendor) then perform public._forbidden(); end if;

  -- Already withdrawn. Nothing to do, and nothing to complain about.
  if q.status = 'voided' then return; end if;

  -- The state gate, per side. Checked before the reason so that someone acting
  -- on a quote that has already been settled is told *that*, rather than being
  -- asked to justify a move they were never going to be allowed to make.
  if v_is_client and q.status in ('requested', 'sent', 'revised') then
    null;
  elsif v_is_vendor and q.status in ('draft', 'sent', 'revised') then
    null;
  else
    raise exception 'quotation_not_voidable';
  end if;

  if v_reason is null then raise exception 'reason_required'; end if;
  if length(v_reason) > 500 then raise exception 'reason_too_long'; end if;

  perform set_config('sinnapi.status_reason', v_reason, true);
  update public.quotations
     set status     = 'voided',
         updated_at = now(),
         updated_by = auth.uid()
   where id = p_quotation_id;
  perform set_config('sinnapi.status_reason', '', true);

  -- `responded_at` is deliberately left alone. It means "the client answered
  -- the offer", and a withdrawal by either side is not an answer to it — the
  -- history row is the record of what happened and when.

  -- Tell the side that did not do it. The one who acted already knows, and a
  -- notification about your own click is noise in an inbox that is also
  -- carrying booking and escrow events.
  select owner_id into v_owner from public.vendors where id = q.vendor_id;

  insert into public.notifications(recipient_id, trigger_key, title, body, data)
  select
    case when v_is_client then v_owner else q.client_id end,
    'quotation.voided',
    coalesce('Quotation ' || q.reference_no || ' was withdrawn', 'A quotation was withdrawn'),
    case when v_is_client
         then 'The client has withdrawn this quote request. Reason: ' || v_reason
         else 'The vendor has withdrawn this quote. Reason: ' || v_reason
    end,
    jsonb_build_object(
      'quotation_id',  q.id,
      'reference_no',  q.reference_no,
      'vendor_id',     q.vendor_id,
      'client_id',     q.client_id,
      'voided_by',     case when v_is_client then 'client' else 'vendor' end,
      'reason',        v_reason)
  -- A vendor row with no owner cannot be notified; the void still stands.
  where (case when v_is_client then v_owner else q.client_id end) is not null;
end;$$;

-- ---------------------------------------------------------------------
-- marketing_set_preference — one topic on or off from the preference centre.
-- Body as 0816a, with the status arms typed. Same 42804, different table:
-- every save from the preference centre was failing.
-- ---------------------------------------------------------------------
create or replace function public.marketing_set_preference(
  p_token      text,
  p_topic      marketing_topic,
  p_subscribed boolean,
  p_ip         text default null,
  p_user_agent text default null
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_email     citext;
  v_ip        inet;
  v_remaining integer;
begin
  select ms.email into v_email
  from public.marketing_subscriptions ms
  where ms.unsubscribe_token = p_token;

  if v_email is null then
    return false;
  end if;

  begin
    v_ip := nullif(btrim(p_ip), '')::inet;
  exception when others then
    v_ip := null;
  end;

  update public.marketing_subscriptions
     -- Both arms annotated. `source` below is a single literal, which coerces
     -- from the column's own type and needs no help.
     set status             = case when p_subscribed then 'subscribed'::marketing_consent_status
                                                     else 'unsubscribed'::marketing_consent_status end,
         source             = 'preference_centre',
         consent_ip         = v_ip,
         consent_user_agent = nullif(btrim(p_user_agent), ''),
         consent_at         = case when p_subscribed then now() else consent_at end,
         confirmed_at       = case when p_subscribed then coalesce(confirmed_at, now()) else confirmed_at end,
         confirm_token      = null,
         unsubscribed_at    = case when p_subscribed then null else now() end
   where email = v_email and topic = p_topic;

  if not found then
    return false;
  end if;

  if p_subscribed then
    delete from public.email_suppressions
     where email = v_email and reason = 'unsubscribed';
  else
    select count(*) into v_remaining
    from public.marketing_subscriptions
    where email = v_email and status = 'subscribed';

    if v_remaining = 0 then
      insert into public.email_suppressions(email, reason, detail)
      values (v_email, 'unsubscribed', 'All topics disabled in the preference centre')
      on conflict (email) do nothing;
    end if;
  end if;

  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- Grants. `create or replace` keeps the privileges each function already
-- carries; these are restated so this file reads as the whole story rather
-- than as a diff against two others.
-- ---------------------------------------------------------------------
grant execute on function public.respond_quotation(uuid, text, text) to authenticated;
grant execute on function public.void_quotation(uuid, text)          to authenticated;
revoke all on function public.marketing_set_preference(text, marketing_topic, boolean, text, text) from public;
