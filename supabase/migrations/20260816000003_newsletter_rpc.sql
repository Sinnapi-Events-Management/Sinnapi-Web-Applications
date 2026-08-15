-- =====================================================================
-- Sinnapi — 0816c Newsletter admin RPCs
--
-- Everything the composer needs that a PostgREST query cannot express safely:
-- audience resolution, recipient materialisation, and the state transitions.
--
-- WHY THESE ARE RPCs
-- The audience is a three-way join (profiles x roles x marketing_subscriptions)
-- minus a suppression anti-join, and it has to produce the SAME set twice —
-- once as the paginated table the admin ticks through, and once as the rows
-- actually inserted when they hit send. A view rendered client-side and an
-- insert written server-side WILL drift, and the failure mode of that drift is
-- mailing somebody the operator did not select. One function owning both is the
-- only version of this that stays honest.
--
-- WHO "CLIENTS" AND "VENDORS" ARE
-- Roles, matching the admin portal's own People pages: `client` + `event_planner`
-- for clients, `vendor` for vendors. Staff are in neither — an admin holding a
-- client role for testing is a person, not an audience.
--
-- CONSENT IS A FILTER, NOT A WARNING
-- Nothing in here can queue an address that is not `subscribed` for the
-- campaign's topic, or that sits in `email_suppressions`. The UI shows those
-- rows greyed with a reason so the operator understands their audience, but the
-- exclusion happens here, server-side, where no forgotten client-side check can
-- undo it. `select all` means "all eligible", never "all rows".
-- =====================================================================

-- ---------------------------------------------------------------------
-- WHY EVERY TYPE NAME BELOW IS SCHEMA-QUALIFIED
--
-- `set search_path = public` on a function governs the function. It does not
-- govern the CREATE FUNCTION statement that declares it. Argument types and
-- return types are resolved by the parser while it is still reading the
-- signature — before the SET clause exists to be applied, and therefore against
-- whatever `search_path` the *session* happens to carry.
--
-- 0816a's note about `check_function_bodies` applying the SET clause during
-- validation is correct, and it is why the bodies here are safe. The signature
-- is the gap that note leaves open: bodies are validated late, signatures are
-- parsed first. A session with an empty or non-`public` `search_path` — the
-- Dashboard SQL editor, `supabase db push`, anything that hardens `search_path`
-- the way Supabase increasingly does — fails this file on its very first
-- function with `42704: type newsletter_audience does not exist`, while the
-- type is sitting in `public` the whole time.
--
-- So: `public.newsletter_audience`, `public.marketing_topic`,
-- `public.profile_status` everywhere, including in the GRANTs at the foot of
-- the file, whose argument lists are parsed by the same rules and would
-- otherwise fail to find the function they are trying to grant.
--
-- `citext` is the one exception and is deliberately left unqualified — see the
-- note on `admin_newsletter_queue`.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- newsletter_audience_roles — the role keys behind each audience.
-- Isolated so the definition lives in exactly one place.
-- ---------------------------------------------------------------------
create or replace function public.newsletter_audience_roles(p_audience public.newsletter_audience)
returns text[]
language sql
immutable
set search_path = public
as $$
  select case p_audience
           when 'clients' then array['client', 'event_planner']
           when 'vendors' then array['vendor']
         end;
$$;

-- ---------------------------------------------------------------------
-- newsletter_audience_topic — which consent topic an audience mails under.
-- ---------------------------------------------------------------------
create or replace function public.newsletter_audience_topic(p_audience public.newsletter_audience)
returns public.marketing_topic
language sql
immutable
set search_path = public
as $$
  select case p_audience
           when 'clients' then 'client_updates'
           when 'vendors' then 'vendor_updates'
         end::public.marketing_topic;
$$;

