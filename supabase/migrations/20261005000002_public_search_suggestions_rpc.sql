-- =====================================================================
-- Sinnapi — 1005 Public search suggestions
-- One anonymous-callable read behind the navbar's type-ahead:
--
--   search_suggestions_public -> a handful of vendors + events to offer
--                                while the visitor is still typing
--
-- WHY THIS EXISTS
-- The navbar box was a plain GET form: whatever you typed went to /vendors
-- and you found out whether it matched anything only after a page load. The
-- dropdown turns that into a guess-as-you-type, which only works if the
-- server can answer in one small round trip — hence a dedicated RPC rather
-- than the grid's `search_vendors_public`, which pages, counts and decorates
-- for a result grid and is far too much work to run per keystroke.
--
-- THE MATCH IS TWO PASSES, AND THE SECOND ONE IS THE POINT
-- `search_tsv` is built with the 'simple' config and queried as prefix terms,
-- so it can only ever grow a word to the right: "photograph" reaches
-- "photography", but "photographer" does not, because the two strings part
-- company at the ninth character. English stemming would not rescue it either
-- (Snowball gives `photograph` and `photographi`). Over-typing a word is a
-- completely ordinary thing to do in a search box — people type the job title
-- they know, "Photographer", at a marketplace whose vendors are listed as
-- "… Photography" — and today it returns nothing at all.
--
-- So each kind is matched twice:
--
--   * a literal pass (ILIKE containment on name/city/category, or
--     title/location), which is index-assisted by the existing GIN trigram
--     indexes and covers every under-typed prefix and infix;
--   * a fuzzy pass using pg_trgm's `<%` word-similarity operator, which asks
--     whether the typed word resembles *some continuous extent* of the target
--     rather than the whole of it. word_similarity('photographer',
--     'Nungi Photography') is ≈0.67, comfortably over the 0.6 default, so the
--     over-typed case finally lands.
--
-- The fuzzy pass is second and conditional: it runs only when the literal
-- pass left room in the dropdown, never reorders above it, and excludes rows
-- the literal pass already found. This deliberately differs from the grid's
-- relaxed fallback in 20261005000001, which runs only on a *total* miss —
-- there, diluting a precise result set is a real harm; here, leaving four of
-- six dropdown slots empty when we have plausible near-matches is the bigger
-- one. A fuzzy row can never outrank a literal one either way, because `tier`
-- sorts first and the fuzzy pass scores 0.
--
-- The 0.6 threshold is pg_trgm's shipped `word_similarity_threshold` default,
-- used rather than overridden on purpose: the `<%` operator reads it at
-- execution time, and setting it per-function would mean depending on an
-- extension GUC being registered in whichever session runs this migration.
--
-- WHY A 2-CHARACTER FLOOR IS ENFORCED HERE AND NOT ONLY IN THE CLIENT
-- A single letter matches a large fraction of the marketplace, which is both
-- a useless dropdown and an unindexed scan an anonymous caller can fire at
-- will. The client debounces and gates too, but the client is not the only
-- thing that can call this.
--
-- SECURITY
-- SECURITY DEFINER, so it re-states the public visibility predicates that RLS
-- enforces, exactly as 0722 does:
--
--   vendors : status='active' and visibility='public' and deleted_at is null
--   events  : status='published' and is_public and deleted_at is null
--
-- Keep in lockstep with 0011_rls.sql. Free text reaches the query only as a
-- bound parameter — never interpolated, and never handed to `to_tsquery`,
-- whose operator syntax would turn a stray `&` into an error page. Both
-- limits are clamped so an anonymous caller cannot ask for an unbounded scan.
--
-- Contacts (vendor email/phone) and poster identity are absent from the
-- projection, per the public-discovery rules.
-- =====================================================================

-- Re-runnable: drop by exact signature before recreating, so a changed
-- projection never leaves a stale overload behind.
drop function if exists public.search_suggestions_public(text, integer, integer);

