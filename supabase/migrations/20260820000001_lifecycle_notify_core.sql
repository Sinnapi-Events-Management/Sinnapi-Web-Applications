-- =====================================================================
-- Sinnapi — 0820a Lifecycle notifications: the shared emitter
--
-- WHAT WAS WRONG
-- The quotation and booking flows were the two loudest things in the product
-- and the two quietest in anyone's inbox. Between them they had three ways of
-- telling someone something happened, and none of them covered the flow:
--
--   1. The blanket `trg_outbox` trigger on `bookings` and `quotations`, which
--      fired on EVERY row write — including writes that changed nothing a
--      person cares about — and whose dispatch produced a row titled
--      "Booking status" with no body, addressed only to `payload.client_id`.
--      So a vendor was never told anything at all, and a client was told
--      everything in the same six words.
--
--   2. Direct `insert into public.notifications` from a handful of the payment-
--      terms RPCs. Good copy, right recipient, but in-app only: those rows
--      never reach `notification-dispatch`, so no email was ever sent for a
--      booking being confirmed, declined or countered.
--
--   3. Nothing. `send_quotation`, `respond_quotation`, `start_booking`,
--      `complete_booking`, `cancel_booking`, `admin_set_booking_status` and the
--      quote-expiry cron emitted no addressed notification of any kind.
--
-- WHAT THIS FILE PROVIDES
-- One emitter, used by the status triggers in 0820b and 0820c, plus the piece
-- that has been missing from every direct-insert site: an AFTER INSERT trigger
-- on `notifications` that enqueues the matching email.
--
-- WHY THE IN-APP ROW IS WRITTEN HERE AND THE EMAIL IS NOT
-- They have opposite latency requirements. The in-app row drives a realtime
-- subscription, a bell badge and a desktop alert, so it has to exist the
-- instant the transaction commits — routing it through the outbox would put the
-- cron's one-minute tick between a vendor's click and the client's screen. The
-- email has no such constraint and every reason not to run inline: it is an
-- outbound HTTP call, it fails in ways a booking transaction must not care
-- about, and it needs retries and a dead-letter path. So the row lands inline
-- and the email is enqueued, which is what the outbox is for.
--
-- WHY EMAIL IS A TRIGGER ON `notifications` RATHER THAN A CALL IN THE EMITTER
-- Because the direct-insert sites in 0817a are not going through the emitter
-- and should not have to be rewritten to earn an email. Hanging the email off
-- the notification row means every in-app notification in the system — this
-- file's, theirs, and any written later — is considered for email by exactly
-- one rule: does a template exist for its trigger and audience. Support turning
-- an email on for a trigger is an INSERT into `notification_templates`, not a
-- deploy.
--
-- WHICH STAGES GET EMAIL IS THEREFORE DATA, NOT CODE
-- A trigger with no `email` template is deliberately in-app only. See 0820d for
-- the seeded set: action-required and terminal outcomes get mail, progress
-- steps do not.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Retire the blanket fan-out for the two aggregates this work covers, exactly
-- as 20260809000004 did for `escrow_transactions` and `payments` once those
-- emitted typed events of their own.
--
-- Left in place for every other table: `vendor_applications`, `subscriptions`,
-- `reviews`, `event_interests` and `messages` still have no typed emission and
-- a generic notification beats none.
-- ---------------------------------------------------------------------
drop trigger if exists trg_outbox on public.bookings;
drop trigger if exists trg_outbox on public.quotations;

-- ---------------------------------------------------------------------
-- FORMATTING — the SQL half of the dispatcher's `enrich()`.
--
-- Duplicated rather than shared because the two run in different places on
-- different data: the dispatcher enriches an outbox payload in Deno before
-- sending mail, and this enriches the same payload in Postgres before writing
-- the in-app row. They must agree, so the rules are stated once each and the
-- key lists are kept in step by name.
-- ---------------------------------------------------------------------

-- Money as money. Mirrors `Intl.NumberFormat('en-UG', {max: 2})`: grouped
-- thousands, and a decimal part only when there is one — `226,600`, not
-- `226,600.00`, and `1,500.75` when the cents are real.
--
-- `,` and `.` are used rather than `G` and `D` because the latter follow
-- `lc_numeric`, and a database that happens to be running under a European
-- locale would render an advance of 226,600 as `226.600` — off by a factor of
-- a thousand in the direction nobody notices until it is quoted back.
create or replace function public.notify_money(p_value numeric)
returns text language sql immutable set search_path = public as $$
  select case
    when p_value is null then null
    when p_value = round(p_value) then to_char(p_value, 'FM999,999,999,999,990')
    else trim(trailing '0' from to_char(p_value, 'FM999,999,999,999,990.00'))
  end;
$$;

