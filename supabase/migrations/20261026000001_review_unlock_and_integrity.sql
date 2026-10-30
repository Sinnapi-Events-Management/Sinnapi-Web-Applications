-- =====================================================================
-- Sinnapi — 1026a Reviews: the write path nobody could reach
--
-- WHAT WAS WRONG
-- `create_review` has existed since the 0618 baseline and has never been
-- called. A grep across all four apps returns the migration and nothing else.
-- So every surface that mentions a review is a surface that cannot produce one:
--
--   client /reviews              a read-only list of reviews the client has
--                                already left — which is always empty, because
--                                there is no composer anywhere
--   booking "Leave a review"     links to that empty list. The client taps it,
--                                reads "No reviews yet → View bookings", and
--                                arrives back where they started
--   vendor profile Reviews tab   an aggregate, plus a sentence saying written
--                                reviews are not shown. No way in.
--   vendor portal /reviews       a full workspace for reading and replying to
--                                reviews that can never exist
--   admin moderation             a queue for reports on reviews that can never
--                                exist
--
-- THE GATE WAS HELD BY THE WRONG PARTY
-- `create_review` required `bookings.status = 'completed'`, and `completed` is
-- reachable only through `complete_booking`, which admits the vendor owner and
-- `bookings.manage` — never the client. So the client's permission to speak
-- about a job was issued by the counterparty the review is about, and a vendor
-- who simply never pressed "Mark completed" silenced the client permanently.
-- Bookings sit in `in_progress` indefinitely for exactly that reason.
--
-- The gate becomes the client's own act instead: `in_progress` OR `completed`.
-- `start_booking` is callable by the client, already requires the event date to
-- have arrived and escrow to be funded, and means "my event is happening". A
-- client who has started their event has standing to rate it. `completed` stays
-- eligible so nothing that is reviewable today stops being so.
--
-- THE RLS WAS ADVISORY
-- `reviews_insert` checked `client_id = auth.uid()` and nothing else, so a
-- direct `POST /rest/v1/reviews` could name any `vendor_id` and any
-- `booking_id` and skip the RPC's gate entirely — a client could rate a vendor
-- they had never booked, as many times as there are vendors. `reviews_update`
-- was the same shape: it let the author rewrite `vendor_id`, `rating` and
-- `status`, which means moving a review onto another vendor's profile or
-- re-publishing one moderation had removed. Both are closed here, by a policy
-- that actually reads the booking and a BEFORE trigger that pins the columns a
-- client has no business setting.
--
-- EDITING, AND WHEN IT STOPS
-- A review is editable by its author until the vendor replies to it. A reply
-- quotes and answers the text beside it; letting the author rewrite that text
-- afterwards leaves the vendor publicly responding to words that are no longer
-- there. Before a reply there is nobody to strand, so the window is open. The
-- lock is derived from `review_responses` rather than stored, so the two can
-- never disagree.
--
-- WHAT THIS FILE PROVIDES
--   * review_is_locked              derived lock: has the vendor replied yet
--   * create_review                 re-gated, validating, and it notifies
--   * update_review                 the author's edit, inside the window
--   * respond_to_review             hardened; now tells the client
--   * get_my_review_queue           every booking the client may review, with
--                                   the review when there is one — the client
--                                   portal's whole Reviews page
--   * get_vendor_reviews            published reviews for one vendor, with the
--                                   reply, for the profile's Reviews tab
--   * get_my_vendor_review_state    whether THIS client may review THIS vendor
--   * tightened reviews_insert / reviews_update + tg_review_guard
--   * notification templates for review.received / review.replied
--
-- WHY THE READS ARE RPCs AND NOT TABLE SELECTS
-- `profiles_self_read` restricts `profiles` to the row you are. A per-vendor
-- review list has to print who wrote each review, so reading it through
-- PostgREST would return rows with an un-joinable `client_id` and nothing else
-- — which is why the profile tab never showed written reviews in the first
-- place. These functions are `security definer` and return a deliberately
-- narrow shape: a display name (first name, last initial) and an avatar, never
-- an email, a phone or a profile id.
-- =====================================================================