create function public.search_suggestions_public(
  p_q            text,
  p_vendor_limit integer default 6,
  p_event_limit  integer default 4)
returns table (
  -- 'vendor' | 'event'. The client groups on this and routes on it:
  -- /vendors/<slug> for a vendor, /events/<id> for an event.
  kind      text,
  id        uuid,
  -- Vendors only; null for events, whose route keys off the id.
  slug      text,
  label     text,
  sublabel  text,
  image_url text,
  -- 4 name-prefix · 3 name-infix · 2 place · 1 category · 0 fuzzy.
  -- Exposed so the dropdown can tell an exact hit from a near one.
  tier      integer)
language sql stable security definer set search_path = public as $$
  with args as (
    select
      nullif(btrim(coalesce(p_q, '')), '')                     as q,
      least(greatest(coalesce(p_vendor_limit, 6), 0), 10)      as vlimit,
      least(greatest(coalesce(p_event_limit,  4), 0), 10)      as elimit
  ), guard as (
    -- `ok` short-circuits every branch below, so a one-character query costs
    -- a scan of nothing rather than a scan of everything.
    --
    -- `like_q` is the same text with LIKE's three metacharacters escaped, and
    -- it is what every ILIKE below interpolates. Without it the two-character
    -- floor is decorative: `%%` is two characters and matches the entire
    -- marketplace, `__` matches every row with at least two characters in the
    -- column, and `%u%` quietly turns a search into a table scan. The raw `q`
    -- is still what the trigram operators see, because they match on
    -- character runs and have no metacharacters to abuse.
    --
    -- Backslash first, or the escapes added for % and _ get escaped in turn.
    -- E'' literals throughout: they mean one backslash whatever
    -- `standard_conforming_strings` happens to be set to, and this is not a
    -- good place to depend on a session setting.
    select a.q,
           replace(replace(replace(a.q, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') as like_q,
           a.vlimit, a.elimit,
           (a.q is not null and char_length(a.q) >= 2) as ok
    from args a
  ),

  -- -------------------------------------------------------------------
  -- Vendors
  -- -------------------------------------------------------------------
  vendor_literal as (
    select
      v.id, v.slug, v.business_name as label, v.base_city as sublabel,
      coalesce(nullif(v.profile_image_url, ''), nullif(v.primary_image_url, '')) as image_url,
      v.is_featured, v.search_weight, v.avg_rating,
      case
        when v.business_name ilike g.like_q || '%'        then 4
        when v.business_name ilike '%' || g.like_q || '%' then 3
        when v.base_city     ilike '%' || g.like_q || '%' then 2
        -- Matched only through a category name: "photography" surfacing every
        -- photographer is the whole reason the category branch exists, but a
        -- vendor whose own name says so is the better suggestion.
        else 1
      end as tier
    from guard g
    cross join public.vendors v
    where g.ok and g.vlimit > 0
      and v.status = 'active'
      and v.visibility = 'public'
      and v.deleted_at is null
      and (
        v.business_name ilike '%' || g.like_q || '%'
        or v.base_city ilike '%' || g.like_q || '%'
        or exists (
          select 1
          from public.service_categories sc
          where sc.is_active
            and sc.name ilike '%' || g.like_q || '%'
            and (
              sc.id = v.primary_category_id
              or exists (
                select 1
                from public.vendor_services vs
                where vs.vendor_id = v.id
                  and vs.category_id = sc.id
                  and vs.is_active
                  and vs.deleted_at is null
              )
            )
        )
      )
  ), vendor_fuzzy as (
    -- `q <% target` is word_similarity(q, target) over the default 0.6
    -- threshold: does the typed word resemble some run of characters inside
    -- the target. The operand order matters — the indexed column has to be on
    -- the right for the GIN trigram indexes on business_name / base_city to
    -- be used.
    select
      v.id, v.slug, v.business_name as label, v.base_city as sublabel,
      coalesce(nullif(v.profile_image_url, ''), nullif(v.primary_image_url, '')) as image_url,
      v.is_featured, v.search_weight, v.avg_rating,
      0 as tier
    from guard g
    cross join public.vendors v
    where g.ok
      -- Uncorrelated, so it is evaluated once: a dropdown the literal pass
      -- already filled skips this branch outright rather than computing it
      -- and throwing it away.
      and (select count(*) from vendor_literal) < g.vlimit
      and v.status = 'active'
      and v.visibility = 'public'
      and v.deleted_at is null
      and not exists (select 1 from vendor_literal vl where vl.id = v.id)
      and (
        g.q <% v.business_name
        or g.q <% coalesce(v.base_city, '')
        or exists (
          select 1
          from public.service_categories sc
          where sc.is_active
            and g.q <% sc.name
            and (
              sc.id = v.primary_category_id
              or exists (
                select 1
                from public.vendor_services vs
                where vs.vendor_id = v.id
                  and vs.category_id = sc.id
                  and vs.is_active
                  and vs.deleted_at is null
              )
            )
        )
      )
  ), vendor_ranked as (
    select
      u.*,
      row_number() over (
        order by u.tier desc,
                 u.is_featured desc,
                 u.search_weight desc,
                 u.avg_rating desc nulls last,
                 u.label asc,
                 u.id asc
      ) as ord
    from (select * from vendor_literal union all select * from vendor_fuzzy) u
  ),

  -- -------------------------------------------------------------------
  -- Events
  -- -------------------------------------------------------------------
  event_literal as (
    select
      e.id, e.title as label, e.location as sublabel,
      nullif(e.cover_image_url, '') as image_url, e.event_date,
      case
        when e.title    ilike g.like_q || '%'        then 4
        when e.title    ilike '%' || g.like_q || '%' then 3
        else 2
      end as tier
    from guard g
    cross join public.events e
    where g.ok and g.elimit > 0
      and e.status = 'published'
      and e.is_public
      and e.deleted_at is null
      and (e.title ilike '%' || g.like_q || '%' or e.location ilike '%' || g.like_q || '%')
  ), event_fuzzy as (
    select
      e.id, e.title as label, e.location as sublabel,
      nullif(e.cover_image_url, '') as image_url, e.event_date,
      0 as tier
    from guard g
    cross join public.events e
    where g.ok
      and (select count(*) from event_literal) < g.elimit
      and e.status = 'published'
      and e.is_public
      and e.deleted_at is null
      and not exists (select 1 from event_literal el where el.id = e.id)
      and (g.q <% e.title or g.q <% coalesce(e.location, ''))
  ), event_ranked as (
    select
      u.*,
      row_number() over (
        order by u.tier desc,
                 -- Upcoming before past, then nearest in time either way: a
                 -- visitor typing into the navbar is looking for something
                 -- they can still act on.
                 (u.event_date is not null and u.event_date >= current_date) desc,
                 abs(u.event_date - current_date) asc nulls last,
                 u.label asc,
                 u.id asc
      ) as ord
    from (select * from event_literal union all select * from event_fuzzy) u
  )

  -- Vendors first, then events — the order the dropdown renders its two
  -- sections in. PostgREST preserves row order, so the client groups by
  -- `kind` without re-sorting.
  select 'vendor'::text, v.id, v.slug, v.label, v.sublabel, v.image_url, v.tier
  from vendor_ranked v
  where v.ord <= (select vlimit from guard)

  union all

  select 'event'::text, e.id, null::text, e.label, e.sublabel, e.image_url, e.tier
  from event_ranked e
  where e.ord <= (select elimit from guard);
$$;

-- Public site is anonymous: like the 0722 reads, this is reachable by `anon`.
-- Safe only because the predicates above re-state the public visibility rules
-- and the projection exposes no contact or poster columns.
grant execute on function
  public.search_suggestions_public(text, integer, integer)
to anon, authenticated;
