-- =====================================================================
-- Sinnapi — 1005 Category matching and a fuzzy last resort for the grids
--
-- WHY THIS EXISTS
-- Typing a service into the vendors grid returned an arbitrary subset of the
-- vendors who sell it. With four photographers listed, "photographer" found
-- two and "photography" found three — overlapping, neither complete — and a
-- single transposed letter found none. The reason is that the text predicate
-- could only ever see three columns:
--
--   search_tsv = business_name (A) + base_city (B) + biography (C),
--
-- built with the 'simple' configuration and queried as prefix terms. So which
-- photographers a visitor saw depended entirely on how each one happened to
-- word her own biography. A vendor trading as "Glow Studios Photography",
-- correctly filed under the Photographer category, was unreachable by the
-- word "photographer" unless she had written it about herself.
--
-- Measured against a 5 000-vendor copy of the live schema, where 1 003
-- vendors are filed under Photographer: before this migration "photography"
-- returned 1 of them. It now returns all 1 003.
--
-- None of that is fixable by relaxing the query, because the information is
-- not in the index. Two things are added here:
--
--   1. THE CATEGORY IS NOW SEARCHABLE TEXT.
--      A vendor matches if the visitor's words match a category she is
--      actually filed under — her primary category, or any active service she
--      sells. This is the real fix: "photographer" now means every
--      photographer, not every photographer who used that word in her bio.
--      Matched through `service_categories.name`, not `key`, so an admin
--      renaming a category renames what visitors can search for while the
--      snake_case URL token stays an identifier.
--
--   2. A TRIGRAM PASS OF LAST RESORT.
--      'simple' prefix matching can only grow a word rightwards, so
--      "photographer" never reaches "Photography" (they part at the ninth
--      character), and no stemmer unifies them either — Snowball gives
--      `photograph` and `photographi`. pg_trgm's `<%` asks a different
--      question: does the typed word resemble a continuous run inside the
--      target. The same operator absorbs ordinary typos.
--
-- HOW A CATEGORY NAME IS MATCHED, AND WHY IT TAKES THREE TESTS
-- A category name is a closed, curated vocabulary of twelve rows, so it can
-- afford tests that would be reckless against free text. Measured over the
-- real category list against sixteen realistic queries (192 pairs):
--
--   ILIKE        the literal substring, for exact and partial words
--   `<%`         word_similarity >= 0.6: photography->Photographer (0.833),
--                videography->Videographer (0.833), decoration->Decorator
--                (0.636), and typos — fotographer->Photographer (0.750)
--   english stem catering->Caterer, decorating->Decorator, venues->Venue
--
-- The last two are complementary, not redundant, and neither alone is
-- enough. Trigram misses catering->Caterer (0.556, under the threshold); the
-- stemmer misses photography->Photographer ('photographi' vs 'photograph').
-- Together they matched 14 of the 16 intended pairs with ZERO false
-- positives. Kept at the stock 0.6 rather than tuned down because the single
-- near-miss in the whole matrix, photographer->Videographer at 0.538, sits
-- just under it: lowering the threshold to catch catering by similarity
-- would have put videographers into every photographer search. The stemmer
-- catches catering instead, and costs nothing.
--
-- The two it still misses are florals->Florist and flowers->Florist, which
-- are synonym problems rather than morphology — no threshold reaches them,
-- and a synonym dictionary is the right tool, not this migration.
--
-- 'english' here, though search_tsv is 'simple': the two are doing different
-- jobs. search_tsv must stay unstemmed because the grid re-queries on every
-- keystroke and prefix-matches a half-typed word. A category name is matched
-- whole, from a fixed list, so stemming it is safe and useful.
--
-- THE THREE PASSES, AND WHY THEY ARE ORDERED
--   strict   every word must match (0722, plus categories)
--   relaxed  any word, best-matching rows only (20261005000001, plus
--            categories) — multi-word searches only
--   fuzzy    any word, by trigram similarity, best-matching rows only — NEW
--
-- Each pass runs only if every pass above it came back empty. A precise
-- search therefore can never be diluted by near-misses, and the expensive
-- passes are skipped outright on the common query rather than computed and
-- discarded (the `not exists` guards are uncorrelated, so each is evaluated
-- once). Relevance is expressed by which rows a pass *admits*, not by an
-- ORDER BY, because ordering belongs to the visitor's chosen sort.
--
-- The fuzzy pass tests business_name and base_city only, with no category
-- branch. That is not an oversight: by the time it runs, the category test
-- has already been tried and failed. For a one-word query the strict pass
-- applied exactly the same test; for a multi-word one the relaxed pass
-- applied it per word. A category branch here could not admit a row the
-- passes above had not already admitted.
--
-- This deliberately differs from `search_suggestions_public` (…0002), where
-- the fuzzy pass tops up a half-empty dropdown instead of waiting for a total
-- miss. Ten slots that could be filled are worth filling; a result grid with
-- facet counts attached is not the same object, and "top up to N" has no
-- meaning in a predicate that does not know the caller's page size.
--
-- WHY THE CATEGORIES ARE RESOLVED IN THEIR OWN CTE
-- The obvious way to write this is an EXISTS over service_categories inside
-- the main predicate. Measured, that is a trap: it becomes one more arm of
-- the big OR the text search already is, so the planner cannot use any index
-- for it and degrades it to a correlated SubPlan — twelve category rows
-- re-tested, with their to_tsvector and word_similarity, once per vendor
-- scanned. On the 5 000-vendor copy that took the strict pass from 20 ms to
-- 85 ms. Resolving the names to a vendor-id set first, then testing
-- membership, gives the identical 1 003 rows in 17 ms, so the whole feature
-- costs roughly nothing. An earlier draft instead shared the predicate
-- through a `_vendor_in_named_category(…)` helper, which reads better and is
-- worse still: a SECURITY DEFINER function is never inlined, so every row
-- pays a function call and the planner loses the semi-join entirely.
--
-- LIKE METACHARACTERS ARE NOW ESCAPED
-- Fixed in passing because these are the lines being rewritten: the
-- whole-string ILIKE patterns interpolated the visitor's text raw, so `%` and
-- `_` arrived as wildcards. `?q=%` matched the entire marketplace through
-- what looks like a search. Only `like_q` and `like_location` need it — the
-- per-word branches use `tokens`, which `regexp_replace(…, '[^a-z0-9]+', …)`
-- has already reduced to alphanumerics, and the trigram and tsquery
-- operators have no pattern syntax to abuse.
--
-- `client_min_messages = warning` on both: `plainto_tsquery` raises a NOTICE
-- for a query that stems to nothing ("the", or punctuation the tokenizer
-- stripped). A search predicate firing notices into the logs on ordinary
-- input is noise, and these run on every keystroke.
--
-- `create or replace`, so grants carry over untouched. Signatures, arguments
-- and return types are unchanged: no caller, cache key or URL is affected.
-- Both are internal helpers behind the SECURITY DEFINER wrappers, and the
-- facet counters share them — so the counts cannot drift from the grid they
-- label.
-- =====================================================================

