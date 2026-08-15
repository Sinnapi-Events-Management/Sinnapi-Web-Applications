-- =====================================================================
-- Sinnapi — 0814 Event types as a managed reference table
--
-- `events.event_type` was free text, and the vocabulary behind it lived as a
-- hardcoded array in four different places:
--
--   * apps/admin-portal  events form   (10 tokens, the set actually written)
--   * apps/vendor-portal publicEvents  ( 9 tokens)
--   * apps/web-public    site config   ( 9 tokens)
--   * apps/client-portal my events     (none — a free-text input)
--
-- Those lists had already drifted (`company_event` vs `corporate`,
-- `company_launch` vs `product_launch`), so a filter offered on one surface
-- matched nothing written by another, and a client could type any occasion at
-- all and never appear in a facet. This migration makes the database the single
-- source of truth: one `event_types` table an admin manages, and a real foreign
-- key from `events`.
--
-- SHAPE
-- `event_types` mirrors `service_categories` deliberately — same columns, same
-- policies, same admin CRUD affordances — minus `parent_id`, since occasions do
-- not nest. Reusing that shape is what lets the admin portal's Event Types page
-- be the Service Categories page with the names changed.
--
-- WHAT CALLERS SEE
-- The public functions keep returning `event_type` as the *key* (the snake_case
-- token the URLs, query keys and facet counts are built from) and add
-- `event_type_name` for display. So the wire contract is unchanged for logic and
-- gains a label: a rename in the admin portal changes every surface's copy
-- without invalidating a single bookmark.
--
-- DELETES
-- No cascade and no soft delete, matching `service_categories`: the FK blocks
-- deleting a type any event still references, and the admin portal turns that
-- 23503 into "deactivate it instead".
-- =====================================================================

