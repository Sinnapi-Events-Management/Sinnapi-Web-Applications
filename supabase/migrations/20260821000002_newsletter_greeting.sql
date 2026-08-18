-- =====================================================================
-- Sinnapi — 0821b Newsletter greeting: a per-recipient given name
--
-- WHAT THIS ENABLES
-- Every campaign now opens with "Hi <name>," rendered by the newsletter shell.
-- The body itself is still rendered ONCE per campaign and shared by every
-- recipient — only the shell varies per person, which is what keeps a
-- 50,000-recipient send from re-walking the block tree 50,000 times. The
-- greeting therefore has to be a value carried on the recipient row, not a
-- token substituted into rendered HTML.
--
-- WHY A first_name COLUMN RATHER THAN SPLITTING full_name AT SEND TIME
-- `profiles.first_name` already exists and is populated properly (see
-- 20260718000001), so splitting `full_name` on whitespace in the Edge Function
-- would be re-deriving, worse, a value the database already holds. It is worse
-- in a specific way: the split takes the first token, which is wrong for every
-- compound given name and for every record whose full_name is ordered
-- surname-first. Copying the real column at queue time costs one column and
-- gets those right.
--
-- The copy is deliberate rather than a join at send time. A recipient row is
-- evidence of who was mailed and what they were called AT THAT MOMENT; joining
-- live would mean a campaign's greeting silently changes when somebody edits
-- their profile a year later, and would re-introduce a per-recipient lookup
-- into the send loop.
--
-- WHAT IS NOT DECIDED HERE
-- Whether a stored name is USABLE is decided at send time, not at queue time.
-- `profiles.full_name` is NOT NULL and falls back to the email local-part, so
-- an audience member can legitimately be stored as "hadijah315" — and the check
-- that catches that needs the recipient's email to compare against. Keeping the
-- rule in one place (`newsletter-dispatch/emails.ts`) means the preview, the
-- test send and the real send cannot disagree about who gets "Hi there,".
-- =====================================================================

-- ---------------------------------------------------------------------
-- The column. Nullable: an uploaded address with no name and no matching
-- profile genuinely has no given name, and inventing one is what produces
-- "Hi ,".
-- ---------------------------------------------------------------------
alter table public.newsletter_recipients
  add column if not exists first_name text;

-- ---------------------------------------------------------------------
-- Backfill rows queued before this migration.
--
-- Split into two statements by whether the recipient is linked to a profile,
-- because the good source only exists for the linked ones. Both are guarded on
-- `first_name is null` so re-running the migration cannot overwrite a value the
-- queue RPC has since written.
-- ---------------------------------------------------------------------
update public.newsletter_recipients r
   set first_name = coalesce(p.first_name, nullif(split_part(btrim(r.full_name), ' ', 1), ''))
  from public.profiles p
 where p.id = r.profile_id
   and r.first_name is null;

update public.newsletter_recipients r
   set first_name = nullif(split_part(btrim(r.full_name), ' ', 1), '')
 where r.first_name is null
   and r.profile_id is null;

-- =====================================================================
-- admin_newsletter_queue — REPLACED so a given name travels with every address.
--
-- Dropped by full signature before recreating, per the convention this
-- subsystem already follows: two overloads differing in one argument are
-- exactly what PostgREST cannot disambiguate from a JSON body, and the failure
-- mode is a 300 at send time. The signature is UNCHANGED; only the two INSERT
-- statements differ, each now carrying `first_name`.
-- =====================================================================
drop function if exists public.admin_newsletter_queue(
  uuid, boolean, text, uuid[], uuid[], jsonb, boolean, uuid, boolean, text, uuid[], uuid[]
);


