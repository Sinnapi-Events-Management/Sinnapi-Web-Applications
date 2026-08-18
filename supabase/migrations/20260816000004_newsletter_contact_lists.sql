-- =====================================================================
-- Sinnapi — 0816d Saved contact lists (address books) for newsletters
--
-- WHAT THIS ADDS
-- A place for ad-hoc recipients to LIVE, instead of being re-uploaded from
-- somebody's laptop every time a campaign goes out.
--
--   newsletter_contact_lists   a named, described address book
--   newsletter_contacts        one person in it: a name AND an address
--
-- WHY A LIST IS A FIRST-CLASS ROW AND NOT A CAMPAIGN COLUMN
-- Before this, a spreadsheet of conference sign-ups existed only for the
-- duration of one composer session: parsed in the browser, flattened to an array
-- of strings, posted to `admin_newsletter_queue`, gone. The next campaign to the
-- same people meant finding the same file again, and "the same people" was never
-- verifiable — two uploads of a drifting spreadsheet are two different
-- audiences that look identical in the UI. Naming the list ("Kampala Expo 2026
-- — booth sign-ups") and describing where it came from turns it into something
-- an operator can select by title next time, and something a second admin can
-- understand without asking who compiled it.
--
-- WHY A NAME IS REQUIRED ON EVERY CONTACT
-- `newsletter_recipients.full_name` has always existed and has always been null
-- for uploaded addresses, because the upload path only ever carried strings. A
-- send record that can only say `info@kd-ltd.com` cannot answer "who did we mail
-- on the 4th" in any useful way, and a saved list of bare addresses is one
-- nobody can review before re-using it. (It is also the precondition for
-- greeting recipients by name — `newsletter-dispatch` renders one body per
-- campaign today and does not personalise, and it could not start to while the
-- name was being discarded at the door.) So the name is enforced at every entry
-- point: the composer form, the spreadsheet parser, and the check constraint
-- below.
--
-- CONSENT IS UNCHANGED BY ANY OF THIS
-- A saved list is an ADDRESS BOOK, not a consent record. Nothing here creates a
-- `marketing_subscriptions` row — that still happens only at queue time, under
-- the operator's attestation, exactly as 0816c documents. Suppressed addresses
-- are still dropped at send time no matter how they got into a list, and the
-- picker greys them so the operator can see it before they send rather than
-- deduce it from a count afterwards.
-- =====================================================================

-- ---------------------------------------------------------------------
-- newsletter_contact_lists
--
-- `title` is the handle the operator selects by, so it is unique
-- case-insensitively: two address books called "Expo 2026" are indistinguishable
-- in a dropdown, and the moment they diverge one of them mails the wrong people.
-- ---------------------------------------------------------------------
create table if not exists public.newsletter_contact_lists (
  id            uuid primary key default gen_random_uuid(),

  title         text not null,
  -- Deliberately prompted for, not optional-in-spirit: "where did these people
  -- come from and when" is the question asked six months later, and the person
  -- who can answer it is the one uploading the file today.
  description   text,

  -- Denormalised, maintained by trigger — the picker shows "412 contacts" next
  -- to every title in a dropdown, and that must not be a count(*) per row.
  contact_count integer not null default 0,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references public.profiles(id),

  constraint ck_contact_list_title_present check (btrim(title) <> '')
);

create unique index if not exists ux_newsletter_contact_lists_title
  on public.newsletter_contact_lists (lower(btrim(title)));

drop trigger if exists trg_updated_at on public.newsletter_contact_lists;
create trigger trg_updated_at before update on public.newsletter_contact_lists
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- newsletter_contacts
--
-- (list, email) is unique so re-importing a corrected spreadsheet UPDATES the
-- people already in the book rather than doubling it — which is the actual
-- behaviour operators expect from "upload the latest version of the list".
-- ---------------------------------------------------------------------
create table if not exists public.newsletter_contacts (
  id         uuid primary key default gen_random_uuid(),
  list_id    uuid not null references public.newsletter_contact_lists(id) on delete cascade,

  full_name  text not null,
  email      citext not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (list_id, email),
  constraint ck_contact_name_present check (btrim(full_name) <> '')
);

-- The picker's query: one list, ordered by name, optionally searched.
create index if not exists ix_newsletter_contacts_list
  on public.newsletter_contacts(list_id, full_name);
-- "which of our address books is this person in" — asked when a complaint
-- arrives naming an address and nobody remembers where it came from.
create index if not exists ix_newsletter_contacts_email
  on public.newsletter_contacts(email);

drop trigger if exists trg_updated_at on public.newsletter_contacts;
create trigger trg_updated_at before update on public.newsletter_contacts
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- Counter maintenance — same reasoning as `tg_newsletter_recount`: one writer
-- for the counter, and it is the database.
-- ---------------------------------------------------------------------
create or replace function public.tg_contact_list_recount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_list uuid := coalesce(new.list_id, old.list_id);
begin
  update public.newsletter_contact_lists l
     set contact_count = (
           select count(*) from public.newsletter_contacts c where c.list_id = v_list
         )
   where l.id = v_list;
  return null;
end;
$$;

drop trigger if exists trg_contact_list_recount on public.newsletter_contacts;
create trigger trg_contact_list_recount
  after insert or delete on public.newsletter_contacts
  for each row execute function public.tg_contact_list_recount();

-- ---------------------------------------------------------------------
-- RLS — marketing-only, both tables. Writes go through the RPCs below, but the
-- policies are `for all` so a future admin screen can edit a contact directly
-- without needing an RPC for a one-column change.
-- ---------------------------------------------------------------------
alter table public.newsletter_contact_lists enable row level security;
alter table public.newsletter_contact_lists force row level security;
alter table public.newsletter_contacts      enable row level security;
alter table public.newsletter_contacts      force row level security;

drop policy if exists newsletter_contact_lists_admin on public.newsletter_contact_lists;
drop policy if exists newsletter_contacts_admin      on public.newsletter_contacts;

create policy newsletter_contact_lists_admin on public.newsletter_contact_lists
  for all to authenticated
  using (public.has_permission('marketing.manage'))
  with check (public.has_permission('marketing.manage'));

create policy newsletter_contacts_admin on public.newsletter_contacts
  for all to authenticated
  using (public.has_permission('marketing.manage'))
  with check (public.has_permission('marketing.manage'));

-- ---------------------------------------------------------------------
-- admin_contact_lists — the dropdown, and the management table behind it.
-- ---------------------------------------------------------------------
create or replace function public.admin_contact_lists(
  p_search text    default null,
  p_limit  integer default 50,
  p_offset integer default 0
)
returns table (
  id            uuid,
  title         text,
  description   text,
  contact_count integer,
  created_at    timestamptz,
  updated_at    timestamptz,
  total_count   bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.has_permission('marketing.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    l.id, l.title, l.description, l.contact_count, l.created_at, l.updated_at,
    count(*) over () as total_count
  from public.newsletter_contact_lists l
  where v_search is null
     or l.title ilike '%' || v_search || '%'
     or coalesce(l.description, '') ilike '%' || v_search || '%'
  order by l.updated_at desc
  limit greatest(coalesce(p_limit, 50), 1)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- ---------------------------------------------------------------------
-- admin_contact_list_contacts — one address book, paginated.
--
-- Carries `suppressed` for the same reason `admin_newsletter_audience` carries
-- `reason`: a contact who can never be mailed should be visible and greyed,
-- not quietly missing from a list the operator compiled themselves.
-- ---------------------------------------------------------------------
create or replace function public.admin_contact_list_contacts(
  p_list_id uuid,
  p_search  text    default null,
  p_limit   integer default 25,
  p_offset  integer default 0
)
returns table (
  id          uuid,
  full_name   text,
  email       text,
  suppressed  boolean,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.has_permission('marketing.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    c.id,
    c.full_name,
    c.email::text,
    (s.email is not null) as suppressed,
    count(*) over () as total_count
  from public.newsletter_contacts c
  left join public.email_suppressions s on s.email = c.email
  where c.list_id = p_list_id
    and (
      v_search is null
      or c.full_name ilike '%' || v_search || '%'
      or c.email::text ilike '%' || v_search || '%'
    )
  order by c.full_name asc, c.email asc
  limit greatest(coalesce(p_limit, 25), 1)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- ---------------------------------------------------------------------
-- admin_contact_list_save — create or extend an address book.
--
-- ONE function for both because the operator is doing one thing ("keep these
-- people"), and the difference between a new book and an existing one is a
-- dropdown they already answered. Splitting it into create/append duplicates
-- the normalisation rules, and normalisation drift is how "the same list"
-- becomes two lists.
--
-- MERGE, NOT REPLACE
-- Re-uploading a corrected spreadsheet updates the names of people already in
-- the book and adds the new ones; it does not delete anyone. Silent removal on
-- re-upload is the destructive reading of an ambiguous gesture — an operator
-- who wants somebody out says so explicitly, through
-- `admin_contact_list_remove_contacts` or by deleting the book.
--
-- `p_contacts` is `[{ "full_name": "...", "email": "..." }, ...]`. Rows missing
-- either half are counted in `skipped` and reported back, never quietly
-- dropped: a file that yields 380 of 400 contacts raises exactly one question
-- and the operator has to be able to answer it.
-- ---------------------------------------------------------------------
create or replace function public.admin_contact_list_save(
  p_title       text,
  p_description text  default null,
  p_contacts    jsonb default '[]'::jsonb,
  p_list_id     uuid  default null
)
returns table (
  list_id  uuid,
  title    text,
  inserted integer,
  updated  integer,
  skipped  integer,
  total    integer
)
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_list_id  uuid;
  v_title    text := nullif(btrim(coalesce(p_title, '')), '');
  v_desc     text := nullif(btrim(coalesce(p_description, '')), '');
  v_inserted integer := 0;
  v_updated  integer := 0;
  v_clean    integer := 0;
  v_raw      integer := 0;
begin
  if not public.has_permission('marketing.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_title is null then
    raise exception 'list_title_required' using errcode = '22023';
  end if;

  v_raw := jsonb_array_length(coalesce(p_contacts, '[]'::jsonb));

  if p_list_id is null then
    begin
      insert into public.newsletter_contact_lists (title, description, created_by)
      values (v_title, v_desc, auth.uid())
      returning id into v_list_id;
    exception when unique_violation then
      -- Surfaced as a field error on the title, not a generic failure: the
      -- operator's next move is to pick the existing book or rename this one.
      raise exception 'list_title_taken' using errcode = '23505';
    end;
  else
    -- Renaming into a title another book already holds fails the same way
    -- creating one does, and must read the same way to the operator: the UI
    -- keys its message off `list_title_taken`, and an uncaught 23505 here would
    -- surface as a raw constraint name instead.
    begin
      update public.newsletter_contact_lists
         set title       = v_title,
             description = coalesce(v_desc, description)
       where id = p_list_id
      returning id into v_list_id;
    exception when unique_violation then
      raise exception 'list_title_taken' using errcode = '23505';
    end;

    if v_list_id is null then
      raise exception 'list_not_found' using errcode = 'P0002';
    end if;
  end if;

  -- Normalise and write in one statement: lowercase the address, trim the name,
  -- drop anything missing either half, collapse duplicates within the payload
  -- keeping the first name seen for an address, then upsert.
  --
  -- `xmax = 0` distinguishes the rows this statement inserted from the rows it
  -- updated, which is the only honest way to report "12 new, 400 already here".
  with cleaned as (
    select distinct on (n.email) n.email, n.full_name
    from jsonb_array_elements(coalesce(p_contacts, '[]'::jsonb)) c
    cross join lateral (
      select
        lower(btrim(coalesce(c->>'email', ''))) as email,
        btrim(coalesce(c->>'full_name', ''))    as full_name
    ) n
    where n.email <> ''
      and position('@' in n.email) > 0
      and n.full_name <> ''
    order by n.email, n.full_name
  ),
  upserted as (
    insert into public.newsletter_contacts (list_id, full_name, email)
    select v_list_id, t.full_name, t.email::citext from cleaned t
    on conflict (list_id, email) do update
      set full_name = excluded.full_name
    returning (xmax = 0) as was_insert
  )
  select
    count(*) filter (where was_insert)::integer,
    count(*) filter (where not was_insert)::integer,
    (select count(*)::integer from cleaned)
  into v_inserted, v_updated, v_clean
  from upserted;

  return query
  select
    v_list_id,
    v_title,
    v_inserted,
    v_updated,
    greatest(v_raw - v_clean, 0),
    (select contact_count from public.newsletter_contact_lists where id = v_list_id);
end;
$$;

-- ---------------------------------------------------------------------
-- admin_contact_list_delete — remove a book and everyone in it.
--
-- Campaigns already sent are untouched: `newsletter_recipients` copies the name
-- and address at queue time precisely so the record of a send survives the list
-- it was built from being deleted.
-- ---------------------------------------------------------------------
create or replace function public.admin_contact_list_delete(p_list_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.has_permission('marketing.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  delete from public.newsletter_contact_lists where id = p_list_id;
end;
$$;

-- ---------------------------------------------------------------------
-- admin_contact_list_remove_contacts — take specific people out of a book.
--
-- The counterpart to merge-on-save: because re-uploading never removes anyone,
-- there has to be an explicit way to say "this person asked to come off our
-- list", and it has to be a different gesture from deleting the whole book.
-- ---------------------------------------------------------------------
create or replace function public.admin_contact_list_remove_contacts(
  p_list_id     uuid,
  p_contact_ids uuid[]
)
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_removed integer;
begin
  if not public.has_permission('marketing.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  delete from public.newsletter_contacts
   where list_id = p_list_id
     and id = any (coalesce(p_contact_ids, '{}'));

  get diagnostics v_removed = row_count;
  return v_removed;
end;
$$;

-- =====================================================================
-- admin_newsletter_queue — REPLACED.
--
-- Two changes, both of which exist so a name travels with every address:
--
--   1. `p_extra_emails text[]` becomes `p_extra_contacts jsonb`
--      ([{full_name, email}]). The old signature could not carry a name, so
--      every hand-entered and uploaded recipient landed with
--      `newsletter_recipients.full_name = null` unless they happened to own a
--      profile — and a null name is a greeting that reads "Hi ,".
--   2. A saved list can be queued BY REFERENCE (`p_list_id` plus a selection),
--      resolved here rather than in the browser.
--
-- WHY THE LIST IS RESOLVED SERVER-SIDE
-- The same reason `p_select_all` exists for the audience, and the same bug: an
-- address book of 4,000 people is paginated 25 rows at a time, so a UI that
-- posts "the contacts I ticked" posts the ticks it has loaded. `select all`
-- must mean every contact in the book matching the picker's search, minus the
-- ones explicitly unticked, and only this function can evaluate that against
-- the rows that actually exist.
--
-- The old signature is dropped rather than left as an overload: two functions
-- differing only in one argument's type are exactly what PostgREST cannot
-- disambiguate from a JSON body, and the failure mode is a 300 at send time.
-- =====================================================================
drop function if exists public.admin_newsletter_queue(uuid, boolean, text, uuid[], uuid[], text[], boolean);

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
      insert into public.newsletter_recipients (campaign_id, profile_id, email, full_name, unsubscribe_token)
      select p_campaign_id,
             (select id from public.profiles where email = v_row.email::citext and deleted_at is null limit 1),
             v_row.email::citext,
             coalesce(
               v_row.full_name,
               (select full_name from public.profiles where email = v_row.email::citext and deleted_at is null limit 1)
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
-- Grants — argument lists schema-qualified for the reason 0816c gives at
-- length: GRANT resolves the types in the list under the SESSION search_path,
-- with no function SET clause in sight.
-- ---------------------------------------------------------------------
grant execute on function public.admin_contact_lists(text, integer, integer) to authenticated;
grant execute on function public.admin_contact_list_contacts(uuid, text, integer, integer) to authenticated;
grant execute on function public.admin_contact_list_save(text, text, jsonb, uuid) to authenticated;
grant execute on function public.admin_contact_list_delete(uuid) to authenticated;
grant execute on function public.admin_contact_list_remove_contacts(uuid, uuid[]) to authenticated;
grant execute on function public.admin_newsletter_queue(
  uuid, boolean, text, uuid[], uuid[], jsonb, boolean, uuid, boolean, text, uuid[], uuid[]
) to authenticated;
