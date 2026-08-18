-- =====================================================================
-- Sinnapi — 0816b Newsletter campaigns
--
-- WHAT A CAMPAIGN IS
-- One composed message, one audience (`clients` or `vendors`), sent once. It is
-- deliberately NOT a `notification_templates` row: those are keyed by trigger
-- and rendered per event forever, whereas a campaign is a dated artefact whose
-- value afterwards is the record of who it went to and what happened to it.
-- Conflating the two would mean either versioning transactional copy for no
-- reason or losing the send history, and we want neither.
--
-- WHY RECIPIENTS ARE MATERIALISED
-- `newsletter_recipients` is written when the campaign is queued, not resolved
-- at send time from a live query. Three reasons, in order of how much they hurt
-- when ignored:
--
--   1. Idempotency. The worker runs on a one-minute cron and can be re-entered
--      after a timeout. Sending from a live query means "everyone who matches"
--      is re-evaluated every pass, and a slow batch mails somebody twice. A row
--      per recipient with a status is the only structure where "already sent"
--      is a fact rather than an inference.
--   2. Evidence. "Who did we mail on the 4th" must survive a vendor later
--      changing category, unsubscribing, or deleting their account.
--   3. Consent is checked ONCE, at queue time, against the state the admin was
--      shown — and then again per row at send time. An address that unsubscribes
--      between queueing and sending is skipped, not mailed, because the send
--      loop re-reads suppression per batch.
--
-- SCHEDULING
-- `scheduled_at` plus a status of `scheduled` is the whole mechanism. The cron
-- worker claims campaigns whose time has come; there is no separate job table,
-- because a scheduled campaign that exists as a job row but not as a campaign
-- row is exactly the kind of split state that produces a send nobody can find.
-- Cancelling is a status flip, and the worker only ever claims `scheduled`, so
-- a cancel that lands mid-tick loses the race harmlessly rather than half-sending.
--
-- THE ATTESTATION COLUMNS
-- Manually typed addresses and spreadsheet uploads have no consent record in
-- `marketing_subscriptions` — that is what makes them useful and what makes them
-- a liability. The platform cannot verify the admin holds consent for a list
-- somebody pasted in, so it does the next best thing: it makes them say so, on
-- the record, with their name against it. `attested_by` is who answers for the
-- list if it turns out to be scraped.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'newsletter_audience') then
    create type newsletter_audience as enum ('clients', 'vendors');
  end if;
  if not exists (select 1 from pg_type where typname = 'newsletter_status') then
    create type newsletter_status as enum (
      'draft', 'scheduled', 'sending', 'sent', 'cancelled', 'failed'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'newsletter_recipient_status') then
    create type newsletter_recipient_status as enum (
      'queued', 'sent', 'delivered', 'opened', 'clicked',
      'bounced', 'complained', 'failed', 'skipped'
    );
  end if;
end
$$;

-- ---------------------------------------------------------------------
-- newsletter_campaigns
-- ---------------------------------------------------------------------
create table if not exists public.newsletter_campaigns (
  id              uuid primary key default gen_random_uuid(),

  -- Internal name, shown only in the admin list. Separate from `subject` so a
  -- campaign can be found by what it was for ("March vendor digest") rather
  -- than by the marketing line the recipients saw.
  title           text not null,
  subject         text not null,
  -- The hidden line mail clients show next to the subject. Left null it gets
  -- filled with the first words of the body, which is how "View in browser"
  -- ends up as the preview text on so much bulk mail.
  preheader       text,

  audience        newsletter_audience not null,
  topic           marketing_topic not null,

  -- The composed body, as an ordered array of typed blocks. JSON rather than
  -- HTML on purpose: the renderer maps each block onto the vetted, Outlook-safe
  -- helpers in `_shared/emailTemplate.ts`, so no operator-authored markup ever
  -- reaches a mailbox and there is no HTML-injection surface in the composer.
  blocks          jsonb not null default '[]'::jsonb,

  status          newsletter_status not null default 'draft',
  scheduled_at    timestamptz,
  started_at      timestamptz,
  completed_at    timestamptz,
  error           text,

  -- Denormalised counters. Maintained by trigger from `newsletter_recipients`
  -- so the list page can show progress without an aggregate per row.
  recipient_count integer not null default 0,
  sent_count      integer not null default 0,
  failed_count    integer not null default 0,

  -- Ad-hoc list attestation — see the header note.
  attested_by     uuid references public.profiles(id),
  attested_at     timestamptz,

  locale          text not null default 'en',

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id),
  updated_by      uuid references public.profiles(id),
  version         integer not null default 1,

  -- A scheduled campaign with no time is a campaign that never sends and never
  -- reports why. The constraint makes that state unrepresentable.
  constraint ck_newsletter_scheduled_has_time
    check (status <> 'scheduled' or scheduled_at is not null)
);

