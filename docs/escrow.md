# Sinnapi Escrow — Design & Execution Plan

Status: **built**. Migrations verified against Postgres 15; the money path and its edge cases are exercised end to end (see §9). This document is the contract for the escrow money flow.
Every RPC, edge function and portal screen below traces back to a step here.

> **After the event**, the balance release is now reached through a three-party
> settlement — the vendor asks, the client approves in full or offers less with
> a reason, and a reduction needs the vendor's consent before anything moves.
> See [settlement.md](./settlement.md). Everything below still describes the
> money model, the tranches and the ledger; what changed is how the release
> request gets raised, and that `approve_escrow_release` now refuses while an
> agreed reduction is outstanding.

---

## 1. The money model

Commission and processing fees are charged **on top of** the agreed amount. The
vendor is made whole; the client sees the full cost before paying.

```
agreed_amount          200,000   the price the vendor quoted and the client accepted
+ commission           +20,000   agreed x commission_rate            (Sinnapi revenue)
+ psp_fee               +6,600   (agreed + commission) x psp_fee_rate (passed through)
─────────────────────────────
= gross_amount         226,600   what the client pays into escrow
```

The vendor's 200,000 is settled in two tranches:

```
advance_amount          60,000   agreed x advance_rate     released before the event
balance_amount         140,000   agreed - advance_amount   released after client approval
```

Every rate is **snapshotted onto the escrow row at funding time**. Changing
`commission_rate` in settings never re-prices an escrow that already exists.

### Rounding

All money is `numeric(14,2)`. Components are rounded to 2dp individually, then
`gross_amount` is computed as the **sum of the rounded components**, never
re-rounded. `balance_amount = agreed_amount - advance_amount` (subtraction, not a
second rounding) so the two tranches always sum exactly to the agreed amount.

---

## 2. Advance terms

