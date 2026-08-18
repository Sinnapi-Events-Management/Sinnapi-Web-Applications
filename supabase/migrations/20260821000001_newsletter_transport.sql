-- =====================================================================
-- Sinnapi — 0821a Newsletter transport swap: reporting + recount
--
-- CONTEXT
-- Campaign delivery moves from the Resend HTTP API to the platform's existing
-- SMTP connection while that account is unavailable, behind the driver switch
-- in `supabase/functions/_shared/campaignTransport.ts`. The move is temporary
-- and explicitly reversible by environment variable, so NOTHING here removes
-- telemetry: `newsletter_events`, every engagement column on
-- `newsletter_recipients`, and the `newsletter-webhook` endpoint all stay
-- exactly as they are. Campaigns sent over SMTP simply never populate them,
-- and campaigns sent after the rollback populate them again.
--
-- WHAT THIS MIGRATION ACTUALLY CHANGES
-- Two things the transport swap exposed, both of which outlive it:
--
--   1. `skipped` was invisible in the stats RPC. The worker moves a recipient
--      to `skipped` when the address is suppressed at send time or has no
--      unsubscribe token, so `total` has never equalled queued + sent + failed
--      and the difference had no name on the screen. That gap widens under
--      SMTP, because send-time bounce suppression now lands mid-campaign and
--      skips the remaining rows for that address. An operator asking "we
--      queued 4,000, why did 3,860 send?" deserves the answer in the panel
--      rather than in a SQL console.
--
--   2. Queueing a campaign was quadratic. `tg_newsletter_recount` was an
--      AFTER ... FOR EACH ROW trigger that re-aggregated every recipient of
--      the campaign on each row, and `admin_newsletter_queue` inserts the
--      whole audience in ONE statement. A 50,000-recipient campaign therefore
--      ran 50,000 full aggregates over a table with no index on
--      `campaign_id` — 2.5 billion row visits to maintain three counters that
--      only need computing once. It is fixed here rather than in a separate
--      pass because the SMTP driver's smaller batches multiply the same
--      trigger across many more statements during the send, and because a
--      queue that times out is the failure mode most likely to be blamed on
--      the transport change.
--
-- DROP-THEN-CREATE
-- Every function below is dropped by full signature before it is recreated.
-- `create or replace` cannot change a function's OUT columns, so the stats RPC
-- would fail against the deployed version with a "cannot change return type"
-- error partway through the file — leaving some objects updated and some not.
-- Dropping first makes the migration total.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Missing index
--
-- Nothing indexed `campaign_id` on its own. The three partial/secondary indexes
-- that exist cover the worker's queued-row claim, lookups by email, and webhook
-- lookups by provider id — none of which help an aggregate over ALL statuses of
-- one campaign, which is what both the recount and the stats RPC do.
--
-- `(campaign_id, status)` rather than `(campaign_id)` so the `filter (where
-- status = ...)` clauses below are answered from the index without visiting the
-- heap.
-- ---------------------------------------------------------------------
create index if not exists ix_newsletter_recipients_campaign_status
  on public.newsletter_recipients(campaign_id, status);

-- ---------------------------------------------------------------------
-- tg_newsletter_recount — now statement-level.
--
-- Same counters, same filters, same semantics as before: `sent_count` counts
-- everything that reached the transport (including bounced and complained,
-- because those are messages we did hand over), `failed_count` counts rows we
-- could not hand over at all. Only the number of times the aggregate runs
-- changes — once per statement instead of once per row.
--
-- Postgres forbids transition tables on a trigger declared for more than one
-- event, so this is three triggers over one function rather than one trigger.
-- The function branches on TG_OP and touches only the transition table that
-- exists for the event that fired it; referencing the other would raise.
--
-- It also forbids transition tables on a trigger with a column list, so the
-- original `after update OF status` cannot be expressed. The filter moves into
-- the function instead — the UPDATE branch joins the two transition tables and
-- keeps only rows whose status actually changed. That matters during a send:
-- the worker writes `available_at`, `attempts`, `error` and
-- `provider_message_id` on rows whose status is unchanged, and re-aggregating
-- on those would undo the point of this migration. Comparing inside the
-- function is cheap because a transition table holds only the rows of the
-- statement that fired it, which for the worker is one.
--
-- Still SECURITY DEFINER: the worker writes recipient rows through the service
-- role, but the queue RPC runs definer-side as the calling admin, and the
-- campaign row it must update is behind `marketing.manage` RLS.
-- ---------------------------------------------------------------------
drop trigger if exists trg_newsletter_recount     on public.newsletter_recipients;
drop trigger if exists trg_newsletter_recount_ins on public.newsletter_recipients;
drop trigger if exists trg_newsletter_recount_del on public.newsletter_recipients;
drop trigger if exists trg_newsletter_recount_upd on public.newsletter_recipients;
drop function if exists public.tg_newsletter_recount();