create index if not exists ix_newsletter_status  on public.newsletter_campaigns(status, created_at desc);
-- The worker's claim query.
create index if not exists ix_newsletter_due
  on public.newsletter_campaigns(scheduled_at) where status = 'scheduled';

drop trigger if exists trg_updated_at on public.newsletter_campaigns;
create trigger trg_updated_at before update on public.newsletter_campaigns
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- newsletter_recipients
--
-- `email` is the identity, `profile_id` the optional link. Uploaded addresses
-- have no profile, and an address that later gains one must not silently become
-- a different recipient. The unique constraint on (campaign, email) is the
-- double-send guard: the same address typed manually AND present in the
-- selected audience collapses to one row rather than two messages.
-- ---------------------------------------------------------------------
create table if not exists public.newsletter_recipients (
  id                  uuid primary key default gen_random_uuid(),
  campaign_id         uuid not null references public.newsletter_campaigns(id) on delete cascade,
  profile_id          uuid references public.profiles(id) on delete set null,
  email               citext not null,
  full_name           text,

  status              newsletter_recipient_status not null default 'queued',
  -- The token the footer link is built from, copied at queue time. Stored per
  -- recipient so a send is reproducible: if the subscription is later rotated
  -- or deleted, the link in the mail that already went out still resolves.
  unsubscribe_token   text,
  provider_message_id text,
  error               text,
  attempts            integer not null default 0,
  available_at        timestamptz not null default now(),

  sent_at             timestamptz,
  delivered_at        timestamptz,
  opened_at           timestamptz,
  clicked_at          timestamptz,
  bounced_at          timestamptz,
  complained_at       timestamptz,

  created_at          timestamptz not null default now(),

  unique (campaign_id, email)
);

-- The worker's batch claim: queued rows for one campaign, oldest first.
create index if not exists ix_newsletter_recipients_claim
  on public.newsletter_recipients(campaign_id, available_at)
  where status = 'queued';
create index if not exists ix_newsletter_recipients_email
  on public.newsletter_recipients(email);
-- Webhook lookups arrive keyed by the provider's id and nothing else.
create index if not exists ix_newsletter_recipients_msg
  on public.newsletter_recipients(provider_message_id)
  where provider_message_id is not null;

-- ---------------------------------------------------------------------
-- newsletter_events — raw provider telemetry, append-only.
--
-- Kept alongside the rolled-up timestamps on the recipient row because the
-- rollup is lossy by design (one `opened_at`, not fourteen opens) and because a
-- deliverability problem is diagnosed from the provider's own words, not from
-- our interpretation of them.
-- ---------------------------------------------------------------------
create table if not exists public.newsletter_events (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid references public.newsletter_campaigns(id) on delete cascade,
  recipient_id uuid references public.newsletter_recipients(id) on delete cascade,
  email        citext,
  event_type   text not null,
  payload      jsonb,
  occurred_at  timestamptz not null default now()
);

create index if not exists ix_newsletter_events_campaign
  on public.newsletter_events(campaign_id, occurred_at desc);
create index if not exists ix_newsletter_events_recipient
  on public.newsletter_events(recipient_id);