-- ---------------------------------------------------------------------
-- The statuses a booking must be in for its client to review it.
--
-- Written once, as a function, because four things downstream have to agree
-- with it exactly — the insert policy, the create RPC, the queue read and the
-- per-vendor eligibility read — and a repeated array literal is how the
-- `in_progress` drift in the original schema happened.
-- ---------------------------------------------------------------------
create or replace function public.review_eligible_statuses()
returns booking_status[] language sql immutable set search_path = public as $$
  select array['in_progress', 'completed']::booking_status[];
$$;

comment on function public.review_eligible_statuses() is
  'Booking statuses whose client may leave a review: the event has started, or it is done. '
  'Starting is the client''s own act, which is why it is the gate — completion is the vendor''s.';

grant execute on function public.review_eligible_statuses() to anon, authenticated;


-- ---------------------------------------------------------------------
-- Whether a review is still the author's to change.
--
-- Derived from the reply rather than stored as a column or a timestamp: a
-- stored `locked_at` would need a trigger on `review_responses` to stay true,
-- and the one thing worse than no lock is a lock that disagrees with the reply
-- it is supposed to be protecting.
-- ---------------------------------------------------------------------
create or replace function public.review_is_locked(p_review_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.review_responses
     where review_id = p_review_id and deleted_at is null
  );
$$;

comment on function public.review_is_locked(uuid) is
  'True once the vendor has replied. A reply answers the text beside it, so the author stops '
  'being able to rewrite that text the moment one exists.';

