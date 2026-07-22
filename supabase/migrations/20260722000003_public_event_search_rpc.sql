-- =====================================================================
-- Sinnapi — 0722 Public event search
-- Server-side search / facet / sort / paginate for the public /events grid,
-- the events-side counterpart to 0722_public_vendor_search_rpc. Four objects:
--
--   * events.search_tsv (+ trigger, GIN) -> the maintained search vector
--   * _event_in_window          -> internal: the date-band predicate, once
--   * _events_public_match      -> internal: the match predicate, once
--   * search_events_public      -> one page of cards + exact total_count
--   * count_event_facets_public -> per-occasion / source / town / date counts
--
-- WHY THIS EXISTS
-- The /events page previously pulled 24 rows and narrowed them in JavaScript,
-- which meant search and every facet only ever searched those 24 — a query for
-- an event on page two returned nothing, and "142 events" was really "the 24 we
-- happened to fetch". Everything now resolves in one indexed query over the
-- whole table, with a window count that reports the truth.
--
-- THE SHARED PREDICATE
-- Both public functions match rows through `_events_public_match`. Facet counts
-- must honour every filter EXCEPT the facet being counted (otherwise selecting
-- "Wedding" would report every other occasion as 0), which is expressed by
-- passing null for that one argument — the same "null means no constraint"
-- convention the vendor search uses. One predicate, two callers, so the counts
-- can never disagree with the grid they label.
--
-- DATE BANDS RESOLVE HERE, NOT IN THE CLIENT
-- Unlike the budget bands — which the client turns into numbers before calling,
-- exactly as it does for vendor prices — 'upcoming' and 'this_month' stay
-- tokens all the way into SQL and are resolved against `current_date` inside
-- `_event_in_window`. Resolving them in the browser would bake a date into the
-- TanStack Query cache key, so a server prefetch rendered at 23:59 and a client
-- that hydrates at 00:01 would compute different keys and silently refetch the
-- whole grid — and any ISR-cached HTML would carry a date that is wrong by the
-- time it is served.
--
-- SECURITY
-- SECURITY DEFINER, so each re-states the public visibility predicate that RLS
-- enforces, exactly as the two 0722 migrations before it:
--
--   events_public_read : status='published' and is_public and deleted_at is null
--
-- Keep in lockstep with 0011_rls.sql. Free text reaches the query only as a
-- bound parameter — never interpolated — and the sort key is whitelisted
-- against a fixed list before it is formatted into the ORDER BY, so neither is
-- an injection surface. `p_limit` is clamped so an anonymous caller cannot ask
-- for an unbounded scan.
-- =====================================================================

-- ---------------------------------------------------------------------
-- SEARCH VECTOR
-- `events` had no full-text column at all — the only text search available was
-- an unindexed ILIKE over whatever rows had already been fetched. This mirrors
-- the vendors treatment in 0004: a trigger-maintained tsvector (not a GENERATED
-- column, so the weighting can change without rewriting the table) plus GIN,
-- and trigram indexes on the two columns a visitor actually types into.
--
-- Weighting follows what a searcher means: the title is the event, its town is
-- the next strongest signal, and the description is context. `event_type` rides
-- at B so "wedding" finds weddings whose titles never say the word.
-- ---------------------------------------------------------------------
alter table public.events add column if not exists search_tsv tsvector;