-- ---------------------------------------------------------------------
-- Counter maintenance
--
-- A trigger rather than the worker updating counts itself: the worker is not
-- the only writer (the webhook moves rows to bounced/complained hours later),
-- and two writers maintaining the same counter is how counters drift.
--
-- `sent_count` counts everything that reached the provider — sent, delivered,
-- opened, clicked and, yes, bounced, because a bounce is a message we did send.
-- `failed_count` is ours: rows we could not hand over at all.
-- ---------------------------------------------------------------------
create or replace function public.tg_newsletter_recount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign uuid := coalesce(new.campaign_id, old.campaign_id);
begin
  update public.newsletter_campaigns c
     set recipient_count = agg.total,
         sent_count      = agg.sent,
         failed_count    = agg.failed
  from (
    select
      count(*)                                                              as total,
      count(*) filter (where status in ('sent','delivered','opened','clicked',
                                        'bounced','complained'))            as sent,
      count(*) filter (where status = 'failed')                             as failed
    from public.newsletter_recipients
    where campaign_id = v_campaign
  ) agg
  where c.id = v_campaign;

  return null;
end;
$$;

drop trigger if exists trg_newsletter_recount on public.newsletter_recipients;
create trigger trg_newsletter_recount
  after insert or delete or update of status on public.newsletter_recipients
  for each row execute function public.tg_newsletter_recount();

-- ---------------------------------------------------------------------
-- RLS
--
-- Marketing-only, all three tables, with no self-read policy: a recipient row
-- is not the recipient's data in any useful sense (they have the email), and
-- exposing it would leak `unsubscribe_token` to any authenticated session.
-- ---------------------------------------------------------------------
alter table public.newsletter_campaigns  enable row level security;
alter table public.newsletter_campaigns  force row level security;
alter table public.newsletter_recipients enable row level security;
alter table public.newsletter_recipients force row level security;
alter table public.newsletter_events     enable row level security;
alter table public.newsletter_events     force row level security;

drop policy if exists newsletter_campaigns_admin  on public.newsletter_campaigns;
drop policy if exists newsletter_recipients_admin on public.newsletter_recipients;
drop policy if exists newsletter_events_admin     on public.newsletter_events;

create policy newsletter_campaigns_admin on public.newsletter_campaigns
  for all to authenticated
  using (public.has_permission('marketing.manage'))
  with check (public.has_permission('marketing.manage'));

-- Select-only for the portal: rows are created by the queue RPC and moved by
-- the worker, both of which run definer-side. Nothing in the UI should be able
-- to mark a recipient sent.
create policy newsletter_recipients_admin on public.newsletter_recipients
  for select to authenticated
  using (public.has_permission('marketing.manage'));

create policy newsletter_events_admin on public.newsletter_events
  for select to authenticated
  using (public.has_permission('marketing.manage'));

-- ---------------------------------------------------------------------
-- Cron — the campaign worker.
--
-- Every minute, matching the outbox. A newsletter is not urgent, but the tick
-- rate is what bounds how long a large campaign takes overall: the worker sends
-- a bounded number of batches per invocation so it always returns well inside
-- the Edge Function timeout, and relies on being called again for the rest.
-- Cheap ticks that do nothing are the price of a send loop that cannot hang.
-- ---------------------------------------------------------------------
do $$
declare
  v_base text;
  v_key  text;
begin
  if to_regnamespace('cron') is null then
    raise notice 'pg_cron not installed; skipping newsletter schedule';
    return;
  end if;

  select decrypted_secret into v_base from vault.decrypted_secrets where name = 'functions_base_url' limit 1;
  select decrypted_secret into v_key  from vault.decrypted_secrets where name = 'service_role_key'   limit 1;
  if v_base is null or v_key is null then
    raise notice 'Vault secrets missing; skipping newsletter schedule';
    return;
  end if;

  perform cron.unschedule(jobid) from cron.job where jobname = 'sinnapi_newsletter';

  perform cron.schedule('sinnapi_newsletter', '* * * * *', format($f$
    select net.http_post(url:=%L, headers:=jsonb_build_object(
      'Content-Type','application/json','Authorization','Bearer '||%L), body:='{}'::jsonb);
  $f$, v_base || '/newsletter-dispatch', v_key));
end
$$;