-- ---------------------------------------------------------------------
-- event_types
-- ---------------------------------------------------------------------
create table if not exists public.event_types (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  name       text not null,
  icon       text,
  is_active  boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- The client/vendor/public pickers all read "active, in sort order"; this is
-- that query's index.
create index if not exists ix_event_types_active
  on public.event_types(sort_order) where is_active;

-- 0011_rls enables RLS by looping over the tables that existed when it ran, so a
-- table added later has to arm itself.
alter table public.event_types enable row level security;
alter table public.event_types force row level security;

drop policy if exists ref_read_event_types  on public.event_types;
drop policy if exists ref_write_event_types on public.event_types;

-- Same pairing as every other reference table (0011_rls): world-readable,
-- because the anonymous public site renders these as filter options, and
-- writable only by an admin holding `settings.manage`.
create policy ref_read_event_types on public.event_types
  for select to anon, authenticated using (true);
create policy ref_write_event_types on public.event_types for all to authenticated
  using (public.has_permission('settings.manage'))
  with check (public.has_permission('settings.manage'));

-- Seeded from the admin portal's list — the only one of the four that was ever
-- written to the column, so it is the vocabulary the data (if any) already uses.
-- The vendor/public-only tokens (`corporate`, `concert`, `product_launch`) are
-- deliberately not seeded: nothing has ever written them, and an admin can add
-- them in one click if they want them.
insert into public.event_types(key, name, sort_order) values
  ('wedding',        'Wedding',        1),
  ('introduction',   'Introduction',   2),
  ('birthday',       'Birthday',       3),
  ('baby_shower',    'Baby Shower',    4),
  ('graduation',     'Graduation',     5),
  ('company_event',  'Company Event',  6),
  ('anniversary',    'Anniversary',    7),
  ('company_launch', 'Company Launch', 8),
  ('fundraising',    'Fundraising',    9),
  ('conference',     'Conference',    10)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- events.event_type  ->  events.event_type_id
-- Added, backfilled by key, then the text column is dropped. The backfill is
-- written even though the table is empty today: a migration has to be correct
-- for whatever database it lands in, not just this one.
--
-- The drop itself is further down, *after* the search trigger is re-armed —
-- see the SEARCH VECTOR section for why the order is load-bearing.
-- ---------------------------------------------------------------------
alter table public.events
  add column if not exists event_type_id uuid references public.event_types(id);

create index if not exists ix_events_type on public.events(event_type_id);

-- The whole backfill is guarded on the old column still being there, and
-- written as dynamic SQL: on a second run `event_type` is gone, and a static
-- reference to it fails to plan (42703) even inside a branch that never
-- executes. A migration that cannot be re-run is a migration that cannot be
-- recovered from a half-applied deploy.
do $do$
begin
  if exists (
    select 1 from pg_attribute
     where attrelid = 'public.events'::regclass
       and attname  = 'event_type'
       and not attisdropped
  ) then
    execute $sql$
      update public.events e
         set event_type_id = t.id
        from public.event_types t
       where t.key = e.event_type
         and e.event_type_id is null
    $sql$;

    -- Any legacy value with no matching type would be silently dropped by the
    -- column drop, so promote it to a real (inactive) type first — an admin can
    -- then rename, activate or merge it, rather than losing it.
    execute $sql$
      insert into public.event_types(key, name, is_active, sort_order)
      select distinct e.event_type,
             initcap(replace(e.event_type, '_', ' ')),
             false,
             100
        from public.events e
       where e.event_type is not null
         and e.event_type_id is null
      on conflict (key) do nothing
    $sql$;

    execute $sql$
      update public.events e
         set event_type_id = t.id
        from public.event_types t
       where t.key = e.event_type
         and e.event_type_id is null
    $sql$;
  end if;
end
$do$;

-- ---------------------------------------------------------------------
-- SEARCH VECTOR
-- The 0722 trigger read `new.event_type` inline. With the token behind a FK it
-- has to be looked up, which is also the chance to index the *name*: a visitor
-- searching "shower" should find baby showers whose key is `baby_shower`.
--
-- This has to happen BEFORE the column is dropped. 0722 armed the trigger as
-- `update of title, description, event_type, location`, and a trigger's column
-- list is a real catalog dependency — Postgres refuses the drop with
--
--   2BP01: cannot drop column event_type of table events because other
--          objects depend on it ... trigger trg_event_search_tsv
--
-- `drop ... cascade` would clear the error by deleting the trigger and leaving
-- the search index silently unmaintained, so the fix is ordering, not cascade:
-- re-point the trigger at `event_type_id` first, and the dependency is gone by
-- the time the drop runs.
--
-- Known and accepted: renaming a type does not reindex the events already
-- pointing at it. The occasion is a facet, not a search term, and rewriting
-- every referencing row on a rename would trade a correct full-text nuance for
-- a table-wide write on an admin typo fix. `search_tsv` catches up whenever the
-- event itself is next edited.
-- ---------------------------------------------------------------------
create or replace function public.tg_event_search_tsv()
returns trigger language plpgsql as $$
declare
  v_type text := '';
begin
  if new.event_type_id is not null then
    select coalesce(replace(t.key, '_', ' '), '') || ' ' || coalesce(t.name, '')
      into v_type
      from public.event_types t
     where t.id = new.event_type_id;
  end if;

  new.search_tsv :=
    setweight(to_tsvector('simple', coalesce(new.title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.location,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(v_type,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.description,'')), 'C');
  return new;
end;
$$;

drop trigger if exists trg_event_search_tsv on public.events;
create trigger trg_event_search_tsv
  before insert or update of title, description, event_type_id, location
  on public.events for each row execute function public.tg_event_search_tsv();

-- Nothing depends on the text column now: the trigger above is the only object
-- that ever did (no index, view, policy or generated column references it, and
-- the RPCs below have string bodies, which Postgres does not track).
alter table public.events drop column if exists event_type;

-- Rebuild every vector: the old ones were built from a column that no longer
-- exists. Written directly rather than through a no-op UPDATE so it cannot
-- disturb `updated_at`/`version` on rows whose content did not change — and the
-- trigger above is scoped to the four source columns, so writing `search_tsv`
-- alone does not re-fire it.
update public.events e set search_tsv =
    setweight(to_tsvector('simple', coalesce(e.title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(e.location,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(
      (select replace(t.key,'_',' ') || ' ' || t.name
         from public.event_types t where t.id = e.event_type_id), '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(e.description,'')), 'C');

-- ---------------------------------------------------------------------
-- PUBLIC READS
-- Re-runnable: dropped by exact signature before recreating, so a changed
-- projection never leaves a stale overload behind. Dependency order matters —
-- the wrappers reference the helper.
-- ---------------------------------------------------------------------
drop function if exists public.search_events_public(text, text, text, text, numeric, numeric, text, text, integer, integer);
drop function if exists public.count_event_facets_public(text, text, text, text, numeric, numeric, text, text[]);
drop function if exists public._events_public_match(text, text, text, text, numeric, numeric, text);
drop function if exists public.list_public_events(integer);

-- Unchanged from 0722 except the occasion predicate, which now resolves the
-- key through the join rather than comparing a text column. `p_type` is still
-- the key, so every caller, URL and cache key is untouched.
create function public._events_public_match(
  p_q          text    default null,
  p_type       text    default null,
  p_source     text    default null,
  p_location   text    default null,
  p_budget_min numeric default null,
  p_budget_max numeric default null,
  p_when       text    default null)
returns table (id uuid)
language sql stable security definer set search_path = public as $$
  with args as (
    select
      nullif(btrim(coalesce(p_q, '')), '')        as q,
      nullif(btrim(coalesce(p_type, '')), '')     as type_key,
      nullif(btrim(coalesce(p_source, '')), '')   as source_key,
      nullif(btrim(coalesce(p_location, '')), '') as location_q,
      nullif(btrim(coalesce(p_when, '')), '')     as when_key
  ), tsq as (
    select a.q,
           nullif((
             select string_agg(token || ':*', ' & ')
             from unnest(
               string_to_array(btrim(regexp_replace(lower(a.q), '[^a-z0-9]+', ' ', 'g')), ' ')
             ) as token
             where token <> ''
           ), '') as prefix_query
    from args a
  )
  select e.id
  from public.events e
  left join public.event_types et on et.id = e.event_type_id, args a, tsq t
  where e.status = 'published'
    and e.is_public
    and e.deleted_at is null
    and (a.q is null
         or (t.prefix_query is not null and e.search_tsv @@ to_tsquery('simple', t.prefix_query))
         or e.title ilike '%' || a.q || '%'
         or e.location ilike '%' || a.q || '%')
    and (a.type_key   is null or et.key = a.type_key)
    and (a.source_key is null or e.source::text = a.source_key)
    and (a.location_q is null or e.location ilike '%' || a.location_q || '%')
    and (a.when_key   is null or public._event_in_window(e.event_date, a.when_key))
    and (
      (p_budget_min is null and p_budget_max is null)
      or (
        coalesce(e.budget_min, e.budget_max) is not null
        and (p_budget_max is null or coalesce(e.budget_min, e.budget_max) <= p_budget_max)
        and (p_budget_min is null or coalesce(e.budget_max, e.budget_min) >= p_budget_min)
      )
    );
$$;

revoke execute on function
  public._events_public_match(text, text, text, text, numeric, numeric, text)
from public, anon, authenticated;

-- `event_type` stays the key so nothing downstream has to change how it filters
-- or keys a cache; `event_type_name` is the label to render.
create function public.search_events_public(
  p_q          text    default null,
  p_type       text    default null,
  p_source     text    default null,
  p_location   text    default null,
  p_budget_min numeric default null,
  p_budget_max numeric default null,
  p_when       text    default null,
  p_sort       text    default 'soonest',
  p_limit      integer default 24,
  p_offset     integer default 0)
returns table (
  id              uuid,
  title           text,
  description     text,
  event_type      text,
  event_type_name text,
  event_date      date,
  location        text,
  budget_min      numeric,
  budget_max      numeric,
  currency        text,
  cover_image_url text,
  source          text,
  total_count     bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  v_order text;
begin
  -- Whitelisted: `v_order` is formatted into the statement below, so it must
  -- never be built from caller input.
  v_order := case p_sort
    when 'newest'      then 'e.created_at desc'
    when 'budget_asc'  then 'coalesce(e.budget_min, e.budget_max) asc nulls last'
    when 'budget_desc' then 'coalesce(e.budget_max, e.budget_min) desc nulls last'
    else '(e.event_date is not null and e.event_date >= current_date) desc, '
      || 'case when e.event_date >= current_date then e.event_date end asc nulls last, '
      || 'e.event_date desc nulls last, e.created_at desc'
  end;

  -- The type join is a lookup on a primary key, so the card is still one row
  -- and the page is still cut in a single statement.
  return query execute format($q$
    select
      e.id, e.title, e.description, et.key, et.name, e.event_date, e.location,
      e.budget_min, e.budget_max, e.currency, e.cover_image_url, e.source::text,
      count(*) over() as total_count
    from public._events_public_match($1, $2, $3, $4, $5, $6, $7) m
    join public.events e on e.id = m.id
    left join public.event_types et on et.id = e.event_type_id
    order by %1$s, e.title asc, e.id asc
    limit $8 offset $9
  $q$, v_order)
  using p_q, p_type, p_source, p_location, p_budget_min, p_budget_max, p_when,
        greatest(1, least(coalesce(p_limit, 24), 48)),
        greatest(0, coalesce(p_offset, 0));
end;
$$;

-- Occasion counts are keyed by `event_types.key` — the same token the filter
-- sends — so a count and the grid it labels still describe the same thing.
create function public.count_event_facets_public(
  p_q          text    default null,
  p_type       text    default null,
  p_source     text    default null,
  p_location   text    default null,
  p_budget_min numeric default null,
  p_budget_max numeric default null,
  p_when       text    default null,
  p_locations  text[]  default null)
returns table (facet text, key text, count bigint)
language sql stable security definer set search_path = public as $$
  -- Occasion: own selection released, every other filter still applied.
  select 'type'::text, et.key, count(*)
  from public._events_public_match(p_q, null, p_source, p_location, p_budget_min, p_budget_max, p_when) m
  join public.events e on e.id = m.id
  join public.event_types et on et.id = e.event_type_id
  group by et.key

  union all

  -- Source: own selection released.
  select 'source'::text, e.source::text, count(*)
  from public._events_public_match(p_q, p_type, null, p_location, p_budget_min, p_budget_max, p_when) m
  join public.events e on e.id = m.id
  group by e.source

  union all

  -- Town: own selection released, counted per curated token by containment.
  select 'location'::text, loc.token, count(*)
  from public._events_public_match(p_q, p_type, p_source, null, p_budget_min, p_budget_max, p_when) m
  join public.events e on e.id = m.id
  cross join unnest(coalesce(p_locations, array[]::text[])) as loc(token)
  where e.location ilike '%' || loc.token || '%'
  group by loc.token

  union all

  -- Date band: own selection released. The bands overlap by design.
  select 'when'::text, w.band, count(*)
  from public._events_public_match(p_q, p_type, p_source, p_location, p_budget_min, p_budget_max, null) m
  join public.events e on e.id = m.id
  cross join (values ('upcoming'), ('this_month'), ('next_3_months'), ('past')) as w(band)
  where public._event_in_window(e.event_date, w.band)
  group by w.band;
$$;

-- Recreated from 0722_public_home_rpc for the same reason as the two above: the
-- projection changed. Ordering and visibility predicate are unchanged.
create function public.list_public_events(p_limit integer default 6)
returns table (
  id              uuid,
  title           text,
  description     text,
  event_type      text,
  event_type_name text,
  event_date      date,
  location        text,
  budget_min      numeric,
  budget_max      numeric,
  currency        text,
  cover_image_url text,
  source          text)
language sql stable security definer set search_path = public as $$
  select
    e.id,
    e.title,
    e.description,
    et.key,
    et.name,
    e.event_date,
    e.location,
    e.budget_min,
    e.budget_max,
    e.currency,
    e.cover_image_url,
    e.source::text
  from public.events e
  left join public.event_types et on et.id = e.event_type_id
  where e.status = 'published'
    and e.is_public
    and e.deleted_at is null
  order by
    (e.event_date is not null and e.event_date >= current_date) desc,
    case when e.event_date >= current_date then e.event_date end asc nulls last,
    e.event_date desc nulls last,
    e.created_at desc
  limit greatest(1, least(coalesce(p_limit, 6), 60));
$$;

grant execute on function
  public.search_events_public(text, text, text, text, numeric, numeric, text, text, integer, integer),
  public.count_event_facets_public(text, text, text, text, numeric, numeric, text, text[]),
  public.list_public_events(integer)
to anon, authenticated;