create or replace function public.tg_event_search_tsv()
returns trigger language plpgsql as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('simple', coalesce(new.title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.location,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(replace(new.event_type,'_',' '),'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.description,'')), 'C');
  return new;
end;
$$;

drop trigger if exists trg_event_search_tsv on public.events;
create trigger trg_event_search_tsv
  before insert or update of title, description, event_type, location
  on public.events for each row execute function public.tg_event_search_tsv();

-- Backfill every row that predates the column. Written directly rather than
-- through a no-op UPDATE so the migration cannot disturb `updated_at`/`version`
-- on rows whose content did not actually change.
update public.events set search_tsv =
    setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(location,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(replace(event_type,'_',' '),'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description,'')), 'C')
  where search_tsv is null;

create index if not exists ix_events_search        on public.events using gin(search_tsv);
-- Trigram companions to the tsvector: a prefix query cannot match inside a
-- token, so these are what make "bale" find "Mbale" and "fest" find "Fireworks
-- Festival". `location` doubles as the index behind the town facet, which
-- matches by containment because the column is free text ("Kampala, Uganda").
create index if not exists ix_events_title_trgm    on public.events using gin(title gin_trgm_ops);
create index if not exists ix_events_location_trgm on public.events using gin(location gin_trgm_ops);
-- The default sort and the date facet both lead with `event_date >= current_date`.
create index if not exists ix_events_public_date   on public.events(event_date)
  where status = 'published' and is_public and deleted_at is null;

-- Re-runnable: drop by exact signature before recreating, so a changed
-- projection never leaves a stale overload behind. Dependency order matters —
-- the wrappers reference the helpers.
drop function if exists public.search_events_public(text, text, text, text, numeric, numeric, text, text, integer, integer);
drop function if exists public.count_event_facets_public(text, text, text, text, numeric, numeric, text, text[]);
drop function if exists public._events_public_match(text, text, text, text, numeric, numeric, text);
drop function if exists public._event_in_window(date, text);

-- ---------------------------------------------------------------------
-- _event_in_window  (internal)
-- Whether an event's date falls inside a named band. One definition, shared by
-- the match predicate and the facet counter, so the count on "This month (12)"
-- and the twelve events the grid then shows can never drift apart.
--
-- A null date is *excluded* by every band: an event with no date cannot
-- honestly be claimed as upcoming, and null comparisons make that the natural
-- result rather than something the callers have to remember. An unrecognised
-- band means "no constraint" and keeps undated events in the grid.
--
-- Plain SQL and a single expression on purpose — Postgres inlines it into the
-- calling query, so `event_date` stays indexable instead of being hidden behind
-- an opaque function call.
-- ---------------------------------------------------------------------
create function public._event_in_window(p_date date, p_when text)
returns boolean
language sql stable as $$
  select case p_when
    when 'upcoming'      then p_date >= current_date
    when 'this_month'    then p_date >= current_date
                          and p_date <  (date_trunc('month', current_date) + interval '1 month')::date
    when 'next_3_months' then p_date >= current_date
                          and p_date <  (current_date + interval '3 months')::date
    when 'past'          then p_date <  current_date
    else true
  end;
$$;

-- ---------------------------------------------------------------------
-- _events_public_match  (internal)
-- The ids of every publicly-visible event matching the supplied filters.
-- Null/empty arguments mean "no constraint", so the unfiltered grid and a
-- fully-cleared filter set resolve to the same query.
--
-- Text matching runs the maintained `search_tsv` as a *prefix* query, plus a
-- trigram ILIKE on title and location — the same pairing as the vendor search,
-- and for the same reason: the grid re-queries as the visitor types, so a
-- half-typed word has to match, while the ILIKE catches infixes a prefix query
-- structurally cannot. Input is stripped to alphanumerics before it reaches
-- `to_tsquery`, so a stray `&` or `!` in the search box cannot become syntax.
--
-- Occasion and source are exact tokens (`event_type` slugs, the `event_source`
-- enum). Town is containment, because `location` is free text a poster typed —
-- filtering to "kampala" must still match "Kampala, Uganda".
--
-- Budget: an event matches a chosen band when its [min, max] *overlaps* the
-- band, so "UGX 2M – 5M" surfaces an event budgeted 4M–9M rather than only
-- those wholly inside it. A one-sided budget is treated as a point range, and
-- an event with no budget at all is excluded once a band is chosen — "under UGX
-- 2M" cannot honestly include an event whose budget nobody has stated.
-- ---------------------------------------------------------------------
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
    -- Every token becomes a prefix term ANDed together: "kampala wed" ->
    -- 'kampala:* & wed:*'.
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
  from public.events e, args a, tsq t
  where e.status = 'published'
    and e.is_public
    and e.deleted_at is null
    and (a.q is null
         or (t.prefix_query is not null and e.search_tsv @@ to_tsquery('simple', t.prefix_query))
         or e.title ilike '%' || a.q || '%'
         or e.location ilike '%' || a.q || '%')
    and (a.type_key   is null or e.event_type = a.type_key)
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

-- Internal helpers: reachable only from the two wrappers below, which run as
-- the function owner. No client ever calls them directly.
revoke execute on function
  public._events_public_match(text, text, text, text, numeric, numeric, text),
  public._event_in_window(date, text)
from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- search_events_public
-- One page of event cards for the public grid.
--
-- `total_count` is a window count over the *filtered* set before limit/offset,
-- so "24 of 142 matches" is the real total rather than the length of the page
-- the caller happens to be holding. There is no separate count query, so the
-- two can never fall out of sync.
--
-- The default 'soonest' ordering leads with what a visitor can still act on —
-- upcoming events soonest-first, then the most recent past ones, then undated —
-- which a plain `event_date desc` gets exactly backwards the moment the
-- calendar rolls past the newest entry. It is the same expression
-- `list_public_events` uses for the home feed, so both surfaces agree.
--
-- Pagination is limit/offset rather than keyset: the sort key is user-chosen
-- and non-unique (a date, a budget), which keyset cannot page over without a
-- composite cursor, and offset also gives us the window count above for free.
-- Every ordering ends in `title, id` so equal rows have a total order and a row
-- can never appear on two pages or be skipped between them.
--
-- `source` is cast to text so the client keeps a plain string union rather than
-- depending on the event_source enum's wire form — matching `list_public_events`.
-- ---------------------------------------------------------------------
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
  -- never be built from caller input. Anything unrecognised falls back to the
  -- feed's default ordering.
  v_order := case p_sort
    when 'newest'      then 'e.created_at desc'
    when 'budget_asc'  then 'coalesce(e.budget_min, e.budget_max) asc nulls last'
    when 'budget_desc' then 'coalesce(e.budget_max, e.budget_min) desc nulls last'
    else '(e.event_date is not null and e.event_date >= current_date) desc, '
      || 'case when e.event_date >= current_date then e.event_date end asc nulls last, '
      || 'e.event_date desc nulls last, e.created_at desc'
  end;

  -- No decoration join here (unlike the vendor grid, an event card is one row),
  -- so the page can be cut in a single statement.
  return query execute format($q$
    select
      e.id, e.title, e.description, e.event_type, e.event_date, e.location,
      e.budget_min, e.budget_max, e.currency, e.cover_image_url, e.source::text,
      count(*) over() as total_count
    from public._events_public_match($1, $2, $3, $4, $5, $6, $7) m
    join public.events e on e.id = m.id
    order by %1$s, e.title asc, e.id asc
    limit $8 offset $9
  $q$, v_order)
  using p_q, p_type, p_source, p_location, p_budget_min, p_budget_max, p_when,
        greatest(1, least(coalesce(p_limit, 24), 48)),
        greatest(0, coalesce(p_offset, 0));
end;
$$;

-- ---------------------------------------------------------------------
-- count_event_facets_public
-- How many events each occasion / source / town / date band would yield, so the
-- filter controls can label themselves ("Wedding (24)") and disable the options
-- that lead nowhere — the difference between a filter bar a visitor explores
-- and one that keeps dead-ending them in an empty grid.
--
-- Each facet honours every filter except its own selection, so the counts
-- answer "what would I get if I switched to this option", not "what am I
-- already looking at". Options with no matches are simply absent; the caller
-- defaults those to zero.
--
-- Budget is deliberately not counted. It is a continuous range rather than a
-- discrete key, so every band would cost its own pass for a number that shifts
-- whenever a poster edits a budget — the same call the vendor search makes for
-- price and rating.
--
-- Towns come in as `p_locations` rather than being grouped out of the data:
-- `events.location` is free text, so grouping it would produce "Kampala",
-- "kampala" and "Kampala, Uganda" as three separate options. The caller passes
-- the curated town list it renders, and each is counted by containment — the
-- same matching the filter itself uses, so the count and the grid agree.
-- ---------------------------------------------------------------------
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
  select 'type'::text, e.event_type, count(*)
  from public._events_public_match(p_q, null, p_source, p_location, p_budget_min, p_budget_max, p_when) m
  join public.events e on e.id = m.id
  where e.event_type is not null
  group by e.event_type

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

  -- Date band: own selection released. The bands overlap by design ("this
  -- month" is a subset of "upcoming"), so this counts each independently rather
  -- than partitioning the set.
  select 'when'::text, w.band, count(*)
  from public._events_public_match(p_q, p_type, p_source, p_location, p_budget_min, p_budget_max, null) m
  join public.events e on e.id = m.id
  cross join (values ('upcoming'), ('this_month'), ('next_3_months'), ('past')) as w(band)
  where public._event_in_window(e.event_date, w.band)
  group by w.band;
$$;

-- Public site is anonymous: like the 0722 home and vendor reads, these are
-- reachable by `anon`. Safe only because the shared predicate re-states the
-- public visibility rules above and the projection exposes no poster identity.
grant execute on function
  public.search_events_public(text, text, text, text, numeric, numeric, text, text, integer, integer),
  public.count_event_facets_public(text, text, text, text, numeric, numeric, text, text[])
to anon, authenticated;