create function public.tg_newsletter_recount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaigns uuid[];
begin
  -- Collect the campaigns this statement touched. A statement almost always
  -- touches exactly one, but a delete cascading across campaigns is legal and
  -- must not silently leave the others' counters stale.
  if tg_op = 'INSERT' then
    select array_agg(distinct campaign_id) into v_campaigns from new_rows;
  elsif tg_op = 'DELETE' then
    select array_agg(distinct campaign_id) into v_campaigns from old_rows;
  else
    -- Only rows whose status moved can move a counter. This replaces the
    -- `of status` column list the original trigger carried, which transition
    -- tables are not allowed to coexist with.
    select array_agg(distinct n.campaign_id) into v_campaigns
      from new_rows n
      join old_rows o on o.id = n.id
     where n.status is distinct from o.status;
  end if;

  if v_campaigns is null then
    return null;
  end if;

  -- LEFT JOIN from the campaign ids, not a filtered aggregate grouped by
  -- campaign. A plain `group by` emits no row for a campaign that now has zero
  -- recipients, so the UPDATE would match nothing and leave the previous counts
  -- standing. That is not hypothetical: `admin_newsletter_queue` deletes every
  -- recipient of a campaign before re-inserting the resolved audience, so a
  -- re-queue that resolves to nobody (everyone suppressed since last time)
  -- would otherwise keep reporting the old campaign's reach.
  --
  -- `count(r.id)` rather than `count(*)`, for the same reason: `count(*)` over
  -- a non-matching LEFT JOIN row returns 1, not 0.
  update public.newsletter_campaigns c
     set recipient_count = agg.total,
         sent_count      = agg.sent,
         failed_count    = agg.failed
  from (
    select
      ids.campaign_id,
      count(r.id)                                                           as total,
      count(r.id) filter (where r.status in ('sent','delivered','opened','clicked',
                                             'bounced','complained'))       as sent,
      count(r.id) filter (where r.status = 'failed')                        as failed
    from unnest(v_campaigns) as ids(campaign_id)
    left join public.newsletter_recipients r on r.campaign_id = ids.campaign_id
    group by ids.campaign_id
  ) agg
  where c.id = agg.campaign_id;

  return null;
end;
$$;

create trigger trg_newsletter_recount_ins
  after insert on public.newsletter_recipients
  referencing new table as new_rows
  for each statement execute function public.tg_newsletter_recount();

create trigger trg_newsletter_recount_del
  after delete on public.newsletter_recipients
  referencing old table as old_rows
  for each statement execute function public.tg_newsletter_recount();

-- No column list — see the note above. The status-changed filter lives in the
-- function's UPDATE branch instead.
create trigger trg_newsletter_recount_upd
  after update on public.newsletter_recipients
  referencing old table as old_rows new table as new_rows
  for each statement execute function public.tg_newsletter_recount();

-- ---------------------------------------------------------------------
-- admin_newsletter_stats — adds `skipped`.
--
-- Rates are still computed against `delivered`, not `sent`: rating a campaign
-- against messages that bounced flatters it, and the number is meant to inform
-- a decision. On an SMTP-sent campaign `delivered` is 0 and every rate is
-- therefore undefined rather than zero — the UI shows the raw count with no
-- percentage, which is the honest rendering of "this transport does not report
-- delivery" and the reason the columns were kept rather than repurposed.
--
-- `skipped` is a first-class outcome, not a rounding error: it is the count of
-- people the campaign deliberately did NOT mail because consent had been
-- withdrawn or an unsubscribe token was missing. That is the number that
-- evidences the suppression path actually working.
-- ---------------------------------------------------------------------
drop function if exists public.admin_newsletter_stats(uuid);

create function public.admin_newsletter_stats(p_campaign_id uuid)
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
  skipped      bigint,
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
    count(*) filter (where r.status = 'skipped'),
    (select count(*) from public.newsletter_events e
      where e.campaign_id = p_campaign_id and e.event_type = 'unsubscribed')
  from public.newsletter_recipients r
  where r.campaign_id = p_campaign_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Grants
--
-- Re-granted because the DROP above took the old grant with it. The function
-- re-checks `marketing.manage` itself: SECURITY DEFINER means the RLS policies
-- on `newsletter_recipients` no longer apply and that check is the only gate
-- left.
-- ---------------------------------------------------------------------
grant execute on function public.admin_newsletter_stats(uuid) to authenticated;