grant execute on function public.review_is_locked(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- How a reviewer is named in public.
--
-- First name plus last initial. The full name is the client's, given to us to
-- transact with a vendor, not to be published beside an opinion on a permanent
-- public profile; the bare initial is anonymous enough to be useless to a
-- reader weighing whether the review is real. This is the middle, and it is
-- what every marketplace the clients already use does.
-- ---------------------------------------------------------------------
create or replace function public.review_display_name(p_full_name text)
returns text language sql immutable set search_path = public as $$
  select case
    when coalesce(btrim(p_full_name), '') = '' then 'A client'
    when array_length(regexp_split_to_array(btrim(p_full_name), '\s+'), 1) = 1
      then (regexp_split_to_array(btrim(p_full_name), '\s+'))[1]
    else (regexp_split_to_array(btrim(p_full_name), '\s+'))[1] || ' '
         || upper(left((regexp_split_to_array(btrim(p_full_name), '\s+'))[
              array_length(regexp_split_to_array(btrim(p_full_name), '\s+'), 1)], 1)) || '.'
  end;
$$;

comment on function public.review_display_name(text) is
  'A reviewer''s name as it appears in public: first name + last initial.';

grant execute on function public.review_display_name(text) to anon, authenticated;


-- =====================================================================
-- THE WRITES
-- =====================================================================

-- ---------------------------------------------------------------------
-- create_review — the client's rating, which until now had no caller.
--
-- Changes against the 0618 version, in order of how much they matter:
--
--   the gate      `in_progress` or `completed`, per the note at the top of
--                 this file, instead of `completed` alone.
--   the lock      `for update` on the booking. Two taps on a slow connection
--                 raced the unique index and surfaced a raw 23505 to the
--                 client; now the second waits and is told it already exists.
--   validation    rating 1..5 and the text lengths are checked here rather
--                 than left to a check constraint and a 22001, because this is
--                 a form a person is filling in.
--   soft-delete   a deleted booking is not reviewable. The original read the
--                 row with no `deleted_at` filter at all.
--   the notify    the vendor is told. A review that reaches a vendor only when
--                 they next open their dashboard is a review they answer a
--                 week late, and the reply window is what closes the client's
--                 edit window — so silence here stalls both sides.
--
-- `published` on insert is unchanged and deliberate: the score moves at once,
-- `review_reports` is the moderation path, and a pending queue would mean every
-- rating on the platform waits on an operator.
-- ---------------------------------------------------------------------
create or replace function public.create_review(
  p_booking_id uuid,
  p_rating     int,
  p_title      text default null,
  p_body       text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  b        public.bookings;
  v_id     uuid;
  v_owner  uuid;
  v_title  text := nullif(btrim(coalesce(p_title, '')), '');
  v_body   text := nullif(btrim(coalesce(p_body, '')), '');
begin
  -- `for update` makes the double-tap wait rather than race the unique index.
  select * into b from public.bookings
   where id = p_booking_id and deleted_at is null
     for update;
  if b.id is null then raise exception 'not_found'; end if;
  if b.client_id <> auth.uid() then perform public._forbidden(); end if;

  if b.status <> all (public.review_eligible_statuses()) then
    raise exception 'booking_not_reviewable';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'rating_out_of_range';
  end if;
  if length(coalesce(v_title, '')) > 120 then raise exception 'review_title_too_long'; end if;
  if length(coalesce(v_body, '')) > 2000 then raise exception 'review_body_too_long'; end if;

  -- Checked explicitly so the second submission gets a sentence instead of a
  -- unique-violation. `ux_reviews_booking` remains the enforcement.
  if exists (select 1 from public.reviews where booking_id = p_booking_id) then
    raise exception 'review_already_exists';
  end if;

  insert into public.reviews(
    vendor_id, client_id, booking_id, rating, title, body, status, created_by, updated_by)
  values (b.vendor_id, auth.uid(), p_booking_id, p_rating, v_title, v_body,
          'published', auth.uid(), auth.uid())
  returning id into v_id;

  select owner_id into v_owner from public.vendors where id = b.vendor_id;
  perform public.notify_party(
    'review.received', v_owner, 'vendor', 'reviews', v_id,
    jsonb_build_object(
      'review_id',    v_id,
      'booking_id',   b.id,
      'reference_no', b.reference_no,
      'booking_ref',  b.reference_no,
      'vendor_id',    b.vendor_id,
      'client_id',    b.client_id,
      'rating',       p_rating,
      'review_title', coalesce(v_title, '(no headline)')));

  return v_id;
end;$$;

comment on function public.create_review(uuid, int, text, text) is
  'The client''s rating of a booking whose event has started or finished. One per booking; '
  'published immediately; notifies the vendor.';

grant execute on function public.create_review(uuid, int, text, text) to authenticated;


-- ---------------------------------------------------------------------
-- update_review — the author's own correction, while the window is open.
--
-- Three columns and nothing else. The author does not get to move the review
-- to another vendor, re-point it at another booking, or change its `status`,
-- which is moderation's column — and since the client portal reaches this table
-- directly for its own reads, those are reachable writes, not hypotheticals.
-- `tg_review_guard` below enforces the same list for anything that bypasses
-- this function.
-- ---------------------------------------------------------------------
create or replace function public.update_review(
  p_review_id uuid,
  p_rating    int,
  p_title     text default null,
  p_body      text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  rv      public.reviews;
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_body  text := nullif(btrim(coalesce(p_body, '')), '');
begin
  select * into rv from public.reviews
   where id = p_review_id and deleted_at is null
     for update;
  if rv.id is null then raise exception 'not_found'; end if;
  if rv.client_id <> auth.uid() then perform public._forbidden(); end if;

  -- Moderation has had its say. The author does not get to edit their way back
  -- onto the profile.
  if rv.status <> 'published' then raise exception 'review_not_editable'; end if;

  if public.review_is_locked(p_review_id) then
    raise exception 'review_locked_by_reply';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'rating_out_of_range';
  end if;
  if length(coalesce(v_title, '')) > 120 then raise exception 'review_title_too_long'; end if;
  if length(coalesce(v_body, '')) > 2000 then raise exception 'review_body_too_long'; end if;

  update public.reviews
     set rating     = p_rating,
         title      = v_title,
         body       = v_body,
         -- Stamped only when something actually changed, so an opened-and-saved
         -- dialog does not label the review "edited" for the rest of its life.
         edited_at  = case
                        when rv.rating is distinct from p_rating
                          or rv.title  is distinct from v_title
                          or rv.body   is distinct from v_body
                        then now() else rv.edited_at
                      end,
         updated_by = auth.uid()
   where id = p_review_id;
end;$$;

comment on function public.update_review(uuid, int, text, text) is
  'The author''s edit of their own published review, allowed until the vendor replies.';

grant execute on function public.update_review(uuid, int, text, text) to authenticated;


-- ---------------------------------------------------------------------
-- respond_to_review — the vendor's reply, which was silent and unguarded.
--
-- It would happily reply to a review moderation had removed, and it told the
-- client nothing — so a vendor answering a complaint well got no credit for it
-- and the client never saw the answer. The reply is also what ends the client's
-- edit window, which makes telling them it happened the minimum.
-- ---------------------------------------------------------------------
create or replace function public.respond_to_review(p_review_id uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare
  rv      public.reviews;
  v_body  text := nullif(btrim(coalesce(p_body, '')), '');
  v_ref   text;
begin
  select * into rv from public.reviews
   where id = p_review_id and deleted_at is null
     for update;
  if rv.id is null then raise exception 'not_found'; end if;
  if not public.is_vendor_owner(rv.vendor_id) then perform public._forbidden(); end if;

  -- Replying to a removed review would publish the vendor's half of a
  -- conversation whose other half moderation has taken down.
  if rv.status <> 'published' then raise exception 'review_not_answerable'; end if;

  if v_body is null then raise exception 'reply_required'; end if;
  if length(v_body) > 2000 then raise exception 'reply_too_long'; end if;

  insert into public.review_responses(review_id, vendor_id, body)
  values (p_review_id, rv.vendor_id, v_body)
  on conflict (review_id) where (deleted_at is null)
  do update set body = excluded.body, edited_at = now();

  select reference_no into v_ref from public.bookings where id = rv.booking_id;

  perform public.notify_party(
    'review.replied', rv.client_id, 'client', 'reviews', rv.id,
    jsonb_build_object(
      'review_id',    rv.id,
      'booking_id',   rv.booking_id,
      'reference_no', v_ref,
      'booking_ref',  v_ref,
      'vendor_id',    rv.vendor_id,
      'client_id',    rv.client_id,
      'rating',       rv.rating));
end;$$;

comment on function public.respond_to_review(uuid, text) is
  'The vendor''s public reply to a published review. Notifies the client, and ends their edit '
  'window — see review_is_locked.';

grant execute on function public.respond_to_review(uuid, text) to authenticated;


-- =====================================================================
-- THE READS
-- =====================================================================

-- ---------------------------------------------------------------------
-- get_my_review_queue — the client portal's Reviews page, in one call.
--
-- Every booking this client may review, whether or not they have. One query
-- rather than two because the page shows them as one list split in two: what
-- is still owed, and what has been said. Splitting it server-side would mean
-- the "awaiting" count and the "yours" list could disagree after a submit.
--
-- `review_id is null` is what makes a row an outstanding one, so the client
-- portal never has to subtract one list from the other.
-- ---------------------------------------------------------------------
create or replace function public.get_my_review_queue()
returns table (
  booking_id         uuid,
  reference_no       text,
  booking_status     text,
  event_date         date,
  started_at         timestamptz,
  completed_at       timestamptz,
  amount             numeric,
  currency           text,
  vendor_id          uuid,
  vendor_name        text,
  vendor_slug        text,
  vendor_image_url   text,
  event_id           uuid,
  event_title        text,
  review_id          uuid,
  rating             int,
  review_title       text,
  review_body        text,
  review_status      text,
  review_created_at  timestamptz,
  review_edited_at   timestamptz,
  is_locked          boolean,
  reply_body         text,
  reply_at           timestamptz
) language sql stable security definer set search_path = public as $$
  select
    b.id,
    b.reference_no,
    b.status::text,
    b.event_date,
    b.started_at,
    b.completed_at,
    b.amount,
    b.currency,
    v.id,
    v.business_name,
    v.slug,
    coalesce(v.profile_image_url, v.primary_image_url),
    e.id,
    e.title,
    r.id,
    r.rating,
    r.title,
    r.body,
    r.status::text,
    r.created_at,
    r.edited_at,
    -- A row with no review is not "unlocked", it is unwritten. False keeps the
    -- column boolean for the caller either way.
    (rr.id is not null),
    rr.body,
    coalesce(rr.edited_at, rr.created_at)
  from public.bookings b
  join public.vendors v on v.id = b.vendor_id
  left join public.events e on e.id = b.event_id
  left join public.reviews r
         on r.booking_id = b.id and r.deleted_at is null
  left join public.review_responses rr
         on rr.review_id = r.id and rr.deleted_at is null
  where b.client_id = auth.uid()
    and b.deleted_at is null
    and b.status = any (public.review_eligible_statuses())
  order by
    -- Unreviewed first: the page's job is the thing still owed. Within each
    -- group, most recent event first.
    (r.id is null) desc,
    b.event_date desc nulls last,
    b.created_at desc;
$$;

comment on function public.get_my_review_queue() is
  'Every booking the signed-in client may review, with its review and the vendor''s reply when '
  'they exist. `review_id is null` marks one still outstanding.';

grant execute on function public.get_my_review_queue() to authenticated;


-- ---------------------------------------------------------------------
-- get_vendor_reviews — the written reviews a vendor profile could never show.
--
-- Published, undeleted, newest first, with the vendor's reply attached and the
-- author named through `review_display_name`. Granted to `anon` as well as
-- `authenticated`: the public site shows the same aggregate and will want the
-- same list, and a signed-out visitor reading reviews is the entire point of
-- having them.
--
-- Paged, because a vendor with four hundred reviews should not send four
-- hundred rows to render the first ten.
-- ---------------------------------------------------------------------
create or replace function public.get_vendor_reviews(
  p_vendor_id uuid,
  p_limit     int default 10,
  p_offset    int default 0)
returns table (
  review_id      uuid,
  rating         int,
  title          text,
  body           text,
  created_at     timestamptz,
  edited_at      timestamptz,
  author_name    text,
  author_avatar  text,
  reply_body     text,
  reply_at       timestamptz,
  total_count    bigint
) language sql stable security definer set search_path = public as $$
  with published as (
    select r.*
      from public.reviews r
     where r.vendor_id = p_vendor_id
       and r.status = 'published'
       and r.deleted_at is null
  )
  select
    p.id,
    p.rating,
    p.title,
    p.body,
    p.created_at,
    p.edited_at,
    public.review_display_name(pr.full_name),
    pr.avatar_url,
    rr.body,
    coalesce(rr.edited_at, rr.created_at),
    -- The unpaged total rides along on every row, so the "showing 10 of 48"
    -- line and the rows it describes can never come from two different reads.
    (select count(*) from published)
  from published p
  left join public.profiles pr on pr.id = p.client_id
  left join public.review_responses rr
         on rr.review_id = p.id and rr.deleted_at is null
  order by p.created_at desc
  limit greatest(coalesce(p_limit, 10), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

comment on function public.get_vendor_reviews(uuid, int, int) is
  'Published reviews for one vendor with the vendor''s reply, paged. The author is named as '
  'first name + last initial; no profile id, email or phone leaves this function.';

grant execute on function public.get_vendor_reviews(uuid, int, int) to anon, authenticated;


-- ---------------------------------------------------------------------
-- get_my_vendor_review_state — may THIS client review THIS vendor, and why not.
--
-- The vendor profile is where clients expect to review from, so the Reviews tab
-- needs an answer for every visitor, not just the eligible one: a client with a
-- startable booking has to be told to start it, a client with a confirmed
-- booking weeks out has to be told when it opens, and a visitor with no booking
-- has to be told that reviews come from bookings. A boolean cannot say any of
-- that, so this returns the booking it is talking about and a reason token the
-- UI turns into a sentence.
--
-- One row, always. The booking chosen is the one the client would most likely
-- act on: an outstanding eligible one first, then an already-reviewed one (so
-- the tab can offer the edit), then the nearest booking that is not eligible
-- yet (so the tab can explain the wait).
--
-- `review_status` is returned as well as read. The CTE has always selected it
-- and the row used to drop it, which left the client's own review reported as
-- `already_reviewed` even after moderation had unpublished it — so the profile
-- offered a Change button that `update_review` then refused with
-- `review_not_editable`, and offered it over a review no longer on the profile
-- at all. The author's own edit gate is `status = 'published' and not locked`,
-- so the UI needs both halves to decline in advance rather than after a round
-- trip.
--
-- Dropped before it is created: this function gained that column after it had
-- already been applied in some environments, and Postgres refuses a `create or
-- replace` that changes a function's OUT parameters.
-- ---------------------------------------------------------------------
drop function if exists public.get_my_vendor_review_state(uuid);

create or replace function public.get_my_vendor_review_state(p_vendor_id uuid)
returns table (
  can_review      boolean,
  reason          text,
  booking_id      uuid,
  reference_no    text,
  booking_status  text,
  event_date      date,
  event_title     text,
  review_id       uuid,
  rating          int,
  review_title    text,
  review_body     text,
  review_status   text,
  is_locked       boolean
) language sql stable security definer set search_path = public as $$
  with mine as (
    select b.id, b.reference_no, b.status, b.event_date, b.event_id,
           r.id as review_id, r.rating, r.title as review_title, r.body as review_body,
           r.status as review_status,
           (rr.id is not null) as is_locked,
           (b.status = any (public.review_eligible_statuses())) as eligible
      from public.bookings b
      left join public.reviews r
             on r.booking_id = b.id and r.deleted_at is null
      left join public.review_responses rr
             on rr.review_id = r.id and rr.deleted_at is null
     where b.vendor_id = p_vendor_id
       and b.client_id = auth.uid()
       and b.deleted_at is null
       and b.status <> all (array['cancelled', 'declined']::booking_status[])
  ),
  -- Every reference below is qualified, including in ORDER BY. `review_id`,
  -- `event_date` and `rating` are also OUT parameter names on this function,
  -- and a bare one in here resolves to the parameter rather than the column.
  pick as (
    select m.* from mine m
     order by
       -- eligible and unreviewed is the one the client can act on now
       (m.eligible and m.review_id is null) desc,
       -- then the one they have already written, so the tab can offer an edit
       (m.review_id is not null) desc,
       -- then the soonest booking that is not open yet, to explain the wait
       m.event_date asc nulls last
     limit 1
  )
  select
    coalesce(p.eligible and p.review_id is null, false),
    case
      when p.id is null                            then 'no_booking'
      when p.review_id is not null and p.is_locked then 'already_reviewed_locked'
      when p.review_id is not null                 then 'already_reviewed'
      when p.eligible                              then 'eligible'
      when p.status = 'requested'                  then 'booking_not_confirmed'
      else                                              'event_not_started'
    end,
    p.id, p.reference_no, p.status::text, p.event_date, e.title,
    p.review_id, p.rating, p.review_title, p.review_body, p.review_status,
    coalesce(p.is_locked, false)
  from (select 1) _
  left join pick p on true
  left join public.events e on e.id = p.event_id;
$$;

comment on function public.get_my_vendor_review_state(uuid) is
  'Whether the signed-in client may review this vendor, the booking that decides it, their '
  'existing review with its moderation status if any, and a reason token when they may not. '
  'Always one row.';

grant execute on function public.get_my_vendor_review_state(uuid) to authenticated;


-- =====================================================================
-- INTEGRITY: the policies, and the trigger behind them
-- =====================================================================

-- ---------------------------------------------------------------------
-- tg_review_guard — the columns a client may never set, wherever the write
-- came from.
--
-- A policy cannot restrict *columns*, only rows, so `reviews_update` admitting
-- the author necessarily admitted the author's `status`, `vendor_id` and
-- `booking_id` too. This trigger is what makes "the author may edit their
-- rating and their words" the actual rule rather than the intended one.
--
-- Moderators are exempt: `status` and `moderation_status` are precisely the
-- columns their job consists of.
-- ---------------------------------------------------------------------
create or replace function public.tg_review_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- The service role runs migrations, backfills and the moderation console's
  -- own definer functions. It is not a client.
  if auth.uid() is null or public.has_permission('moderation.manage') then
    return new;
  end if;

  if new.vendor_id  is distinct from old.vendor_id
     or new.client_id  is distinct from old.client_id
     or new.booking_id is distinct from old.booking_id then
    raise exception 'review_identity_immutable';
  end if;

  if new.status is distinct from old.status
     or new.moderation_status is distinct from old.moderation_status then
    raise exception 'review_status_not_yours';
  end if;

  -- The edit window, enforced for direct table writes exactly as
  -- `update_review` enforces it for the RPC.
  if (new.rating is distinct from old.rating
      or new.title is distinct from old.title
      or new.body is distinct from old.body)
     and public.review_is_locked(new.id) then
    raise exception 'review_locked_by_reply';
  end if;

  return new;
end;$$;

drop trigger if exists trg_review_guard on public.reviews;
create trigger trg_review_guard
  before update on public.reviews
  for each row execute function public.tg_review_guard();


-- ---------------------------------------------------------------------
-- The insert policy now reads the booking.
--
-- `client_id = auth.uid()` alone let a client rate any vendor on the platform
-- without ever having booked one. The check below is `create_review`'s gate
-- expressed as a row predicate, so the direct path and the RPC path admit
-- exactly the same inserts — and the RPC stays the only *supported* path, since
-- it is also what sends the notification.
-- ---------------------------------------------------------------------
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert to authenticated
  with check (
    reviews.client_id = auth.uid()
    and exists (
      select 1 from public.bookings b
       where b.id = reviews.booking_id
         and b.client_id = auth.uid()
         and b.vendor_id = reviews.vendor_id
         and b.deleted_at is null
         and b.status = any (public.review_eligible_statuses())
    )
  );

-- ---------------------------------------------------------------------
-- The update policy keeps its row scope; `tg_review_guard` owns the columns.
--
-- Unchanged in shape so the moderation console keeps working, with one addition:
-- a soft-deleted review is nobody's to edit.
-- ---------------------------------------------------------------------
drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews for update to authenticated
  using (
    (client_id = auth.uid() and deleted_at is null)
    or public.has_permission('moderation.manage')
  )
  with check (
    client_id = auth.uid() or public.has_permission('moderation.manage')
  );


-- =====================================================================
-- COPY
--
-- Two triggers, two audiences, and they are not variations of one sentence: the
-- vendor is being handed a rating that is already public and a reply window
-- that is already open, and the client is being told their words were answered.
-- =====================================================================
insert into public.notification_templates (trigger_key, channel, subject, body_template, locale) values

-- ---------- a client rates a booking ----------
('review.received.vendor', 'in_app', '{{client_name}} rated you {{rating}} out of 5',
 'Your review for {{booking_ref}} is live on your profile. Replying publicly is how other '
 'clients see how you handle feedback — and it is what finalises the review, since the client '
 'can still edit it until you answer.', 'en'),
('review.received.vendor', 'email', 'New review — {{rating}}/5 from {{client_name}}',
 E'{{client_name}} has reviewed their booking with you.\n\nReference: {{booking_ref}}\nRating: {{rating}} out of 5\nHeadline: {{review_title}}\n\nThe review is already on your public profile and counts towards your average rating.\n\nReply to it. A vendor who answers feedback in public reads very differently to one who does not, and your reply also closes the client''s window to edit what they wrote.', 'en'),

-- ---------- the vendor answers ----------
('review.replied.client', 'in_app', '{{vendor_name}} replied to your review',
 'Your review of {{booking_ref}} has a public reply. Your rating and your words are now final — '
 'a reply answers what is beside it, so reviews stop being editable once one arrives.', 'en'),
('review.replied.client', 'email', '{{vendor_name}} replied to your review',
 E'{{vendor_name}} has publicly replied to the review you left for {{booking_ref}}.\n\nOpen your reviews to read it.\n\nYour review is now final. We stop accepting edits once a vendor has replied, because a reply answers the text beside it — if something in yours is wrong, contact support and we will look at it.', 'en')

on conflict (trigger_key, channel, locale) do update
  set subject       = excluded.subject,
      body_template = excluded.body_template,
      is_active     = true;