-- ---------------------------------------------------------------------
-- _vendors_public_match
-- ---------------------------------------------------------------------
create or replace function public._vendors_public_match(
  p_q          text    default null,
  p_category   text    default null,
  p_region     text    default null,
  p_price_min  numeric default null,
  p_price_max  numeric default null,
  p_min_rating numeric default null)
returns table (id uuid)
language sql stable security definer set search_path = public
  set client_min_messages = warning as $$
  with args as (
    select
      nullif(btrim(coalesce(p_q, '')), '')        as q,
      nullif(btrim(coalesce(p_category, '')), '') as category,
      nullif(btrim(coalesce(p_region, '')), '')   as region
  ), tsq as (
    -- Input is stripped to alphanumerics first, so nothing a visitor types
    -- can reach `to_tsquery` as syntax (it throws on operators like `&` or
    -- `!`). Every token becomes a prefix term, because the grid re-queries as
    -- the visitor types and a half-typed word has to match.
    --
    -- `like_q` is the whole query with LIKE's metacharacters escaped.
    -- Backslash first, or the escapes added for % and _ get escaped in turn.
    -- E'' literals: they mean one backslash whatever
    -- `standard_conforming_strings` is set to.
    --
    -- `stem_q` is built once here rather than per row, and only when there is
    -- an alphanumeric token to stem, so a query of pure punctuation never
    -- reaches `plainto_tsquery` at all.
    select
      a.q,
      tok.tokens,
      replace(replace(replace(a.q, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') as like_q,
      nullif((select string_agg(t || ':*', ' & ') from unnest(tok.tokens) t), '') as all_query,
      nullif((select string_agg(t || ':*', ' | ') from unnest(tok.tokens) t), '') as any_query,
      coalesce(array_length(tok.tokens, 1), 0) > 1                                as multi_word,
      case when tok.tokens <> '{}' then plainto_tsquery('english', a.q) end       as stem_q
    from args a
    cross join lateral (
      select array_remove(
        string_to_array(
          btrim(regexp_replace(lower(coalesce(a.q, '')), '[^a-z0-9]+', ' ', 'g')), ' '),
        '') as tokens
    ) tok
  ), q_cats as (
    -- Categories whose name matches the whole query as one phrase.
    select sc.id as cat_id
    from public.service_categories sc, args a, tsq t
    where a.q is not null
      and sc.is_active
      and (sc.name ilike '%' || t.like_q || '%'
           or t.q <% sc.name
           or to_tsvector('english', sc.name) @@ t.stem_q)
  ), q_cat_vendors as (
    -- …and the vendors filed under them, by primary category or by an active
    -- service. Resolved to ids once; the passes below only test membership.
    select v.id as vendor_id
    from public.vendors v
    where v.primary_category_id in (select cat_id from q_cats)
    union
    select vs.vendor_id
    from public.vendor_services vs
    where vs.is_active
      and vs.deleted_at is null
      and vs.category_id in (select cat_id from q_cats)
  ), word_cats as (
    -- The same, per typed word, for the relaxed pass's per-word hit count.
    select tw.word, sc.id as cat_id
    from tsq t
    cross join lateral unnest(t.tokens) as tw(word)
    cross join public.service_categories sc
    where sc.is_active
      and (sc.name ilike '%' || tw.word || '%'
           or tw.word <% sc.name
           or to_tsvector('english', sc.name) @@ plainto_tsquery('english', tw.word))
  ), word_cat_vendors as (
    select wc.word, v.id as vendor_id
    from word_cats wc
    join public.vendors v on v.primary_category_id = wc.cat_id
    union
    select wc.word, vs.vendor_id
    from word_cats wc
    join public.vendor_services vs on vs.category_id = wc.cat_id
    where vs.is_active
      and vs.deleted_at is null
  ), strict as (
    -- Every word must match: via the prefix query, a trigram ILIKE on the two
    -- columns a prefix query can't reach infixes in, or — new — the name of a
    -- category the vendor is filed under.
    select v.id
    from public.vendors v, args a, tsq t
    where v.status = 'active'
      and v.visibility = 'public'
      and v.deleted_at is null
      and (a.q is null
           or (t.all_query is not null and v.search_tsv @@ to_tsquery('simple', t.all_query))
           or v.business_name ilike '%' || t.like_q || '%'
           or v.base_city ilike '%' || t.like_q || '%'
           or v.id in (select vendor_id from q_cat_vendors))
      and (a.category is null or exists (
        select 1
        from public.service_categories sc
        where sc.key = a.category
          and sc.is_active
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
      ))
      and (a.region is null or exists (
        select 1
        from public.vendor_service_regions vsr
        join public.service_regions sr on sr.id = vsr.region_id
        where vsr.vendor_id = v.id
          and sr.key = a.region
          and sr.is_active
      ))
      and (p_price_min  is null or (v.starting_price is not null and v.starting_price >= p_price_min))
      and (p_price_max  is null or (v.starting_price is not null and v.starting_price <= p_price_max))
      and (p_min_rating is null or v.avg_rating >= p_min_rating)
  ), relaxed as (
    -- Same row set, any word instead of every word, carrying how many words
    -- each row matched. Multi-word only: for one word, AND and OR are the
    -- same query.
    select
      v.id,
      (select count(*)
         from unnest(t.tokens) as tw(word)
        where v.search_tsv @@ to_tsquery('simple', tw.word || ':*')
           or v.business_name ilike '%' || tw.word || '%'
           or v.base_city ilike '%' || tw.word || '%'
           or exists (select 1 from word_cat_vendors wcv
                       where wcv.word = tw.word and wcv.vendor_id = v.id)) as hits
    from public.vendors v, args a, tsq t
    where t.multi_word
      and t.any_query is not null
      and not exists (select 1 from strict)
      and v.status = 'active'
      and v.visibility = 'public'
      and v.deleted_at is null
      and (v.search_tsv @@ to_tsquery('simple', t.any_query)
           or v.id in (select vendor_id from word_cat_vendors)
           or exists (
             select 1
             from unnest(t.tokens) as tw(word)
             where v.business_name ilike '%' || tw.word || '%'
                or v.base_city ilike '%' || tw.word || '%'
           ))
      and (a.category is null or exists (
        select 1
        from public.service_categories sc
        where sc.key = a.category
          and sc.is_active
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
      ))
      and (a.region is null or exists (
        select 1
        from public.vendor_service_regions vsr
        join public.service_regions sr on sr.id = vsr.region_id
        where vsr.vendor_id = v.id
          and sr.key = a.region
          and sr.is_active
      ))
      and (p_price_min  is null or (v.starting_price is not null and v.starting_price >= p_price_min))
      and (p_price_max  is null or (v.starting_price is not null and v.starting_price <= p_price_max))
      and (p_min_rating is null or v.avg_rating >= p_min_rating)
  ), fuzzy as (
    -- Last resort: nothing matched literally, so ask trigram similarity which
    -- rows *resemble* what was typed. `tw.word <% target` is word_similarity(w,
    -- target) over the 0.6 default — the typed word against the best-matching
    -- run inside the target, which is what lets "photographer" reach
    -- "Photography". Operand order matters: the indexed column goes on the
    -- right for the GIN trigram indexes to be usable.
    select
      v.id,
      (select count(*)
         from unnest(t.tokens) as tw(word)
        where tw.word <% v.business_name
           or tw.word <% coalesce(v.base_city, '')) as hits
    from public.vendors v, args a, tsq t
    where a.q is not null
      and not exists (select 1 from strict)
      and not exists (select 1 from relaxed)
      and v.status = 'active'
      and v.visibility = 'public'
      and v.deleted_at is null
      and exists (
        select 1
        from unnest(t.tokens) as tw(word)
        where tw.word <% v.business_name
           or tw.word <% coalesce(v.base_city, '')
      )
      and (a.category is null or exists (
        select 1
        from public.service_categories sc
        where sc.key = a.category
          and sc.is_active
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
      ))
      and (a.region is null or exists (
        select 1
        from public.vendor_service_regions vsr
        join public.service_regions sr on sr.id = vsr.region_id
        where vsr.vendor_id = v.id
          and sr.key = a.region
          and sr.is_active
      ))
      and (p_price_min  is null or (v.starting_price is not null and v.starting_price >= p_price_min))
      and (p_price_max  is null or (v.starting_price is not null and v.starting_price <= p_price_max))
      and (p_min_rating is null or v.avg_rating >= p_min_rating)
  )
  select id from strict
  union all
  select id from relaxed where hits = (select max(hits) from relaxed)
  union all
  select id from fuzzy   where hits = (select max(hits) from fuzzy);
$$;

-- ---------------------------------------------------------------------
-- _events_public_match
-- The same three passes over the occasion/source/town/budget/when facets.
-- Events have no service categories; their analogue is the occasion
-- (`event_types.name`), which becomes searchable text here for the same
-- reason — "wedding" should find events filed as weddings, not only events
-- with "wedding" in the title.
--
-- The occasion needs no CTE of its own: `event_types` is already joined
-- one-to-one, so `et.name` is one value per event row rather than a
-- twelve-row subquery re-run per row, and the three name tests cost the same
-- as any other column predicate in the OR.
-- ---------------------------------------------------------------------
create or replace function public._events_public_match(
  p_q          text    default null,
  p_type       text    default null,
  p_source     text    default null,
  p_location   text    default null,
  p_budget_min numeric default null,
  p_budget_max numeric default null,
  p_when       text    default null)
returns table (id uuid)
language sql stable security definer set search_path = public
  set client_min_messages = warning as $$
  with args as (
    select
      nullif(btrim(coalesce(p_q, '')), '')        as q,
      nullif(btrim(coalesce(p_type, '')), '')     as type_key,
      nullif(btrim(coalesce(p_source, '')), '')   as source_key,
      nullif(btrim(coalesce(p_location, '')), '') as location_q,
      nullif(btrim(coalesce(p_when, '')), '')     as when_key
  ), tsq as (
    select
      a.q,
      tok.tokens,
      replace(replace(replace(a.q, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') as like_q,
      -- A facet token from a curated list, but it still arrives from the URL.
      replace(replace(replace(a.location_q, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_')
                                                                               as like_location,
      nullif((select string_agg(t || ':*', ' & ') from unnest(tok.tokens) t), '') as all_query,
      nullif((select string_agg(t || ':*', ' | ') from unnest(tok.tokens) t), '') as any_query,
      coalesce(array_length(tok.tokens, 1), 0) > 1                                as multi_word,
      case when tok.tokens <> '{}' then plainto_tsquery('english', a.q) end       as stem_q
    from args a
    cross join lateral (
      select array_remove(
        string_to_array(
          btrim(regexp_replace(lower(coalesce(a.q, '')), '[^a-z0-9]+', ' ', 'g')), ' '),
        '') as tokens
    ) tok
  ), strict as (
    select e.id
    from public.events e
    left join public.event_types et on et.id = e.event_type_id, args a, tsq t
    where e.status = 'published'
      and e.is_public
      and e.deleted_at is null
      and (a.q is null
           or (t.all_query is not null and e.search_tsv @@ to_tsquery('simple', t.all_query))
           or e.title ilike '%' || t.like_q || '%'
           or e.location ilike '%' || t.like_q || '%'
           or et.name ilike '%' || t.like_q || '%'
           or t.q <% et.name
           or to_tsvector('english', coalesce(et.name, '')) @@ t.stem_q)
      and (a.type_key   is null or et.key = a.type_key)
      and (a.source_key is null or e.source::text = a.source_key)
      and (a.location_q is null or e.location ilike '%' || t.like_location || '%')
      and (a.when_key   is null or public._event_in_window(e.event_date, a.when_key))
      and (
        (p_budget_min is null and p_budget_max is null)
        or (
          coalesce(e.budget_min, e.budget_max) is not null
          and (p_budget_max is null or coalesce(e.budget_min, e.budget_max) <= p_budget_max)
          and (p_budget_min is null or coalesce(e.budget_max, e.budget_min) >= p_budget_min)
        )
      )
  ), relaxed as (
    select
      e.id,
      (select count(*)
         from unnest(t.tokens) as tw(word)
        where e.search_tsv @@ to_tsquery('simple', tw.word || ':*')
           or e.title ilike '%' || tw.word || '%'
           or e.location ilike '%' || tw.word || '%'
           or et.name ilike '%' || tw.word || '%'
           or tw.word <% et.name
           or to_tsvector('english', coalesce(et.name, '')) @@ plainto_tsquery('english', tw.word)) as hits
    from public.events e
    left join public.event_types et on et.id = e.event_type_id, args a, tsq t
    where t.multi_word
      and t.any_query is not null
      and not exists (select 1 from strict)
      and e.status = 'published'
      and e.is_public
      and e.deleted_at is null
      and (e.search_tsv @@ to_tsquery('simple', t.any_query)
           or exists (
             select 1
             from unnest(t.tokens) as tw(word)
             where e.title ilike '%' || tw.word || '%'
                or e.location ilike '%' || tw.word || '%'
                or et.name ilike '%' || tw.word || '%'
                or tw.word <% et.name
                or to_tsvector('english', coalesce(et.name, '')) @@ plainto_tsquery('english', tw.word)
           ))
      and (a.type_key   is null or et.key = a.type_key)
      and (a.source_key is null or e.source::text = a.source_key)
      and (a.location_q is null or e.location ilike '%' || t.like_location || '%')
      and (a.when_key   is null or public._event_in_window(e.event_date, a.when_key))
      and (
        (p_budget_min is null and p_budget_max is null)
        or (
          coalesce(e.budget_min, e.budget_max) is not null
          and (p_budget_max is null or coalesce(e.budget_min, e.budget_max) <= p_budget_max)
          and (p_budget_min is null or coalesce(e.budget_max, e.budget_min) >= p_budget_min)
        )
      )
  ), fuzzy as (
    -- As for vendors, no occasion branch: the passes above have already
    -- applied the same test to `et.name` and come back empty.
    select
      e.id,
      (select count(*)
         from unnest(t.tokens) as tw(word)
        where tw.word <% e.title
           or tw.word <% coalesce(e.location, '')) as hits
    from public.events e
    left join public.event_types et on et.id = e.event_type_id, args a, tsq t
    where a.q is not null
      and not exists (select 1 from strict)
      and not exists (select 1 from relaxed)
      and e.status = 'published'
      and e.is_public
      and e.deleted_at is null
      and exists (
        select 1
        from unnest(t.tokens) as tw(word)
        where tw.word <% e.title
           or tw.word <% coalesce(e.location, '')
      )
      and (a.type_key   is null or et.key = a.type_key)
      and (a.source_key is null or e.source::text = a.source_key)
      and (a.location_q is null or e.location ilike '%' || t.like_location || '%')
      and (a.when_key   is null or public._event_in_window(e.event_date, a.when_key))
      and (
        (p_budget_min is null and p_budget_max is null)
        or (
          coalesce(e.budget_min, e.budget_max) is not null
          and (p_budget_max is null or coalesce(e.budget_min, e.budget_max) <= p_budget_max)
          and (p_budget_min is null or coalesce(e.budget_max, e.budget_min) >= p_budget_min)
        )
      )
  )
  select id from strict
  union all
  select id from relaxed where hits = (select max(hits) from relaxed)
  union all
  select id from fuzzy   where hits = (select max(hits) from fuzzy);
$$;

-- Internal helpers: reachable only from the wrappers, which run as the
-- function owner. Repeated on every redefinition because Supabase's default
-- privileges re-grant EXECUTE to `anon` whenever a function is created, which
-- is how production came to have `anon=X` on `_vendors_public_match` despite
-- the revoke 0722 ends with.
revoke execute on function
  public._vendors_public_match(text, text, text, numeric, numeric, numeric),
  public._events_public_match(text, text, text, text, numeric, numeric, text)
from public, anon, authenticated;
