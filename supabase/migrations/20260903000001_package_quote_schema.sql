-- =====================================================================
-- Sinnapi — 0903a Package quotes: a request that already carries its price
--
-- WHAT THIS CHANGES ABOUT THE QUOTATION LIFECYCLE
--
-- Until now every quotation walked one path: the client describes an event,
-- the vendor prices it, the client accepts. `request_quotation` writes no
-- money at all — `subtotal` and `total` stay 0 until `send_quotation` runs.
--
-- A client clicking "Request this package and save UGX 360,000" is not asking
-- that question. They have read an itemised tier, seen a total, seen a saving,
-- and clicked the number. Making them wait for a vendor to retype a price they
-- were already shown is asking them to apply for something that was on sale.
--
-- So a SECOND path exists alongside the first, and `quote_origin` is which one
-- a row is on:
--
--   'vendor'   the original. Client asks, vendor prices, client accepts.
--   'package'  the client picked a published tier. The SERVER prices it at
--              request time from the tier's own lines, and the vendor's move
--              is to approve or decline — not to re-price.
--
-- The direction of the offer is reversed on the second path, and everything
-- else in this file follows from that. When the vendor is the one accepting,
-- the client is the one who is bound, so the client must be bound to exactly
-- the number they clicked. That is what `locked_subtotal` and
-- `locked_discount_floor` are for, and 0903b is what enforces them.
--
-- WHY THE STATUS STAYS `requested`
-- It is tempting to insert these at `sent` — they are priced, after all. That
-- would be wrong twice over. `respond_quotation` lets a client accept from
-- `sent`, so the client could accept their own request; and `sent` means "the
-- vendor has made you an offer", which is the opposite of what happened. At
-- `requested` the client's only action is `void` (see `availableQuotationActions`),
-- which is exactly right: they may cancel what they asked for, not approve it.
--
-- No new enum value for the same reason. `requested` already means "waiting on
-- the vendor", which is true here; a `pending_approval` value would have to be
-- taught to the expiry cron, the notification templates, the lifecycle spec in
-- `@sinnapi/ui` and four status-chip maps, to express something already true.
-- =====================================================================

-- ---------------------------------------------------------------------
-- WHEN THE EVENT IS, AND WHAT KIND OF EVENT IT IS
--
-- `quotations` has never had a date. That was defensible while a quote was a
-- price for unspecified work — the date was settled later, at
-- `create_booking_from_quotation`, and `events.event_date` covered the case
-- where the quote hung off a planned event.
--
-- It stops being defensible the moment a discount is involved. An offer runs
-- between two timestamps, and "can I use this offer" is a question about WHEN
-- THE EVENT IS, which nothing on the row could answer. So the date is asked
-- for at request time, validated against the offer's window there, and carried
-- forward as the booking's default.
--
-- `event_type_id` rather than free text. `event_types` has been a reference
-- table with an RLS policy and a client picker since 0814a, and "birthday
-- party" typed into a textarea is a string; the same words chosen from the
-- table are something a vendor can filter their pipeline by and something the
-- recommendation RPCs can already read. `request_details` stays for the prose.
-- ---------------------------------------------------------------------
alter table public.quotations
  add column if not exists event_date    date,
  add column if not exists event_type_id uuid references public.event_types(id);

comment on column public.quotations.event_date is
  'When the event happens, as stated by the client at request time. Validated against the '
  'offer''s window when the quote carries one, and the default for the booking''s own date.';

-- ---------------------------------------------------------------------
-- WHICH PATH THIS ROW IS ON
--
-- Defaulted to 'vendor' and NOT NULL, so every quotation that already exists
-- keeps the behaviour it was created under and every guard in 0903b is a
-- no-op against it. Nothing about the original flow changes.
-- ---------------------------------------------------------------------
alter table public.quotations
  add column if not exists quote_origin text not null default 'vendor';

alter table public.quotations
  drop constraint if exists ck_quotations_quote_origin;
alter table public.quotations
  add constraint ck_quotations_quote_origin
  check (quote_origin in ('vendor', 'package'));

comment on column public.quotations.quote_origin is
  '''vendor'' — the client asked, the vendor prices, the client accepts. ''package'' — the client '
  'bought a published tier at its published price; the server priced it and the vendor approves '
  'or declines. The two are different agreements and 0903b enforces the difference.';

-- ---------------------------------------------------------------------
-- WHAT THE CLIENT CLICKED, KEPT WHERE IT CANNOT BE ARGUED WITH
--
-- Two columns rather than one, because they constrain in opposite directions
-- and collapsing them into "the total may not rise" would be wrong.
--
--   locked_subtotal        The pre-discount base, from the tier's own lines.
--                          FIXED. The vendor may not add a line, remove one,
--                          or re-price one — the client bought an itemised
--                          package, and a package whose contents the seller
--                          edits after the sale is not a package.
--
--   locked_discount_floor  discount_total + offer_discount_total as priced.
--                          A FLOOR, not a fixed value. The vendor may discount
--                          further — a vendor who wants to win the job by
--                          taking another 5% off is doing something no rule
--                          should stand in the way of — but never less than
--                          the saving that was on the button.
--
-- Together they mean the total can only ever fall, which is what makes it safe
-- for the vendor's approval to bind the client directly: whatever the vendor
-- does, the client is charged the number they clicked or less.
--
-- Nullable, because they mean nothing on a 'vendor'-origin row and a default
-- of 0 there would read as "a floor of zero was deliberately set".
-- ---------------------------------------------------------------------
alter table public.quotations
  add column if not exists locked_subtotal       numeric(14,2),
  add column if not exists locked_discount_floor numeric(14,2);

comment on column public.quotations.locked_subtotal is
  'The tier base the client was shown. Immutable for the life of a package-origin quote.';
comment on column public.quotations.locked_discount_floor is
  'The combined saving (tier discount + campaign offer) the client was shown. A floor: the '
  'vendor may beat it, never undercut it.';

alter table public.quotations
  drop constraint if exists ck_quotations_locked_amounts;
alter table public.quotations
  add constraint ck_quotations_locked_amounts
  check ((locked_subtotal       is null or locked_subtotal       >= 0)
     and (locked_discount_floor is null or locked_discount_floor >= 0));

-- A package-origin row without its locks is a row nothing can enforce against.
-- Stated as a constraint rather than trusted to the RPC, because `quotations`
-- is INSERT-able through RLS (`quotations_insert`, 0011) and a browser that
-- posts `quote_origin => 'package'` directly would otherwise create a quote
-- with the reversed lifecycle and no ceiling on it.
alter table public.quotations
  drop constraint if exists ck_quotations_package_origin_locked;
alter table public.quotations
  add constraint ck_quotations_package_origin_locked
  check (quote_origin <> 'package'
         or (locked_subtotal is not null
             and locked_discount_floor is not null
             and template_id is not null
             and template_tier_id is not null
             and event_date is not null));

-- The vendor's approval queue is "package quotes still at requested", and the
-- client portal filters the same set. One partial index serves both.
create index if not exists ix_quotations_package_pending
  on public.quotations(vendor_id, created_at desc)
  where quote_origin = 'package' and status = 'requested';

create index if not exists ix_quotations_event_date
  on public.quotations(event_date) where event_date is not null;
