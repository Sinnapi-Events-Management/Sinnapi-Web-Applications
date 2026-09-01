# Sinnapi Event Planning — Design & Execution Plan

Status: **Phases 1–5 and 4b built. One item outstanding — 5b, which the user is taking on.** Migrations `20260901000001`–`20260901000010` were
applied to a clean Postgres 17 and exercised end to end (see §7). The client portal (grid, event
page, planner, vendor board, recommendations) and the vendor portal's interest→quote flow are
built, typechecked, linted and building.

This document is the contract for how a client-posted event becomes a set of booked vendors
without the client overspending.

---

## 1. The problem

An event was a dead end for the client who posted it.

- `events` has carried `budget_min` / `budget_max` / `currency` since 0005. **Nothing has ever
  summed anything against them.** A client could accept four quotes totalling twice their budget
  and the platform would help them do it.
- `event_interests` has existed since 0005 and only ever led to an admin table. The client — the
  person the interest is _addressed to_ — never saw it and had no way to answer.
- `request_quotation` has taken a `p_event_id` since 0823b that the client portal never passed,
  so **not one client quotation was linked to the event it was for**.
- A vendor could raise their hand and then not put a price on it: `send_quotation` requires an
  existing `quotations` row, and only the client could create one.

## 2. The model

```
events                    the budget, the date, the brief
 └── event_requirements   ONE LINE PER SERVICE CATEGORY, each with an allocation
      ├── event_interests vendors in the running (invited | interested | shortlisted | declined)
      ├── quotations      a price, per vendor, per line
      └── bookings        the agreed deal, carrying quotation + event + requirement
```

A requirement is the unit that makes guidance possible. "You have no vendor for Decor and 3m
unspent" is a gap the platform can fill; without lines the best it could say is "you need
vendors".

**Requirement state is never stored.** `open` / `sourcing` / `booked` is derived in
`event_requirement_summary` from the quotes and bookings pointing at the line. The only thing
stored is `cancelled_at` — the client changing their mind, which no quotation records.

## 3. What spends a budget

One definition, `event_money_lines`, which every rollup and the guard aggregates. Two bands:

| Band          | What                                                                  |
| ------------- | --------------------------------------------------------------------- |
| **Committed** | bookings `confirmed`, `in_progress`, `completed`                      |
| **Pending**   | bookings `requested`, plus `accepted` quotations with no live booking |

A `sent` quote does **not** reserve budget — four competing decor quotes would otherwise consume
the whole decor allocation between them.

**The double-count that matters:** an accepted quotation stays `accepted` for the whole life of
the booking made from it. So an accepted quote counts only while no live booking points at it.

## 4. Currency

The budget has one; each quote and booking carries its own. Amounts are restated through
`fx_convert` → `fx_rate`, which resolves a direct `exchange_rates` row, else an inverted one.

**A pair with no rate returns NULL, never 1.** Returning 1 would add a USD amount to a UGX budget
as though a dollar were a shilling — an error of three orders of magnitude presented as a fact.
Unconvertible rows are _counted_ (`unconverted_count`) so the client is told "2 items could not be
converted" rather than shown a total that quietly omits them.

## 5. The guard

`event_budget_check` returns a row; `assert_event_budget` decides what to do with it. Wired into
the three RPCs that commit money: `respond_quotation('accept')`,
`create_booking_from_quotation`, `create_booking`.

```
client accepts a quote
  → over budget?  no  → proceed
                  yes → raise 'budget_exceeded: over by 2500000.00 UGX'
                        UI shows the figure and what it leaves
                        → second call with p_acknowledge_over_budget := true
                        → row written to event_budget_overrides, then proceed
```

**Soft, not hard.** A budget is the client's own estimate and is often wrong in their favour. The
refusal exists so nobody commits without _seeing_ the number; it does not exist to overrule them.
What it must not be is silent — hence the append-only trail.

**It refuses only what increases exposure.** `would_exceed` requires _both_ `projected > budget`
**and** `projected > baseline`. Converting an accepted quote into its booking moves the same money
between bands and adds nothing, so it is never refused — without this, one acknowledged overage
would block every later step of that same deal, and an event once over budget would refuse every
remaining step of every deal already agreed under it.