create or replace function public.admin_newsletter_queue(
  p_campaign_id       uuid,
  p_select_all        boolean default true,
  p_search            text    default null,
  p_profile_ids       uuid[]  default null,
  p_excluded_ids      uuid[]  default null,
  p_extra_contacts    jsonb   default null,
  p_attested          boolean default false,
  p_list_id           uuid    default null,
  p_list_select_all   boolean default true,
  p_list_search       text    default null,
  p_list_contact_ids  uuid[]  default null,
  p_list_excluded_ids uuid[]  default null
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
  v_campaign  public.newsletter_campaigns%rowtype;
  v_roles     text[];
  v_search    text := nullif(btrim(coalesce(p_search, '')), '');
  v_list_srch text := nullif(btrim(coalesce(p_list_search, '')), '');
  v_extra     jsonb;
  v_row       record;
  v_token     text;
  v_imported  integer := 0;
  v_attest    text;
  v_suppress  integer := 0;
  v_nocons    integer := 0;
  v_extra_sup integer := 0;
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

  -- ── Ad-hoc recipients: typed in, uploaded, and pulled from a saved list ──
  -- The three sources are merged into ONE normalised set here rather than being
  -- inserted separately, because they overlap constantly in practice (somebody
  -- types an address, then selects the list it came from) and a single
  -- de-duplicated set is what makes `imported` a number the operator can trust.
  -- Ties are resolved toward a named entry: `order by (full_name is null)`.
  with typed as (
    select
      lower(btrim(coalesce(c->>'email', ''))) as email,
      nullif(btrim(coalesce(c->>'full_name', '')), '') as full_name
    from jsonb_array_elements(coalesce(p_extra_contacts, '[]'::jsonb)) c
  ),
  from_list as (
    select lower(btrim(nc.email::text)) as email, nullif(btrim(nc.full_name), '') as full_name
    from public.newsletter_contacts nc
    where p_list_id is not null
      and nc.list_id = p_list_id
      and (
        case
          when p_list_select_all then
            (v_list_srch is null
               or nc.full_name ilike '%' || v_list_srch || '%'
               or nc.email::text ilike '%' || v_list_srch || '%')
            and not (nc.id = any (coalesce(p_list_excluded_ids, '{}')))
          else
            nc.id = any (coalesce(p_list_contact_ids, '{}'))
        end
      )
  ),
  merged as (
    select * from typed
    union all
    select * from from_list
  ),
  cleaned as (
    select distinct on (email) email, full_name
    from merged
    where email <> '' and position('@' in email) > 0
    order by email, (full_name is null), full_name
  )
  select coalesce(
           jsonb_agg(jsonb_build_object('email', email, 'full_name', full_name)),
           '[]'::jsonb
         )
    into v_extra
  from cleaned;

  if jsonb_array_length(v_extra) > 0 and not p_attested then
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
  insert into public.newsletter_recipients (campaign_id, profile_id, email, full_name, first_name, unsubscribe_token)
  select p_campaign_id, p.id, p.email, p.full_name, p.first_name, ms.unsubscribe_token
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

  -- ── Manually entered / uploaded / saved-list rows ────────────────────
  if jsonb_array_length(v_extra) > 0 then
    v_attest := format(
      'Added to campaign "%s" by an administrator who attested that Sinnapi holds consent to email this address.',
      v_campaign.title
    );

    for v_row in
      select e->>'email' as email, e->>'full_name' as full_name
      from jsonb_array_elements(v_extra) e
    loop
      -- A suppressed address is never resurrected by an upload. This is the
      -- rule that makes the suppression list mean anything: the most common way
      -- an unsubscribe gets undone in the wild is somebody re-importing an old
      -- spreadsheet that predates it — and a SAVED list makes that easier, not
      -- harder, which is exactly why the rule is enforced here and not in the
      -- importer.
      if exists (select 1 from public.email_suppressions s where s.email = v_row.email::citext) then
        v_extra_sup := v_extra_sup + 1;
        continue;
      end if;

      insert into public.marketing_subscriptions (
        email, topic, status, source, consent_text, consent_at, confirmed_at, profile_id
      )
      values (
        v_row.email::citext, v_campaign.topic, 'subscribed', 'admin_import', v_attest, now(), now(),
        (select id from public.profiles where email = v_row.email::citext and deleted_at is null limit 1)
      )
      on conflict (email, topic) do update
        set status          = 'subscribed',
            unsubscribed_at = null
      returning unsubscribe_token into v_token;

      -- The name the operator supplied wins over the profile's: for an address
      -- that has no account it is the only name there is, and for one that does,
      -- the person who just typed it is closer to the relationship than a
      -- registration form filled in two years ago.
      insert into public.newsletter_recipients (campaign_id, profile_id, email, full_name, first_name, unsubscribe_token)
      select p_campaign_id,
             (select id from public.profiles where email = v_row.email::citext and deleted_at is null limit 1),
             v_row.email::citext,
             coalesce(
               v_row.full_name,
               (select full_name from public.profiles where email = v_row.email::citext and deleted_at is null limit 1)
             ),
             -- An uploaded contact carries one name field, so the given name is
             -- its first token. The profile's stored `first_name` is used only
             -- when the operator supplied no name at all -- for the same reason
             -- `full_name` prefers theirs: the person who just typed it is
             -- closer to the relationship than a registration form.
             coalesce(
               nullif(split_part(btrim(v_row.full_name), ' ', 1), ''),
               (select first_name from public.profiles where email = v_row.email::citext and deleted_at is null limit 1)
             ),
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
    -- Suppressed extras are counted alongside suppressed audience members:
    -- from the operator's side they are the same event — "this address is on
    -- the do-not-mail list" — and splitting them across two numbers would only
    -- invite the question of which one to trust.
    v_suppress + v_extra_sup,
    v_nocons,
    v_imported;
end;
$$;

-- ---------------------------------------------------------------------
-- Grant — re-granted because the DROP above took the old one with it. The
-- argument list is schema-qualified for the reason 0816c gives at length:
-- GRANT resolves the types under the SESSION search_path, with no function SET
-- clause in sight.
-- ---------------------------------------------------------------------
grant execute on function public.admin_newsletter_queue(
  uuid, boolean, text, uuid[], uuid[], jsonb, boolean, uuid, boolean, text, uuid[], uuid[]
) to authenticated;
