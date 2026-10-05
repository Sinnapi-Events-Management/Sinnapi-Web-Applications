-- =====================================================================
-- Sinnapi — 1005 Any-word fallback for the public search predicates
--
-- WHY THIS EXISTS
-- Both public search predicates turn the visitor's text into prefix terms
-- ANDed together — "fruit cake" becomes 'fruit:* & cake:*' — so a row has to
-- carry *every* word to match. That is the right first answer and it stays the
-- first answer here. But it is a cliff: the moment one word is absent the grid
-- goes to zero and says nothing about which word was the problem, which on
-- /vendors is most of what two-word searches do ("fruit cake" misses a baker
-- listed as "Nungi cakes — fruit, vanilla" only because of how her categories
-- are worded).
--
-- So an all-words miss now retries with the same terms ORed, and keeps only the
-- rows that matched the *most* words. "fruit cake" therefore surfaces the rows
-- carrying both-but-one rather than an empty grid, and a row matching one word
-- out of three never outranks one matching two.
--
-- The relaxed pass is deliberately second and conditional:
--   * it never runs for a single-word search, where AND and OR are the same
--     query;
--   * it never runs when the strict pass found anything, so a precise search
--     can never be diluted by near-misses;
--   * it narrows by exactly the same facets, so it can only widen the *text*
--     match, never reach outside the category/region/budget the visitor chose.
--
-- Each branch repeats the non-text predicates rather than sharing a CTE, which
-- is duplication with a reason: a shared `eligible` CTE materialises every
-- active row before the text match and throws away the GIN index that makes the
-- common single-word search fast. The two blocks must stay in lockstep — the
-- facet rules they encode are documented in 0722 and are not restated here.
--
-- `create or replace`, so the existing grants (revoked from anon/authenticated;
-- reachable only through the SECURITY DEFINER wrappers) carry over untouched.
-- Signatures, arguments and return types are unchanged: no caller, cache key or
-- URL is affected.
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
language sql stable security definer set search_path = public as $$
  with args as (
    select
      nullif(btrim(coalesce(p_q, '')), '')        as q,
      nullif(btrim(coalesce(p_category, '')), '') as category,
      nullif(btrim(coalesce(p_region, '')), '')   as region
  ), tsq as (
    -- Input is stripped to alphanumerics first, so nothing a visitor types can
    -- reach `to_tsquery` as syntax (it throws on operators like `&` or `!`,
    -- which would otherwise turn a stray character in a search box into an
    -- error page). Every token becomes a prefix term, because the grid
    -- re-queries as the visitor types and a half-typed word has to match.
    select
      a.q,
      tok.tokens,
      nullif((select string_agg(t || ':*', ' & ') from unnest(tok.tokens) t), '') as all_query,
      nullif((select string_agg(t || ':*', ' | ') from unnest(tok.tokens) t), '') as any_query,
      coalesce(array_length(tok.tokens, 1), 0) > 1                                as multi_word
    from args a
    cross join lateral (
      select array_remove(
        string_to_array(
          btrim(regexp_replace(lower(coalesce(a.q, '')), '[^a-z0-9]+', ' ', 'g')), ' '),
        '') as tokens
    ) tok
  ), strict as (
    -- Unchanged from 0722: every word must match, via the prefix query or a
    -- trigram ILIKE on the two columns a prefix query can't reach infixes in.
    select v.id
    from public.vendors v, args a, tsq t
    where v.status = 'active'
      and v.visibility = 'public'
      and v.deleted_at is null
      and (a.q is null
           or (t.all_query is not null and v.search_tsv @@ to_tsquery('simple', t.all_query))
           or v.business_name ilike '%' || a.q || '%'
           or v.base_city ilike '%' || a.q || '%')
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
    -- each row actually matched. The `not exists` is uncorrelated, so it is
    -- evaluated once: on a search that found something this branch is skipped
    -- outright rather than computed and discarded.
    select
      v.id,
      (select count(*)
         from unnest(t.tokens) w
        where v.search_tsv @@ to_tsquery('simple', w || ':*')
           or v.business_name ilike '%' || w || '%'
           or v.base_city ilike '%' || w || '%') as hits
    from public.vendors v, args a, tsq t
    where t.multi_word
      and t.any_query is not null
      and not exists (select 1 from strict)
      and v.status = 'active'
      and v.visibility = 'public'
      and v.deleted_at is null
      and (v.search_tsv @@ to_tsquery('simple', t.any_query)
           or exists (
             select 1
             from unnest(t.tokens) w
             where v.business_name ilike '%' || w || '%'
                or v.base_city ilike '%' || w || '%'
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
  )
  select id from strict
  union all
  -- Best tier only. Ordering is the caller's business (the visitor's chosen
  -- sort), so relevance is expressed by what the fallback *admits* rather than
  -- by an ORDER BY the grid would immediately override.
  select id from relaxed where hits = (select max(hits) from relaxed);
$$;

-- ---------------------------------------------------------------------
-- _events_public_match
-- The same treatment, over the occasion/source/town/budget/when facets. Last
-- redefined in 20260814000001 (occasion resolved through `event_types`); that
-- shape is preserved here verbatim.
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
language sql stable security definer set search_path = public as $$
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
      nullif((select string_agg(t || ':*', ' & ') from unnest(tok.tokens) t), '') as all_query,
      nullif((select string_agg(t || ':*', ' | ') from unnest(tok.tokens) t), '') as any_query,
      coalesce(array_length(tok.tokens, 1), 0) > 1                                as multi_word
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
      )
  ), relaxed as (
    select
      e.id,
      (select count(*)
         from unnest(t.tokens) w
        where e.search_tsv @@ to_tsquery('simple', w || ':*')
           or e.title ilike '%' || w || '%'
           or e.location ilike '%' || w || '%') as hits
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
             from unnest(t.tokens) w
             where e.title ilike '%' || w || '%'
                or e.location ilike '%' || w || '%'
           ))
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
      )
  )
  select id from strict
  union all
  select id from relaxed where hits = (select max(hits) from relaxed);
$$;