-- A date as a person writes it — `5 September 2026`. Matches the dispatcher's
-- `toLocaleDateString('en-GB', {day:'numeric', month:'long', year:'numeric'})`.
create or replace function public.notify_date(p_value date)
returns text language sql immutable set search_path = public as $$
  select case when p_value is null then null
              else to_char(p_value, 'FMDD Month YYYY') end;
$$;

-- An instant, rendered in the timezone the deadline is actually about.
-- Recipients are in Uganda; a `valid_until` printed in the server's UTC is
-- three hours wrong in the direction that costs someone their window.
create or replace function public.notify_datetime(p_value timestamptz)
returns text language sql stable set search_path = public as $$
  select case when p_value is null then null
              else to_char(p_value at time zone 'Africa/Kampala', 'FMDD Month YYYY') end;
$$;

-- Replace every `{{key}}` spelling of one key. Split out because the pattern
-- has to be built from a runtime value, and `regexp_replace` is the only form
-- that tolerates the optional inner whitespace `{{ key }}` a Support user will
-- eventually type.
--
-- `p_key` is interpolated into the pattern, which would be an injection if it
-- came from anywhere but `notify_render`'s own `[a-zA-Z0-9_]+` match — a class
-- with no regex metacharacters in it.
create or replace function public.notify_replace_placeholder(
  p_text  text,
  p_key   text,
  p_value text)