Three things it deliberately does **not** refuse: an event with no budget; an unconvertible amount
(a stale FX feed is the platform's problem, not grounds to block a deal); an over-_allocation_ on
one line (the line is the client's sketch, the budget is the commitment). The last two still come
back on the check row so the UI can warn.

## 6. Who sees the money

|                       | budget & allocations | requirement brief                       |
| --------------------- | -------------------- | --------------------------------------- |
| Client (poster)       | ✅                   | ✅                                      |
| Admin `events.manage` | ✅ read, ❌ write    | ✅                                      |
| Vendor                | ❌ **never**         | ✅ via `list_event_requirements_public` |

`events.budget_max` is already public — the client advertising a range. How much is **left**, and
how it is **split**, is their negotiating position: a vendor who sees 3m unspent on decor quotes
2.9m. The rule is column-level and RLS is row-level, so the table stays shut and the vendor's view
is a function returning category / title / brief / priority and no money.

`event_budget_overrides` has **no** insert/update/delete policy. Its only writer is a SECURITY
DEFINER function; the append-only trigger closes update and delete even for that. A trail its own
subject can add to is not a trail.

## 7. Verification

> **How this was verified, and its limit.** Every claim below comes from applying all migrations to
> a throwaway `supabase/postgres:17.6.1.166` container and running the RPCs by hand in `psql`. Those
> scripts lived in a scratch directory and were **not committed**, so none of this is reproducible by
> anyone else and none of it runs in CI. The repo has no test suite of any kind, so this is the house
> norm rather than a regression — but "verified" here means "was seen to work once", not "stays
> working". A committed pgTAP suite covering the guard, the rollups and the RLS matrix is the single
> highest-value follow-up.

Applied to a clean `supabase/postgres:17.6.1.166` with all 111 migrations, then exercised:

- FX: direct `1200 USD → 4,440,000 UGX`; inverse `3700 UGX → 1.00 USD`; identity; **missing pair → NULL**
- Requirements: create, upsert-not-duplicate (3 lines stay 3), rollup with derived state
- `express_event_interest`: creates interest + draft quote, **idempotent** (second press returns the same quote)
- Guard: `7.5m + 15m` vs `20m` → `budget_exceeded: over by 2500000.00 UGX`, **nothing mutated**
- Override: proceeds, event reads `112.5% / exceeded`, trail row written with the figures shown
- Booking an accepted quote: `increases_exposure = f`, allowed, **no double-count** (stays 22.5m)
- Invitation: adopts an abandoned draft and promotes it `draft → requested`; never re-points an
  `accepted` quote at a new line
- Requirement lifecycle: cancel releases the allocation and restore reclaims it; the cancelled line
  is still returned, marked; delete refuses with `requirement_in_use` while quotes are attached and
  succeeds when none are; a soft-deleted category can be re-added (partial unique index); upsert on
  an existing category edits rather than duplicating
- A line with no allocation reads `unset`, never `healthy` — a green bar would claim the client is
  within a figure they never gave
- Vendor board: invite → `requested` quote on the named line; vendor prices at 22m against a 20m
  budget → check returns `over_by 2m, would_exceed=t, increases_exposure=t`; first accept refused
  with the quote left `sent` (nothing mutated); "accept anyway" succeeds and records the override;
  passing on the vendor closes their **open** quote and leaves the **accepted** one alone — which
  is exactly what the confirm dialog's copy promises
- Recommendations: featured vendor scores 85.93 vs 36.03 and leads; `is_available`/`covers_region`
  flags are returned on rows that fail them rather than hiding those vendors; each filter excludes
  exactly the right candidate; a vendor engaged on the line drops out; a passed-on vendor is never
  re-suggested (0 rows); a stranger is refused
- Vendor interest→quote: one call yields `interest=interested` **and** `quote=draft` carrying the
  vendor's message; pressing again returns the same quote (1 row, no duplicate); the client's board
  now shows it and the client is notified — none of which was possible before; a draft event is
  refused `event_unavailable`; a non-vendor is refused `not_a_vendor`
- Quote comparison: the payload returns cheapest-first with line items attached in one call;
  refuses a quotation not on the event (`quotation_not_on_event`), more than four ids
  (`too_many_quotations`), and a stranger (`forbidden`). The `best` predicates were exercised
  separately against that payload plus ties, single-column, all-expired and unconvertible-total
  cases — the real fixture correctly splits the ticks, giving price and deposit to the cheaper
  quote and validity to the one that has not expired
- RBAC, as the `authenticated` role so RLS actually applies: stranger reads 0 requirements and
  0 overrides; **vendor reads 0 requirements**; stranger's insert refused by policy; client cannot
  write their own override row; `request_quotation` against another client's event → `event_not_found`

### Known pre-existing failure, not introduced here

`20260815000003_messaging_unread_and_notify.sql` fails on a clean database:
`cannot change return type of existing function ... mark_conversation_read(uuid)`. It needs a
`drop function` before its `create or replace`. Unrelated to this series; flagged, not fixed.

Separately, `supabase start` cannot apply this repo's migrations from scratch, because `0013`
writes to `storage.buckets` and the storage container creates that schema _after_ migrations run.

## 8. Two security holes closed on the way

Both were latent while events were inert and become real once a budget hangs off `events`:

1. **`request_quotation` never checked event ownership.** It takes `p_event_id`, is reachable
   directly through PostgREST, and never verified the caller posted that event — so one client
   could attach quotations to another client's budget line. (`create_booking` has had this check
   since 0817a; `request_quotation` never got it.) Now raises `event_not_found`.
2. **A requirement could be cited from another event.** Not expressible as a foreign key, and both
   `quotations` and `bookings` are directly writable by the parties to them. A trigger on both
   tables now refuses `requirement_event_mismatch`.

## 9. Phases

| Phase  | Scope                                                                                          | Status                    |
| ------ | ---------------------------------------------------------------------------------------------- | ------------------------- |
| **1**  | Migrations: schema, FX, rollups, guard, sourcing RPCs, RLS/RBAC, copy, realtime                | **built + verified**      |
| **2**  | Budget on `MyEventCard` (clickable); `/my-events/:id` hero, budget meter, details              | **built**                 |
| **3**  | Plan tab: lines, allocations, per-line meters, add/edit/cancel/restore/delete                  | **built**                 |
| **4**  | Vendors tab: engagement board, invitations, shortlist/pass, accept with the over-budget dialog | **built**                 |
| **4b** | Event-scoped quote comparison (side-by-side, ≤3, mobile fallback)                              | **built**                 |
| **5**  | Recommendations (`recommend_vendors_for_event` + filters); vendor-portal interest→quote        | **built**                 |
| **5b** | Accessibility audit against a running app; light/dark and responsive verification              | **NOT built** — never run |

### Phase 2, as built

- `list_my_event_budgets` (0901g) — one request for the whole grid rather than one per card. It
  calls `event_money_lines` through a LATERAL, so a card and the page it opens **cannot disagree**;
  verified by asserting the two RPCs return identical figures for the same event.
- `@sinnapi/ui` gains the budget vocabulary and its two surfaces: `eventBudget.ts` (states,
  colours, band geometry, copy), `BudgetMeter`, `BudgetStateChip` / `RequirementStateChip`.
  Shared rather than client-only because the admin event page reads the same rollup.
- `BudgetMeter` is a **track that overflows**, not a clamped percentage bar: past the budget the
  track rescales to what is spoken for and a marker shows where the budget sat, so the overspend
  has a visible width. `StackedShareBar` could not do this — it normalises to the sum of its
  slices, so it can express a distribution and not an overrun.
- Budget state has its **own** colour map. `statusColor` binds `open` to error for reconciliation
  exceptions, and an event requirement that is `open` is the healthy starting state of a new plan.
- The card uses a **stretched link**, not `CardActionArea`: the payment-terms row contains a
  button, and a button inside a link is invalid HTML that swallows the inner control. One link in
  the a11y tree, named by the event title; the terms button lifts above the overlay.
- `healthy` is gold, not green — a budget with room left is the unremarkable case, and green there
  would make the ordinary state shout as loudly as the two that need acting on.

### Phase 3, as built

- `event_requirement_summary` gains **`allocation_state`** (0901h) — the same four-value ladder as
  `event_budget_summary.state`, from the same setting. Derived server-side so the portal cannot
  grow a second copy of the ladder and show an amber line inside a green event.
- **Two states per line, and they are allowed to disagree.** `state` answers "have I found anyone"
  (open / sourcing / booked / cancelled); `allocation_state` answers "can I still afford them"
  (unset / healthy / warning / exceeded). Verified: a line reads `sourcing` + `exceeded` at 375%.
  One badge for both is how a client reads a filled line as a problem.
- **`allocation_state` is never enforced.** `assert_event_budget` ignores per-line overspend on
  purpose — the allocation is the client's sketch of how the budget divides, and only the event
  total is a commitment. It colours a meter and nothing else.
- `list_service_category_options` (0901h) returns `id, key, name`. Its own read rather than
  widening `useFilterRefData`, which projects `key,name` because a facet matches on the key —
  a budget line needs the id, and discovery filters have no use for one.
- The line meter **reuses `BudgetMeter`** with the allocation standing in for the budget. That is
  why `BudgetFigures` is a shape rather than a model: a line _is_ a budget, just a smaller one, and
  it overflows the same way.
- Cancelled lines are shown below a divider, not hidden. They keep their quotes and bookings, and
  those still count against the event total — a client looking at a total they cannot account for
  is the failure this avoids. Cancel/restore verified to release and reclaim the allocation exactly
  (15.5m → 12.5m → 15.5m).
- Delete is offered only when nothing is attached, because the RPC refuses otherwise
  (`requirement_in_use`) — a menu item that exists to produce an error is worse than one that is
  not there. Both branches verified.
- `QueryState` gains an optional `loadingFallback`, so a section card can show a skeleton of the
  rows about to arrive instead of collapsing to a centred spinner and snapping open.

### Phase 4, as built

- `list_event_vendors` (0901i) — **one row per engagement, not per vendor**. A vendor may quote for
  two lines of one event (0901d allows it deliberately), and collapsing those would make the client
  choose between two prices they were never offered as alternatives. Verified: one vendor returns
  three rows, one per line. Plus one row per vendor whose interest has produced no quote — the
  "interested, no price yet" state the whole feature exists to surface.
- Quote totals are restated in the event currency by the same `fx_convert` the rollups use, so the
  figure compared on the board is the figure the guard checks on accept. The card shows **both**
  currencies when they differ: the vendor's own figure leads (it is what they are held to), the
  conversion sits under it.
- **The over-budget dialog is the visible surface of `p_acknowledge_over_budget`.** It opens on
  every accept, not only over-budget ones — a dialog that appears only when something is wrong
  teaches the client that its appearance _is_ the warning, so when it matters they dismiss it. The
  confirm button changes words (`Accept this quote` → `Accept anyway`) because those are two
  different decisions.
- The button is **not disabled** when over budget. The guard exists so nobody commits without
  seeing the number, not to overrule a client about their own money.
- `BudgetImpactPreview` shows the working — before, this, after — rather than a verdict. A verdict
  invites the client to trust it or not; the arithmetic invites them to decide. When over, it names
  their own nice-to-have lines and what trimming them would recover. That nudge is the entire
  reason `requirement_priority` exists.
- **The check/accept race is handled.** The advisory check and the accept are two round trips and a
  quote can land between them, so a `budget_exceeded` arriving after the dialog cleared it re-reads
  the figures and asks again rather than surfacing a raw error for a state the screen was still
  calling fine.
- Filter tabs are named for what the client must _do_ — "Waiting on them" spans an invited vendor
  who has not answered and an interested one who has not priced, which are two rows in
  `event_interests` and one situation on screen. Counts are computed over the whole set, so a badge
  never changes as you switch tabs.
- The invite dialog stays open after each invitation: sourcing a wedding means inviting four
  caterers in one sitting.

### Phase 4b, as built — quote comparison

`compare_event_quotations` (0901k) returns two to four quotes with pricing breakdown, validity,
advance terms and line items **in one call** — a comparison whose columns land at different times
is one where the client compares whichever arrived first. Owner-gated and it refuses ids that are
not the caller's own on this event, so the array cannot be used to probe for quotations that exist.

- **Three columns, not more.** Usability work on comparison tools is consistent that past about
  three columns people stop comparing and start scrolling. The server caps at four because
  `p_quotation_ids` arrives through PostgREST and an uncapped array invites a request for two
  hundred; the UI offers three.
- **More than the total.** Two caterers at 8m are not the same offer if one wants 40% up front and
  the other 15%, or if one has expired — and `bookings` inherits `advance_rate` and
  `advance_release_days_before` straight off the accepted quote, so those are terms being agreed to
  at the moment of acceptance. The test fixture is exactly this case: the cheaper quote, with the
  smaller deposit, is the expired one.
- **The best value per row is ticked**, because the research finds people struggle to _read_ a
  comparison once they have built one. Applied only where "better" is objectively true — lower
  price, lower deposit, a live quote over an expired one — and never to things like item count,
  where a tick would be an opinion dressed as a fact. Ties mark nobody; a single usable column
  marks nobody; an unconvertible total is skipped rather than counted as zero.
- Colour is **not** the only signal: the winner gets a tick and an `aria-label`, not just green.
- **Two layouts, one definition.** `COMPARE_ROWS` drives both, so they cannot drift into showing
  different attributes in different orders. Wide: a column grid with a sticky attribute column, so
  scrolling to the third quote never loses the row labels. Phone: the axes swap — the attribute
  becomes the heading and the quotes sit under it as a short row. A three-column grid at 360px
  gives each value ~90px and wraps every amount mid-number; shrinking the table is the standard way
  these are made unusable.
- **Accepting from the comparison routes back through the same accept dialog** — budget check,
  over-budget warning, acknowledgement. A second path to `respond_quotation` that skipped the guard
  would defeat the whole feature.
- Selection only appears once two priced quotes exist. Comparison tools fail at the _selection_
  step as often as at the reading step, so the tray follows the selection rather than sitting
  somewhere fixed.

### Phase 5, as built

**`recommend_vendors_for_event` (0901j).** Ranking expresses only what the platform knows about
quality; the three situational tests are filters:

```
category match      REQUIRED, not scored  (a photographer is not a cheaper caterer)
is_featured  × 40   paid placement — the largest term, and labelled as such on the card
search_weight × 1   the operator's thumb, already used by public search
avg_rating   × 8    a full star ≈ a fifth of a featured slot
ln(1+reviews)× 3    0→10 reviews says far more than 200→210
```

Availability, budget fit and region are returned as booleans on **every** row _and_ offered as
filters. Blending them into the score gives a list the client cannot argue with — a vendor they
know is perfect sits eighth and there is no way to find out why. Instead a busy vendor is shown
saying "Busy on your date", and the client decides whether the date can move.

- **All filters start off.** Defaulting them on would show four vendors where twelve exist, with
  no indication that eight were removed by rules nobody displayed.
- **Never recommended:** vendors already engaged on the line, and anyone the client has passed on.
  Re-suggesting a declined vendor is the fastest way to make the panel feel like advertising.
- **"Promoted", not "Featured".** `is_featured` is something a vendor buys; the card says so. A
  recommendation panel that hides its commercial incentive is the one people learn to distrust.
- `quote_tier_total` computes the "from" price by the _same_ formula as `packagePricing` (UI) and
  `send_quotation` (SQL) — a "from UGX 2.5m" that disagrees with the package page one tap away is
  the platform quoting two prices for one thing. An unknown price **passes** the budget filter:
  no published package is not evidence of an expensive vendor.

**Vendor portal.** `ExpressInterestButton` no longer inserts a bare `event_interests` row into
silence — it calls `express_event_interest`, which records the interest _and_ opens the draft
quotation, then navigates the vendor into the builder. The `vendorId` prop is gone from the button
and unwound through four components: the RPC derives the vendor from the caller, which is the only
value it could correctly be.

**A caught bug:** the score used `ln()`, which returns `double precision`, and Postgres has no
`round(double precision, int)`. It created fine and failed on first call — plpgsql bodies are not
resolved until executed. Cast to `numeric`.

## 10. UI direction (phases 2–5)

Grounded in the patterns below, not invented:

- **Progress bars, not pie charts**, for allocation against a limit.
- **Committed and pending as two bands** on one bar, so "agreed" and "asked for" stay distinct.
- **Warn at 80%, not at 100%** (`event_budget_warn_threshold`). A warning that arrives at the
  moment of overspend is a receipt, not a warning.
- **Supportive, not scolding.** "This puts you 3.2m over — your nice-to-haves come to 4m" beats
  "budget exceeded". This is what `requirement_priority` exists for.
- **Comparison is hard.** Usability testing consistently finds users struggle with side-by-side
  comparison tools; cap at 2–3 quotes and give the mobile layout a deliberate fallback rather than
  smaller text. The existing `/quotations/compare` page should be reused filtered by event, not
  rebuilt.
- Atomic design, per repo convention: hooks own state and reads, components own structure.

Sources:
[Baymard — comparison tools](https://baymard.com/ecommerce-design-examples/39-comparison-tool) ·
[UX Patterns — comparison table](https://uxpatterns.dev/patterns/data-display/comparison-table) ·
[Appthetics — budgeting app UX patterns](https://www.appthetics.com/blog/budgeting-apps-ux-patterns) ·
[Eleven Space — designing for financial behaviour](https://www.elevenspace.co/blog/designing-for-financial-behavior-ux-that-builds-better-money-habits) ·
[onething — budget app design](https://www.onething.design/post/budget-app-design)