-- ---------------------------------------------------------------------
-- admin_newsletter_audience — the pickable audience, paginated.
--
-- Returns EVERY member of the audience, eligible or not, with the reason
-- attached. Hiding the ineligible ones would leave an admin staring at a list
-- of 40 wondering where the other 900 accounts went; showing them with
-- "not subscribed" against each is the same information without the mystery,
-- and it is also the honest picture of how much of the base has opted in.
-- ---------------------------------------------------------------------
create or replace function public.admin_newsletter_audience(
  p_audience public.newsletter_audience,
  p_search   text default null,
  p_limit    integer default 25,
  p_offset   integer default 0
)
returns table (
  profile_id   uuid,
  full_name    text,
  email        text,
  status       public.profile_status,
  eligible     boolean,
  reason       text,      -- null when eligible: subscribed | suppressed | pending | none
  total_count  bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_topic  public.marketing_topic := public.newsletter_audience_topic(p_audience);
  v_roles  text[]                 := public.newsletter_audience_roles(p_audience);
  v_search text                   := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.has_permission('marketing.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  with members as (
    select distinct p.id, p.full_name, p.email, p.status, p.created_at
    from public.profiles p
    join public.user_roles ur on ur.profile_id = p.id
    join public.roles r       on r.id = ur.role_id
    where r.key = any (v_roles)
      and p.deleted_at is null
      and (
        v_search is null
        or p.full_name ilike '%' || v_search || '%'
        or p.email::text ilike '%' || v_search || '%'
      )
  ),
  scored as (
    select
      m.*,
      ms.status as consent_status,
      sup.email is not null as is_suppressed
    from members m
    left join public.marketing_subscriptions ms
      on ms.email = m.email and ms.topic = v_topic
    left join public.email_suppressions sup
      on sup.email = m.email
  )
  select
    s.id,
    s.full_name,
    s.email::text,
    s.status,
    (s.consent_status = 'subscribed' and not s.is_suppressed) as eligible,
    case
      when s.is_suppressed                    then 'suppressed'
      when s.consent_status = 'subscribed'    then null
      when s.consent_status = 'pending'       then 'pending'
      when s.consent_status = 'unsubscribed'  then 'unsubscribed'
      else 'none'
    end,
    count(*) over () as total_count
  from scored s
  order by (s.consent_status = 'subscribed' and not s.is_suppressed) desc, s.created_at desc
  limit greatest(coalesce(p_limit, 25), 1)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- ---------------------------------------------------------------------
-- admin_newsletter_audience_counts — the header numbers above the picker.
--
-- Deliberately separate from the paginated query rather than derived from it:
-- the operator needs "you can reach 412 of 1,308 vendors" before they have
-- paged through anything, and that sentence is the single most useful piece of
-- information on the screen. It is also the argument for the consent checkbox
-- existing at all, which is worth putting in front of whoever runs marketing.
-- ---------------------------------------------------------------------
create or replace function public.admin_newsletter_audience_counts(
  p_audience public.newsletter_audience,
  p_search   text default null
)
returns table (
  total      bigint,
  eligible   bigint,
  suppressed bigint,
  no_consent bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_topic  public.marketing_topic := public.newsletter_audience_topic(p_audience);
  v_roles  text[]                 := public.newsletter_audience_roles(p_audience);
  v_search text                   := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.has_permission('marketing.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  with members as (
    select distinct p.id, p.email
    from public.profiles p
    join public.user_roles ur on ur.profile_id = p.id
    join public.roles r       on r.id = ur.role_id
    where r.key = any (v_roles)
      and p.deleted_at is null
      and (
        v_search is null
        or p.full_name ilike '%' || v_search || '%'
        or p.email::text ilike '%' || v_search || '%'
      )
  ),
  scored as (
    select
      m.id,
      ms.status as consent_status,
      sup.email is not null as is_suppressed
    from members m
    left join public.marketing_subscriptions ms
      on ms.email = m.email and ms.topic = v_topic
    left join public.email_suppressions sup
      on sup.email = m.email
  )
  select
    count(*),
    count(*) filter (where consent_status = 'subscribed' and not is_suppressed),
    count(*) filter (where is_suppressed),
    count(*) filter (where not is_suppressed and consent_status is distinct from 'subscribed')
  from scored;
end;
$$;

-- ---------------------------------------------------------------------
-- admin_newsletter_queue — freeze the audience onto the campaign.
--
-- Replaces any previously queued rows, so re-queueing after an edit is safe and
-- does not accumulate. Only legal from `draft`: once a campaign is scheduled or
-- sending, its recipient list is the record of what was sent and must not move
-- underneath it.
--
-- SELECTION MODEL
-- Two mutually exclusive modes, because the intuitive one alone is a bug:
--
--   p_select_all = true   everyone eligible in the (audience + search), minus
--                         `p_excluded_ids`. This is what "select all" has to
--                         mean — the checkbox in the header selects 1,308
--                         people, not the 25 currently rendered, and a UI that
--                         only ever sends the loaded page is a UI that silently
--                         mails a fifth of the audience.
--   p_select_all = false  exactly `p_profile_ids`.
--
-- UPLOADED AND TYPED ADDRESSES
-- Each one gets a real `marketing_subscriptions` row, source `admin_import`,
-- carrying the attestation as its consent text. This is not bookkeeping for its
-- own sake: without a subscription row there is no `unsubscribe_token`, without
-- a token there is no unsubscribe link, and an email with no unsubscribe link
-- is the one thing this whole feature may not send. Creating the row is what
-- makes the address a first-class subscriber who can opt out of the next one.
--
-- WHY `citext` IS THE ONE TYPE NOT QUALIFIED HERE
-- The `::citext` casts below stay bare and this function carries
-- `search_path = public, extensions` instead, exactly as 0816a's
-- `marketing_token` does for pgcrypto. citext's home schema is not a fixed
-- fact about this codebase: 0618a's unqualified `create extension` puts it in
-- `public`, a project that got it from the Supabase Dashboard has it in
-- `extensions`. Writing `public.citext` would hard-code one of those two and
-- break outright on the other, whereas listing both schemas resolves either —
-- and a `search_path` entry naming a schema that does not exist is ignored
-- rather than an error. Unlike the enums, these casts sit in the plpgsql body,
-- which is compiled under the function's own SET clause, so the search_path
-- genuinely applies to them.
-- ---------------------------------------------------------------------
create or replace function public.admin_newsletter_queue(
  p_campaign_id  uuid,
  p_select_all   boolean default true,
  p_search       text    default null,
  p_profile_ids  uuid[]  default null,
  p_excluded_ids uuid[]  default null,
  p_extra_emails text[]  default null,
  p_attested     boolean default false
)
returns table (
  queued              integer,
  skipped_suppressed  integer,
  skipped_no_consent  integer,
  imported            integer
)
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_campaign public.newsletter_campaigns%rowtype;
  v_roles    text[];
  v_search   text := nullif(btrim(coalesce(p_search, '')), '');
  v_extra    text[];
  v_email    text;
  v_token    text;
  v_imported integer := 0;
  v_attest   text;
  v_suppress integer := 0;
  v_nocons   integer := 0;
begin
  if not public.has_permission('marketing.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_campaign from public.newsletter_campaigns where id = p_campaign_id;
  if not found then
    raise exception 'campaign_not_found' using errcode = 'P0002';
  end if;
  if v_campaign.status <> 'draft' then
    raise exception 'campaign_not_editable' using errcode = '22023';
  end if;

  v_roles := public.newsletter_audience_roles(v_campaign.audience);

  -- Normalise, lowercase, drop blanks and anything without an `@`, dedupe.
  select coalesce(array_agg(distinct e), '{}')
    into v_extra
  from unnest(coalesce(p_extra_emails, '{}')) raw
  cross join lateral (select lower(btrim(raw)) as e) n
  where n.e <> '' and position('@' in n.e) > 0;

  if array_length(v_extra, 1) > 0 and not p_attested then
    raise exception 'attestation_required' using errcode = '22023';
  end if;

  -- Why the exclusions are counted BEFORE anything is written: the numbers
  -- reported back are what the confirmation dialog shows ("412 queued, 38
  -- excluded"), and a count taken after the insert can only ever say how many
  -- rows appeared, never how many people were left out or why. Deriving one
  -- from the other by subtraction breaks the moment an address is in the
  -- audience twice under two roles.
  with scope as (
    select distinct p.id, p.email
    from public.profiles p
    join public.user_roles ur on ur.profile_id = p.id
    join public.roles r       on r.id = ur.role_id
    where r.key = any (v_roles)
      and p.deleted_at is null
      and (
        case
          when p_select_all then
            (v_search is null
               or p.full_name ilike '%' || v_search || '%'
               or p.email::text ilike '%' || v_search || '%')
            and not (p.id = any (coalesce(p_excluded_ids, '{}')))
          else
            p.id = any (coalesce(p_profile_ids, '{}'))
        end
      )
  )
  select
    count(*) filter (where sup.email is not null)::integer,
    count(*) filter (where sup.email is null
                       and coalesce(ms.status::text, 'none') <> 'subscribed')::integer
  into v_suppress, v_nocons
  from scope s
  left join public.email_suppressions sup on sup.email = s.email
  left join public.marketing_subscriptions ms
    on ms.email = s.email and ms.topic = v_campaign.topic;

  delete from public.newsletter_recipients where campaign_id = p_campaign_id;

  -- ── Audience rows ────────────────────────────────────────────────────
  insert into public.newsletter_recipients (campaign_id, profile_id, email, full_name, unsubscribe_token)
  select p_campaign_id, p.id, p.email, p.full_name, ms.unsubscribe_token
  from public.profiles p
  join public.marketing_subscriptions ms
    on ms.email = p.email and ms.topic = v_campaign.topic and ms.status = 'subscribed'
  where p.deleted_at is null
    and exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.profile_id = p.id and r.key = any (v_roles)
    )
    and not exists (select 1 from public.email_suppressions s where s.email = p.email)
    and (
      case
        when p_select_all then
          (v_search is null
             or p.full_name ilike '%' || v_search || '%'
             or p.email::text ilike '%' || v_search || '%')
          and not (p.id = any (coalesce(p_excluded_ids, '{}')))
        else
          p.id = any (coalesce(p_profile_ids, '{}'))
      end
    )
  on conflict (campaign_id, email) do nothing;

  -- ── Manually entered / uploaded rows ─────────────────────────────────
  if array_length(v_extra, 1) > 0 then
    v_attest := format(
      'Added to campaign "%s" by an administrator who attested that Sinnapi holds consent to email this address.',
      v_campaign.title
    );

    foreach v_email in array v_extra loop
      -- A suppressed address is never resurrected by an upload. This is the
      -- rule that makes the suppression list mean anything: the most common way
      -- an unsubscribe gets undone in the wild is somebody re-importing an old
      -- spreadsheet that predates it.
      if exists (select 1 from public.email_suppressions s where s.email = v_email::citext) then
        continue;
      end if;

      insert into public.marketing_subscriptions (
        email, topic, status, source, consent_text, consent_at, confirmed_at, profile_id
      )
      values (
        v_email::citext, v_campaign.topic, 'subscribed', 'admin_import', v_attest, now(), now(),
        (select id from public.profiles where email = v_email::citext and deleted_at is null limit 1)
      )
      on conflict (email, topic) do update
        set status          = 'subscribed',
            unsubscribed_at = null
      returning unsubscribe_token into v_token;

      insert into public.newsletter_recipients (campaign_id, profile_id, email, full_name, unsubscribe_token)
      select p_campaign_id,
             (select id        from public.profiles where email = v_email::citext and deleted_at is null limit 1),
             v_email::citext,
             (select full_name from public.profiles where email = v_email::citext and deleted_at is null limit 1),
             v_token
      on conflict (campaign_id, email) do nothing;

      v_imported := v_imported + 1;
    end loop;

    update public.newsletter_campaigns
       set attested_by = auth.uid(), attested_at = now()
     where id = p_campaign_id;
  end if;

  return query
  select
    (select count(*)::integer from public.newsletter_recipients where campaign_id = p_campaign_id),
    -- Suppressed uploads are counted alongside suppressed audience members:
    -- from the operator's side they are the same event — "this address is on
    -- the do-not-mail list" — and splitting them across two numbers would only
    -- invite the question of which one to trust.
    v_suppress + (select count(*)::integer from unnest(v_extra) e
                   where exists (select 1 from public.email_suppressions s where s.email = e::citext)),
    v_nocons,
    v_imported;
end;
$$;

-- ---------------------------------------------------------------------
-- admin_newsletter_schedule — draft -> scheduled.
--
-- "Send now" is this with `p_scheduled_at = now()`; there is no second path,
-- so an immediate send and a timed one go through identical code and cannot
-- diverge in what they check. Refuses an empty recipient list, which is the
-- single most common way a campaign silently "sends" to nobody.
-- ---------------------------------------------------------------------
create or replace function public.admin_newsletter_schedule(
  p_campaign_id  uuid,
  p_scheduled_at timestamptz default null
)
returns public.newsletter_campaigns
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_campaign public.newsletter_campaigns%rowtype;
  v_count    integer;
begin
  if not public.has_permission('marketing.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_campaign from public.newsletter_campaigns where id = p_campaign_id for update;
  if not found then
    raise exception 'campaign_not_found' using errcode = 'P0002';
  end if;
  if v_campaign.status <> 'draft' then
    raise exception 'campaign_not_editable' using errcode = '22023';
  end if;

  select count(*) into v_count from public.newsletter_recipients where campaign_id = p_campaign_id;
  if v_count = 0 then
    raise exception 'no_recipients' using errcode = '22023';
  end if;

  update public.newsletter_campaigns
     set status       = 'scheduled',
         scheduled_at = coalesce(p_scheduled_at, now()),
         error        = null
   where id = p_campaign_id
  returning * into v_campaign;

  return v_campaign;
end;
$$;

-- ---------------------------------------------------------------------
-- admin_newsletter_cancel — scheduled -> draft.
--
-- Only from `scheduled`. A campaign the worker has already claimed is
-- `sending`, and there is no honest way to un-send the batches already handed
-- to the provider — offering a cancel button there would be a lie about what
-- the system can do.
-- ---------------------------------------------------------------------
create or replace function public.admin_newsletter_cancel(p_campaign_id uuid)
returns public.newsletter_campaigns
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_campaign public.newsletter_campaigns%rowtype;
begin
  if not public.has_permission('marketing.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.newsletter_campaigns
     set status = 'draft', scheduled_at = null
   where id = p_campaign_id and status = 'scheduled'
  returning * into v_campaign;

  if not found then
    raise exception 'campaign_not_cancellable' using errcode = '22023';
  end if;

  return v_campaign;
end;
$$;

-- ---------------------------------------------------------------------
-- admin_newsletter_stats — the per-campaign engagement panel.
--
-- Rates are computed here rather than in the browser so every surface that
-- shows an open rate divides by the same denominator. `delivered` is the
-- denominator, not `sent`: rating a campaign against messages that bounced
-- flatters it, and the number is meant to inform a decision.
-- ---------------------------------------------------------------------
create or replace function public.admin_newsletter_stats(p_campaign_id uuid)
returns table (
  total        bigint,
  queued       bigint,
  sent         bigint,
  delivered    bigint,
  opened       bigint,
  clicked      bigint,
  bounced      bigint,
  complained   bigint,
  failed       bigint,
  unsubscribed bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_permission('marketing.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    count(*),
    count(*) filter (where r.status = 'queued'),
    count(*) filter (where r.sent_at is not null),
    count(*) filter (where r.delivered_at is not null),
    count(*) filter (where r.opened_at is not null),
    count(*) filter (where r.clicked_at is not null),
    count(*) filter (where r.bounced_at is not null),
    count(*) filter (where r.complained_at is not null),
    count(*) filter (where r.status = 'failed'),
    (select count(*) from public.newsletter_events e
      where e.campaign_id = p_campaign_id and e.event_type = 'unsubscribed')
  from public.newsletter_recipients r
  where r.campaign_id = p_campaign_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Grants
--
-- Callable by any signed-in session; each function re-checks `marketing.manage`
-- itself, because SECURITY DEFINER means the RLS policies on the tables no
-- longer apply and the permission check inside is the only gate left.
--
-- The argument lists are qualified for the same reason the signatures above
-- are: GRANT resolves the types in the list to identify which overload it is
-- granting, under the session `search_path` and with no function SET clause
-- anywhere in sight. An unqualified `newsletter_audience` here fails the file
-- at the last two statements, after all six functions have already been
-- created — leaving the RPCs present but ungranted, which surfaces to the
-- admin portal as a blanket `permission denied` rather than as a bad migration.
-- ---------------------------------------------------------------------
grant execute on function public.admin_newsletter_audience(public.newsletter_audience, text, integer, integer) to authenticated;
grant execute on function public.admin_newsletter_audience_counts(public.newsletter_audience, text) to authenticated;
grant execute on function public.admin_newsletter_queue(uuid, boolean, text, uuid[], uuid[], text[], boolean) to authenticated;
grant execute on function public.admin_newsletter_schedule(uuid, timestamptz) to authenticated;
grant execute on function public.admin_newsletter_cancel(uuid) to authenticated;
grant execute on function public.admin_newsletter_stats(uuid) to authenticated;