returns text language sql immutable set search_path = public as $$
  select regexp_replace(
           p_text,
           '\{\{\s*' || p_key || '\s*\}\}',
           -- The substituted value is data, so a `\1` inside it must not be
           -- read back as a capture-group reference.
           replace(p_value, '\', '\\'),
           'g');
$$;

/**
 * Substitute `{{placeholders}}` from a payload.
 *
 * An unresolved placeholder collapses to an empty string rather than leaking
 * the token: templates are Support-editable, so a missing key is a matter of
 * time, and a half-rendered `{{vendor_name}}` on someone's screen reads as
 * broken software. Identical rule to the dispatcher's `render()`, including the
 * whitespace collapse that keeps a dropped placeholder from leaving a double
 * space mid-sentence.
 */
create or replace function public.notify_render(p_template text, p_payload jsonb)
returns text language plpgsql immutable set search_path = public as $$
declare
  v_out text := p_template;
  m     text[];
begin
  if p_template is null then return null; end if;

  for m in
    select regexp_matches(p_template, '\{\{\s*([a-zA-Z0-9_]+)\s*\}\}', 'g')
  loop
    v_out := public.notify_replace_placeholder(v_out, m[1], coalesce(p_payload ->> m[1], ''));
  end loop;

  return btrim(regexp_replace(v_out, '[ \t]{2,}', ' ', 'g'));
end;$$;

/**
 * Resolve the names and formats a template references.
 *
 * The emitters pass ids and raw numerics because they run inside the
 * transaction that moved the thing and should stay cheap. Turning those into
 * `Nakato Events` and `226,600` is this function's job, and it happens once per
 * notification rather than once per placeholder.
 *
 * The key lists mirror `enrich()` in `notification-dispatch/index.ts`. A key
 * added to one belongs in the other, or the same trigger will read differently
 * on screen and in the inbox.
 */
create or replace function public.notify_enrich(p_payload jsonb)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  v_out  jsonb := coalesce(p_payload, '{}'::jsonb);
  v_name text;
  k      text;
begin
  if (v_out ? 'vendor_id') and not (v_out ? 'vendor_name') then
    select business_name into v_name from public.vendors where id = (v_out ->> 'vendor_id')::uuid;
    v_out := v_out || jsonb_build_object('vendor_name', coalesce(v_name, 'your vendor'));
  end if;

  if (v_out ? 'client_id') and not (v_out ? 'client_name') then
    select full_name into v_name from public.profiles where id = (v_out ->> 'client_id')::uuid;
    v_out := v_out || jsonb_build_object('client_name', coalesce(v_name, 'the client'));
  end if;

  -- Money reads as money. A template printing `total` raw would put
  -- `226600.00` in front of a person.
  foreach k in array array[
    'total', 'subtotal', 'amount', 'agreed_amount', 'gross_amount',
    'advance_amount', 'balance_amount', 'commission_amount', 'psp_fee_amount'
  ] loop
    if (v_out ? k) and (v_out ->> k) is not null then
      v_out := v_out || jsonb_build_object(k, public.notify_money((v_out ->> k)::numeric));
    end if;
  end loop;

  foreach k in array array['event_date', 'advance_release_due_at'] loop
    if (v_out ? k) and (v_out ->> k) is not null then
      v_out := v_out || jsonb_build_object(k, public.notify_date((v_out ->> k)::date));
    end if;
  end loop;

  foreach k in array array['valid_until', 'responded_at', 'sent_at'] loop
    if (v_out ? k) and (v_out ->> k) is not null then
      v_out := v_out || jsonb_build_object(k, public.notify_datetime((v_out ->> k)::timestamptz));
    end if;
  end loop;

  return v_out;
end;$$;

-- ---------------------------------------------------------------------
-- THE EMITTER
-- ---------------------------------------------------------------------

/**
 * One addressed in-app notification, rendered from `notification_templates`.
 *
 * Copy is data so Support can reword without a deploy, and is resolved per
 * trigger *and* audience: the same acceptance is congratulation to a vendor and
 * a receipt to a client, and one sentence cannot be both. A trigger with no
 * in-app template still writes a row — humanised from the key rather than
 * silent — because a notification nobody worded is a content bug, not a reason
 * to lose the event.
 *
 * `p_payload` is stored on the row verbatim, unformatted. That is deliberate:
 * `data` is the machine-readable half that the portals' `resolveTarget` reads
 * ids out of and that the email trigger forwards to the dispatcher, which does
 * its own enrichment. Storing the *rendered* values there would hand the
 * dispatcher `226,600` to parse as a number, and `Number('226,600')` is NaN.
 */
create or replace function public.notify_party(
  p_trigger        text,
  p_recipient      uuid,
  p_audience       text,
  p_aggregate_type text,
  p_aggregate_id   uuid,
  p_payload        jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_locale   text;
  -- Two scalars rather than one `record`: `select ... into` against a set-
  -- returning function that yields no rows leaves a record target in a state
  -- plpgsql will not let you read a field from, and a trigger with no template
  -- seeded yet is the ordinary case here, not the exceptional one.
  v_subject  text;
  v_template text;
  v_enriched jsonb;
  v_title    text;
  v_body     text;
begin
  -- No recipient is a real state, not an error: a vendor row with no owner, a
  -- profile deleted between the act and the emit. The act still stands.
  if p_recipient is null then return; end if;

  select coalesce(locale, 'en') into v_locale from public.profiles where id = p_recipient;
  if not found then return; end if;

  v_enriched := public.notify_enrich(p_payload);

  select subject, body_template into v_subject, v_template
    from public.resolve_notification_template(
           p_trigger, p_audience, 'in_app'::notification_channel, coalesce(v_locale, 'en'));

  v_title := public.notify_render(v_subject, v_enriched);
  v_body  := public.notify_render(v_template, v_enriched);

  -- `initcap` is wrong here — it would render `quotation.revision_requested` as
  -- `Quotation Revision Requested`, title case nothing else in the product uses.
  if coalesce(btrim(v_title), '') = '' then
    v_title := upper(left(replace(replace(p_trigger, '.', ' '), '_', ' '), 1))
            || substr(replace(replace(p_trigger, '.', ' '), '_', ' '), 2);
  end if;

  insert into public.notifications(recipient_id, trigger_key, channel, title, body, data)
  values (p_recipient, p_trigger, 'in_app', v_title, nullif(btrim(coalesce(v_body, '')), ''),
          coalesce(p_payload, '{}'::jsonb)
            || jsonb_build_object('audience', p_audience,
                                  'aggregate_type', p_aggregate_type,
                                  'aggregate_id', p_aggregate_id));
end;$$;

comment on function public.notify_party(text, uuid, text, text, uuid, jsonb) is
  'Writes one addressed in-app notification with copy resolved from notification_templates for '
  'the trigger + audience. The matching email, if a template exists for it, is enqueued by '
  'trg_notification_email.';

/**
 * The same, fanned out to every operator holding a permission.
 *
 * Admin notifications are scoped to exceptions — voids, declines, cancellations
 * and console overrides — because the admin feed already carries escrow and
 * settlement work items, and a marketplace-wide stream of routine sends and
 * accepts would bury them. See 0820b/0820c for which transitions call this.
 */
create or replace function public.notify_admins(
  p_trigger        text,
  p_permission     text,
  p_aggregate_type text,
  p_aggregate_id   uuid,
  p_payload        jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select distinct ur.profile_id
      from public.user_roles ur
      join public.role_permissions rp on rp.role_id = ur.role_id
      join public.permissions p on p.id = rp.permission_id
     where p.key = p_permission
       -- The operator who pressed the button does not need telling. Everyone
       -- else on the desk does.
       and ur.profile_id is distinct from auth.uid()
  loop
    perform public.notify_party(
      p_trigger, r.profile_id, 'admin', p_aggregate_type, p_aggregate_id, p_payload);
  end loop;
end;$$;

-- ---------------------------------------------------------------------
-- EMAIL — enqueued from the notification row, for every producer at once.
-- ---------------------------------------------------------------------

/**
 * Which side of a transaction a recipient is on.
 *
 * `notify_party` stamps `audience` into `data` and this returns it unread. The
 * inference below is for the 0817a direct-insert sites, which predate the
 * convention and write `{booking_id, vendor_id, client_id, …}` with no audience
 * at all — they are the reason this function exists rather than a `->>` in the
 * trigger.
 *
 * Falls back to `admin` rather than to null: an unrecognised recipient on a
 * booking notification is an operator, and the alternative — returning null —
 * would resolve no template and silently drop the mail.
 */
create or replace function public.notify_audience_of(p_recipient uuid, p_data jsonb)
returns text language plpgsql stable set search_path = public as $$
declare
  v_client uuid;
  v_vendor uuid;
begin
  if p_data ? 'audience' then return p_data ->> 'audience'; end if;

  v_client := nullif(p_data ->> 'client_id', '')::uuid;
  v_vendor := nullif(p_data ->> 'vendor_id', '')::uuid;

  -- The ids are not always on the payload — `booking.terms_accepted` carries
  -- only `booking_id` and `payment_type` — so the aggregate is read when they
  -- are missing rather than giving up.
  if v_client is null and v_vendor is null then
    if p_data ? 'booking_id' then
      select client_id, vendor_id into v_client, v_vendor
        from public.bookings where id = nullif(p_data ->> 'booking_id', '')::uuid;
    elsif p_data ? 'quotation_id' then
      select client_id, vendor_id into v_client, v_vendor
        from public.quotations where id = nullif(p_data ->> 'quotation_id', '')::uuid;
    end if;
  end if;

  if v_client is not null and v_client = p_recipient then return 'client'; end if;

  if v_vendor is not null
     and exists (select 1 from public.vendors
                  where id = v_vendor and owner_id = p_recipient) then
    return 'vendor';
  end if;

  return 'admin';
end;$$;

/**
 * Enqueue the email for an in-app notification, when one is wanted.
 *
 * "When one is wanted" is entirely a question of whether a template exists for
 * `(trigger_key, audience, 'email')`. That check is the feature: it makes the
 * email/no-email decision per trigger *and* per audience editable by Support,
 * so a vendor can be mailed about a decline while a client is not, without
 * either side of it being compiled into a function.
 *
 * The outbox row is marked `email_only` because the in-app row it is about
 * already exists — one row up, in the table this trigger is on. Without the
 * flag the dispatcher's addressed path would write a second one, and the user
 * would see every notification twice.
 */
create or replace function public.tg_notification_email()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_audience text;
  v_locale   text;
  v_email    text;
begin
  -- An `email` channel row is a record of mail already sent by something else;
  -- enqueuing mail for it would double-send.
  if new.channel <> 'in_app' then return new; end if;

  -- So would this. `notification-dispatch` writes the in-app row *and* sends
  -- the email itself for the escrow, settlement and payment-window triggers —
  -- one pass, both channels — and it stamps `dispatched` on the rows it owns
  -- end to end. Without this guard every one of those would get a second copy
  -- from here, because they have `email` templates seeded and this trigger's
  -- whole rule is "a template exists, so send".
  --
  -- The stamp is the dispatcher declaring ownership rather than something
  -- inferred from the row, deliberately: inferring it from the acting role
  -- would also silence the cron jobs that legitimately insert as no user.
  if coalesce(new.data ->> 'dispatched', '') = 'true' then return new; end if;

  select coalesce(locale, 'en'), email into v_locale, v_email
    from public.profiles where id = new.recipient_id;
  -- No address, nothing to send to. The in-app row stands on its own.
  if v_email is null or v_email = '' then return new; end if;

  v_audience := public.notify_audience_of(new.recipient_id, coalesce(new.data, '{}'::jsonb));

  if not exists (
    select 1 from public.resolve_notification_template(
      new.trigger_key, v_audience, 'email'::notification_channel, coalesce(v_locale, 'en'))
  ) then
    return new;   -- in-app only, deliberately
  end if;

  insert into public.outbox(aggregate_type, aggregate_id, event_type, payload, status, available_at)
  values (
    coalesce(new.data ->> 'aggregate_type', 'notifications'),
    coalesce(nullif(new.data ->> 'aggregate_id', '')::uuid, new.id),
    new.trigger_key,
    coalesce(new.data, '{}'::jsonb) || jsonb_build_object(
      'recipient_id',    new.recipient_id,
      'audience',        v_audience,
      'email_only',      true,
      'notification_id', new.id),
    'pending',
    now());

  return new;
end;$$;

drop trigger if exists trg_notification_email on public.notifications;
create trigger trg_notification_email
  after insert on public.notifications
  for each row execute function public.tg_notification_email();

comment on function public.tg_notification_email() is
  'Enqueues the outbox email for a new in-app notification when notification_templates holds an '
  'email template for its trigger + audience. Marked email_only so the dispatcher does not write '
  'a duplicate in-app row.';
