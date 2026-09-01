-- =====================================================================
-- Sinnapi — 0901f EVENT PLANNING: RLS, RBAC, copy and realtime
--
-- The two new tables were created after 0011's blanket "enable RLS on every
-- base table" loop ran, so they have no RLS and no policies at all — which,
-- under `force row level security`, is not "open", it is a table that is about
-- to be silently unreadable for the client whose budget it holds. This file
-- gives both the policies they should have had.
--
-- THE READ RULE FOR `event_requirements`, AND WHY IT IS OWNER-ONLY
-- The client who posted the event, and admins with `events.manage`. Nobody
-- else — specifically not the vendors quoting into the event.
--
-- That is stricter than it first looks reasonable to be, because a vendor DOES
-- need to know what the event needs of them. They get it from
-- `list_event_requirements_public` (0901d), which returns the category, the
-- title, the brief and the priority, and no money.
--
-- The reason for splitting it that way is that the rule here is column-level
-- and RLS is row-level. `allocated_amount` and the rollups built on it are the
-- client's negotiating position: a vendor who can see that 3m of a decor
-- allocation is unspent quotes 2.9m, and a client who sets a budget to plan
-- with has instead published a price floor. There is no policy that lets a
-- vendor read four columns of a row and not the fifth, so the vendor's view is
-- a function and the table itself stays shut.
-- =====================================================================

alter table public.event_requirements       enable row level security;
alter table public.event_requirements       force  row level security;
alter table public.event_budget_overrides   enable row level security;
alter table public.event_budget_overrides   force  row level security;

-- ---------------------------------------------------------------------
-- EVENT REQUIREMENTS
--
-- Read and write are separate policies rather than one FOR ALL, because they
-- are not the same rule: an admin holding `events.manage` may read a client's
-- plan to answer a support ticket, and may not rewrite the client's budget
-- while doing it. `events_owner_write` (0011) makes the opposite trade on
-- `events` itself; the difference is deliberate — an admin editing an event's
-- title is moderation, and an admin editing what a client set aside for
-- catering is not a thing anyone asked for.
--
-- The write policy carries the ownership test in BOTH `using` and `with check`,
-- so a client can neither move a line onto another client's event nor move one
-- of their own lines off it.
-- ---------------------------------------------------------------------
drop policy if exists event_requirements_read on public.event_requirements;
create policy event_requirements_read on public.event_requirements
  for select to authenticated
  using (
    exists (select 1 from public.events e
             where e.id = event_id and e.posted_by = auth.uid())
    or public.has_permission('events.manage')
  );

drop policy if exists event_requirements_write on public.event_requirements;
create policy event_requirements_write on public.event_requirements
  for all to authenticated
  using (
    exists (select 1 from public.events e
             where e.id = event_id and e.posted_by = auth.uid() and e.deleted_at is null)
  )
  with check (
    exists (select 1 from public.events e
             where e.id = event_id and e.posted_by = auth.uid() and e.deleted_at is null)
  );

-- ---------------------------------------------------------------------
-- BUDGET OVERRIDES — readable by the two parties to the decision, written by
-- nobody.
--
-- No insert, update or delete policy exists, and that is the point. The only
-- writer is `assert_event_budget`, which is SECURITY DEFINER and so bypasses
-- RLS; every other caller — including the client the row is about — has no
-- policy that admits a write and is refused by the default deny. A trail the
-- subject of the trail can add to is not a trail, and the append-only trigger
-- from 0901b closes the update and delete side even for a definer function.
--
-- `events.manage` reads it because "was this client warned before they
-- overspent" is a support and dispute question, and the client reads their own
-- because being able to see what you agreed to is the other half of consent.
-- ---------------------------------------------------------------------
drop policy if exists event_budget_overrides_read on public.event_budget_overrides;
create policy event_budget_overrides_read on public.event_budget_overrides
  for select to authenticated
  using (
    exists (select 1 from public.events e
             where e.id = event_id and e.posted_by = auth.uid())
    or public.has_permission('events.manage')
  );

-- ---------------------------------------------------------------------
-- The generic grants. 0011 grants table privileges to `authenticated` by
-- introspection at its own point in history, so tables added later need theirs
-- spelled out. RLS is what actually decides; these are the coarse gate in front
-- of it, and they are deliberately narrower than the policies:
-- `event_budget_overrides` gets SELECT only, so even a definer bug cannot make
-- the trail writable from a client session.
-- ---------------------------------------------------------------------
grant select, insert, update, delete on public.event_requirements to authenticated;
grant select on public.event_budget_overrides to authenticated;

-- =====================================================================
-- NOTIFICATION COPY
--
-- The three notifications this series raises. Written as templates so the
-- dispatcher can render them per channel and per locale, in the same shape
-- 0820d established.
--
-- All three are in-app only. None of them is a deadline: a vendor who is
-- invited has until the client books someone else, and a client whose event
-- attracted a new vendor is not being asked to do anything today. Email for
-- these would be the platform interrupting a plan neither party is late on.
-- =====================================================================
insert into public.notification_templates (trigger_key, channel, subject, body_template, locale) values
('event.interest_expressed', 'in_app', '{{vendor_name}} is interested in your event',
 'They can now send you a quote for “{{event_title}}”. You can shortlist them, or ask them for more detail first.', 'en'),

('event.vendor_invited', 'in_app', 'You have been invited to quote for an event',
 'The client is looking for {{requirement}} for “{{event_title}}”. Open the request to send them a price.', 'en'),

('event.interest_declined', 'in_app', 'A client has gone another way',
 'The client has chosen not to take this one forward for “{{event_title}}”. Any open quote for this event has been closed.', 'en')
on conflict (trigger_key, channel, locale) do update
  set subject       = excluded.subject,
      body_template = excluded.body_template,
      is_active     = true;

-- =====================================================================
-- RBAC — one permission, for the admin side of a client's plan
--
-- `events.manage` already exists and already governs the admin event pages, and
-- both policies above read it. Nothing new is needed for the client: their
-- authority over their own event comes from `events.posted_by`, which is
-- ownership rather than a role, and that is the right basis — a client is not a
-- privileged user, they are the subject of the row.
--
-- Super Admin's grant was a one-time cross join at seed time, so anything added
-- later needs backfilling. Re-run here for the same reason 0819a does it: it is
-- cheap, it is idempotent, and the alternative is a role that silently loses
-- coverage of whatever the last migration introduced.
-- =====================================================================
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r cross join public.permissions p
where r.key = 'super_admin'
on conflict do nothing;

-- =====================================================================
-- REALTIME
--
-- `event_requirements` joins the publication so a client planning on a laptop
-- with the event open on their phone sees the same figures. `event_interests`
-- has been in it since 0015, which is what makes the vendor board live.
--
-- `event_budget_overrides` is deliberately NOT published. Nothing watches it —
-- it is a record for later, not a signal for now — and a table whose whole
-- purpose is to be an audit trail has no business streaming to browsers.
-- =====================================================================
do $$ begin
  alter publication supabase_realtime add table public.event_requirements;
exception when duplicate_object then null; end $$;