The advance is proposed on the **quotation**, so the terms exist whether or not
the booking is ultimately paid through escrow (a direct client↔vendor deal uses
the same agreed terms, Sinnapi just doesn't hold the money).

| Field                         | Set by                   | Bound                                                                                |
| ----------------------------- | ------------------------ | ------------------------------------------------------------------------------------ |
| `advance_rate`                | vendor, on the quotation | `0 .. advance_rate_max` (default 50%)                                                |
| `advance_release_days_before` | vendor, on the quotation | `0 .. advance_release_days_max` (default 30), **per booking** — not a global setting |
| `advance_terms_note`          | vendor, optional         | free text shown to the client                                                        |

Accepting a quotation copies these onto the booking. The client must then
**explicitly accept the advance terms** as a distinct step before paying —
`bookings.advance_terms_accepted_at` is the consent record, and
`activate_escrow` refuses to run without it.

The advance payout is not raised at funding. It becomes due at:

```
advance_release_due_at = (event_date - advance_release_days_before) at 00:00 local
```

This shrinks the cancellation-exposure window: a client who cancels before that
date is refundable in full because nothing has left the platform yet.

---

## 3. Lifecycle

```
booking.status = confirmed          (vendor accepted — escrow cannot start earlier)
        │
        ├─ client reviews cost breakdown + advance terms
        ├─ client accepts advance terms          → advance_terms_accepted_at
        │
        ▼
   activate_escrow(booking, provider, method)
        │  server derives EVERY amount from bookings.amount — never from the client
        │  escrow: initiated       payment: pending
        ▼
   PSP hosted checkout  (Pesapal redirect / PayPal approve)
        │  PCI: card data never touches Sinnapi. SAQ A.
        │  activate_escrow refuses a second checkout while one is in flight
        │  (payment_already_in_flight); a repeated Idempotency-Key is handed
        │  the checkout it already opened, never a second PSP order.
        ▼
   browser returns to client portal  /payments/return?OrderTrackingId=…&OrderMerchantReference=…
        │  PESAPAL_CALLBACK_URL. No status on the query string (Pesapal omits it on
        │  purpose); the page reads its own payments row through RLS, polls for ~30 s
        │  with backoff and subscribes to the row, then shows one of: confirmed /
        │  still processing (we email) / failed (reason + retry to the booking).
        ▼
   IPN (psp-pesapal-webhook, registered by `yarn pesapal:ipn` → PESAPAL_IPN_ID)
        │  → GetTransactionStatus → record_payment_result → fund_escrow
        │  escrow: held            payment: succeeded
        │  ledger: dr psp_clearing 226,600 / cr escrow_held 226,600
        │  notify: client, vendor, finance admins
        ▼
   cron escrow-lifecycle, at advance_release_due_at
        │  release_advance() → payout(kind=advance, status=requested)
        │  escrow: advance_released
        │  ledger: dr escrow_held 60,000 / cr vendor_payable 60,000
        │  notify: vendor ("advance scheduled"), finance admins ("settlement due")
        ▼
   Finance settles manually  (bank / MoMo / merchant / cash)
        │  record_payout_settlement  (maker)  → settlement_recorded
        │  approve_payout_settlement (checker, must differ) → completed
        │  ledger: dr vendor_payable 60,000 / cr psp_clearing 60,000
        │  notify: vendor ("advance paid"), client (informational)
        ▼
   booking.status = completed
        │  auto_release_due_at = completed_at + escrow_auto_release_days
        │  reminders to client at day 1 / 3 / 6
        ▼
   client_confirm_release()          ── or ── cron auto_request_release()
        │  escrow: release_requested            (auto path is identical from here:
        │                                        a Finance admin still approves,
        │                                        money never moves unattended)
        ▼
   approve_escrow_release()   requires escrow.release
        │  payout(kind=balance, status=requested)
        │  ledger: dr escrow_held 166,600
        │          cr vendor_payable      140,000
        │          cr commission_revenue   20,000
        │          cr psp_fee_expense       6,600
        ▼
   Finance settles manually → completed
        │  escrow: paid_out
        │  notify: client, vendor, finance admins
```

Opening a dispute at any point freezes both the advance-due and auto-release
timers.

---

## 4. Refunds

Composition is decided **per reason**, seeded in `platform_settings.refund_policy`
as the refundable percentage of each component, and overridable by the approving
admin:

| Reason                     | agreed | commission | psp_fee |
| -------------------------- | ------ | ---------- | ------- |
| `vendor_no_show`           | 100%   | 100%       | 100%    |
| `vendor_cancelled`         | 100%   | 100%       | 100%    |
| `service_not_as_described` | 100%   | 100%       | 0%      |
| `duplicate_payment`        | 100%   | 100%       | 100%    |
| `client_cancelled`         | 100%   | 0%         | 0%      |
| `admin_discretion`         | 100%   | 0%         | 0%      |

A refund can only ever draw on what is still held. If the advance has already
been settled, the refundable ceiling is `gross_amount - already_settled`; the
remainder is flagged for admin mediation rather than silently under-refunded.

---

## 5. Notifications

Every state change notifies **all three parties** — client, vendor, and Finance
admins — over in-app _and_ email. Fan-out is transactional: the RPC writes an
`outbox` row in the same transaction as the money move, so a notification can
never be lost or fire for a rolled-back payment.

| Event                               | Client | Vendor | Admin |
| ----------------------------------- | ------ | ------ | ----- |
| escrow activated / awaiting payment | ✓      | ✓      | –     |
| payment failed                      | ✓      | –      | ✓     |
| escrow funded                       | ✓      | ✓      | ✓     |
| advance due for settlement          | –      | ✓      | ✓     |
| advance settled                     | ✓      | ✓      | –     |
| release reminder (d1/d3/d6)         | ✓      | –      | –     |
| release requested (client or auto)  | ✓      | ✓      | ✓     |
| release approved                    | ✓      | ✓      | –     |
| balance settled / escrow closed     | ✓      | ✓      | ✓     |
| dispute opened / resolved           | ✓      | ✓      | ✓     |
| refund requested / approved / paid  | ✓      | ✓      | ✓     |
| reconciliation mismatch             | –      | –      | ✓     |

---

## 6. Edge cases and how each is handled

| Case                           | Handling                                                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Client abandons checkout       | Payment stays `pending`; escrow stays `initiated`. Retry reuses the same escrow row (`attempt_no++`) instead of violating `ux_escrow_booking`.                                 |
| Payment fails                  | `record_payment_result('failed')` → escrow back to `initiated`, client + admin notified, retry offered in the UI.                                                              |
| Payment reversed after success | Pesapal `status_code = 3`. Escrow → `failed`, admin alerted; never silently ignored.                                                                                           |
| Webhook never arrives          | `payment-reconciliation` cron re-queries the PSP for anything `pending`/`processing` past 1h and applies the authoritative result.                                             |
| Webhook arrives twice          | Unique `(provider, event_id)` on `payment_events` — the insert is the idempotency gate, taken _before_ any state change.                                                       |
| Webhook arrives out of order   | `record_payment_result` refuses backwards transitions out of a terminal state.                                                                                                 |
| Webhook body lies              | Pesapal: body carries no status; we re-query `GetTransactionStatus`. PayPal: signature verified before the event is trusted.                                                   |
| Webhook handler throws         | Returns the PSP's expected ack shape with a non-200 _internal_ status so the PSP retries, but never leaves a half-applied state — all money moves are single-transaction RPCs. |
| Vendor has no bank account     | `approve_escrow_release` raises a payout with a null destination and flags it; it no longer silently inserts zero rows.                                                        |
| Client never confirms          | Auto-release timer → `release_requested`, admin approves.                                                                                                                      |
| Dispute opened                 | Timers frozen; escrow → `disputed`; release blocked until resolved.                                                                                                            |
| Ledger drifts                  | `assert_balanced` per entry group at write time + nightly per-escrow and per-account reconciliation into an exception queue.                                                   |
| Actual PSP fee ≠ estimate      | Variance posted to `psp_fee_expense` against `commission_revenue` at settlement; surfaced in the admin reconciliation view.                                                    |

---

## 7. Execution steps

- [x] **1** enums, settings, advance terms on quotations/bookings
- [x] **2** escrow / payout / refund schema for the on-top two-tranche model
- [x] **3** money RPCs
- [x] **4** notification fan-out + templates
- [x] **5** RLS, realtime, cron, payout-proof storage bucket
- [x] **6** `create-payment` — server-derived amounts, idempotent retry
- [x] **7** PayPal capture + webhook idempotency; Pesapal IPN ack + reversal
- [x] **8** `escrow-lifecycle` cron
- [x] **9** `notification-dispatch` rewrite
- [x] **10** `payment-reconciliation` fix + exception queue
- [x] **11** shared UI primitives + realtime hook
- [x] **12** client portal — activation, pay, approve, confirm
- [x] **13** vendor portal — advance terms, escrow, payouts
- [x] **14** admin portal — release, settlement, reconciliation
- [x] **15** typecheck + lint

---

## 8. Security posture

- **No card data, ever.** Both providers are hosted redirect flows; Sinnapi
  stores only an opaque provider reference. PCI DSS SAQ A.
- **No client-supplied amounts.** Every figure is derived server-side from
  `bookings.amount` inside a `security definer` RPC with a fixed `search_path`.
- **Service-role only for webhooks.** Client keys can never move money; every
  balance-changing RPC re-checks its own permission.
- **Maker-checker on every disbursement.** Enforced by a table constraint _and_
  re-checked in the RPC — one admin records, a different admin approves.
- **Append-only history.** `ledger_entries`, `escrow_events`, `payment_events`
  and `audit_logs` are insert-only; corrections are reversing entries.

---

## 9. Verification

The five migrations were applied to a clean Postgres 15 alongside the existing
45, then the money path was exercised end to end. Recorded here because the
invariants below are the ones a future change must not break.

**Full lifecycle** — 200,000 agreed, 10% commission, 3% processing, 30% advance:

| Check                                      | Result                                            |
| ------------------------------------------ | ------------------------------------------------- |
| `gross = agreed + commission + fee`        | 226,600 = 200,000 + 20,000 + 6,600                |
| `agreed = advance + balance`               | 200,000 = 60,000 + 140,000                        |
| `escrow_held` nets to zero once closed     | 0.00                                              |
| `vendor_payable` nets to zero once settled | 0.00                                              |
| Debits equal credits                       | 653,200 = 653,200                                 |
| Vendor received the agreed amount in full  | 200,000                                           |
| Commission recognised                      | 20,000                                            |
| All three parties notified                 | 23 notifications (10 admin / 7 vendor / 6 client) |
| Event stream has no duplicates             | 7 events, one per transition                      |

**Edge cases** — each asserts that the unsafe action is _refused_:

1. Funding without accepting the advance terms → refused
2. Advance rate above the platform ceiling → refused
3. Retry after a failed payment → reuses the one escrow row (`attempt_no` 2), re-priced for the new rail
4. Duplicate webhook delivery → no-op, ledger not double-posted
5. Client confirming before the booking completes → refused
6. Opening a dispute → both timers frozen
7. Advance release while frozen → refused, no payout raised
8. Refund composition → varies correctly by reason
9. Same admin recording _and_ approving a settlement → refused

Four defects were found and fixed this way: two untyped `CASE` expressions that
could not coerce to their enum, a status-change trigger that aborted on any
status without an identically-named event type (and duplicated every history
row), an ambiguous `resolve_dispute` overload, and a refund whose components
did not satisfy their identity constraint at insert time.
