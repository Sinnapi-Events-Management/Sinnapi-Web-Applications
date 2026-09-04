# Subscription payments

How a vendor pays for a plan, what a payment does to their period, and how a
lapsed subscription is handled. Built on the same shape as escrow
(`docs/escrow.md`): one pure pricing function, one RPC that opens a payment,
one emitter that records the event and notifies every party in the same
transaction, and a webhook that settles the money.

Migrations: `20260903000011` (enum values), `20260903000012` (core),
`20260903000013` (console RPCs and templates).

## The flow

1. Vendor opens a plan card on `/subscription` in the vendor portal. The
   confirmation dialog previews with `subscription_price_plan(vendor, plan)`:
   plan, cycle, amount, the period the payment buys, what kind of change it is
   and any unused days a plan change forfeits.
2. Vendor picks a rail (the same four the client portal offers) and taps Pay.
   The portal calls `create-payment` with `{ planId, vendorId, provider,
method }` and an `Idempotency-Key` header.
3. `activate_subscription_payment` verifies ownership, refuses an inactive or
   zero-priced plan, prices through the same function, enforces one in-flight
   payment per subscription (30-minute TTL, `payment_already_in_flight`) and
   inserts ONE `payments` row: `purpose = 'subscription'`, `subscription_id`,
   `target_plan_id`, status `pending`. It emits `subscription.payment_pending`.
4. `create-payment` submits the PSP order with the plan name as the
   description and, for Pesapal, the vendor portal's `/payments/return` as the
   callback (`VENDOR_PORTAL_URL`), then stores the provider reference and
   checkout URL with `attach_payment_provider_ref`.
5. The IPN lands. `record_payment_result('succeeded')` dispatches to
   `activate_subscription(subscription, payment)`, which reads the plan FROM
   THE PAYMENT, prices the period again with the same quote, writes the
   period, flips the status to `active`, makes the vendor public, clears the
   renewal counters and emits `subscription.activated` to the vendor and
   Finance. It is idempotent on the payment.
6. The browser lands on `/payments/return`, which reads our own payment row
   and shows confirmed, still-processing or failed. Nothing on the query
   string is believed about the outcome.

## Decisions

- **Processing fee.** Absorbed by the platform. A vendor pays exactly the list
  price on every rail. `psp_fee_amount` is returned as 0, not omitted.
- **Period start.** Same plan while active: starts at `current_period_end`
  (early renewal loses nothing). Trial: starts at `trial_ends_at`. Plan change
  while active: starts now, charged in full, nothing credited; the unused days
  are shown before the vendor commits. Grace, expired, cancelled: starts now.
- **The plan travels on the payment.** `payments.target_plan_id`. A plan a
  vendor picked but never paid for never reaches `subscriptions.plan_id`.
  `choose_subscription_plan` is dropped; there is no scheduled downgrade.
- **`auto_renew` means reminders, not auto-charge.** Pesapal mobile money has
  no card-on-file. `subscription-lifecycle` sends a reminder at each mark in
  `subscription_renewal_reminder_days` (default `[7,3,1]`) before the period
  or trial ends, through `remind_subscription_renewal`, which re-checks under
  a row lock. A vendor with `auto_renew = false` still gets the grace notice.
- **Hiding needs a prompt.** `apply_subscription_state` hides an expired
  vendor only if `renewal_prompted_at` is set (a reminder or the grace notice).
  Otherwise it sets `hide_blocked_at`, leaves the listing public and emits
  `subscription.hide_blocked` to Finance. The console lists these under
  "Needs review"; the flag clears on the next successful payment.
- **Free plans are refused** at checkout (`plan_is_free`). Pricing a plan at
  zero needs its own product decision, not a silent bypass of the invariant.
- **A reversed subscription payment** does not move the subscription. It files
  a critical reconciliation exception and tells both parties; suspending is a
  person's call.

## Events and notifications

`subscription_notify(subscription, event, trigger, to_vendor, to_admin,
payment, amount, metadata)` writes one `subscription_events` row (with
`payment_id`) and one outbox row per recipient. Admin recipients hold
`subscriptions.manage`. The old status trigger and the generic outbox trigger
on `subscriptions` are dropped.

Triggers and audiences: `payment_pending` (vendor), `activated` (vendor +
admin), `payment_failed` (vendor + admin), `renewal_due` and `trial_ending`
(vendor), `grace_entered` (vendor + admin), `expired` (vendor + admin),
`hide_blocked` (admin). Copy lives in `notification_templates`.

## Console

`/subscriptions/:id` (`get_subscription_admin`): facts, vendor and owner,
every payment (with the plan it was for) and the event timeline linked to
payments. The list gains a "Needs review" filter and chip.

## Environment

`VENDOR_PORTAL_URL` must be set for the functions: it is both the deep-link
root for vendor notifications and the per-order Pesapal callback for
subscription checkouts. If unset, vendors are sent to `PESAPAL_CALLBACK_URL`
(the client portal), whose return page recognises a subscription payment and
says so.
