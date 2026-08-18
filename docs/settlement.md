# Sinnapi Post-Event Settlement

How a vendor gets paid after the event, and how the three parties agree on the
figure. Sits on top of the escrow release described in [escrow.md](./escrow.md)
— it does not replace it.

---

## 1. The problem this closes

Two holes, both on the same screen.

**The completion button had no gate.** `complete_booking` accepted any
`confirmed` or `in_progress` booking regardless of its date, and the vendor
portal offered the button from the moment a booking was confirmed. Completing
fires `trg_escrow_release_window`, so a vendor could — by accident or
otherwise — tell the client their event was delivered, tell the console the
same, and start a payout clock months before the event happened.

**Release was all-or-nothing.** The only ways out of the release window were
the client confirming in full, the auto-release timer expiring into a full
approval, or a dispute freezing everything. There was nothing for the ordinary
case: the event happened, mostly as agreed, and the client wants to pay
somewhat less for a reason they can name. Anything short of full payment had to
become a dispute, which is a heavy, adversarial instrument for a conversation
two reasonable people could have.

---

## 2. The completion gate

```
end_time set    → completion unlocks at event_date + end_time
end_time null   → completion unlocks at midnight following event_date
```

Read in **Africa/Kampala**. Bookings store a bare `date` and a bare `time` with
no zone, every event they describe happens in Uganda, and EAT observes no DST —
so the offset is a constant and the browser can compute the same instant the
server enforces.

| Layer  | Where                                                     |
| ------ | --------------------------------------------------------- |
| Server | `booking_end_at()` + a guard in `complete_booking`        |
| UI     | `bookingEndInstant()` / `evaluateBookingCompletionGate()` |

Admins keep the override: `admin_set_booking_status` waives the gate and
demands a written reason. That is the documented path for an event that
genuinely ended early.

---

## 3. The settlement flow

```
booking.status = completed          (gated above — the event has ended)
        │
        ▼
   request_settlement(booking, note)                          VENDOR
        │  amount = balance_amount + advance if never released
        │  status: vendor_requested        clock: admin_due_at   (2h)
        │  notify: vendor (receipt), finance admins (work item)
        ▼
   forward_settlement(request, note)                          ADMIN
        │  requires settlement.manage — asks a question, moves no money
        │  status: admin_forwarded         clock: client_due_at  (6h)
        │  notify: client (action), vendor
        ▼
   decide_settlement(request, decision, amount, reason, consent)   CLIENT
        │  consent is mandatory; the server refuses without it
        │
        ├── full     → status: consented              escrow → release_requested
        │              notify: all three
        │
        └── reduced  → status: awaiting_vendor_consent  clock: vendor_due_at (6h)
                       reason mandatory; notify: all three
                              │
                              ▼
                  respond_settlement(request, response, note)     VENDOR
                              │
                              ├── accepted  → status: consented   escrow → release_requested
                              └── contested → open_dispute(), timers frozen,
                                              status: contested
        ▼
   release_settlement(request)                                ADMIN
        │  requires escrow.release
        │
        ├── approved = requested → delegates to approve_escrow_release()
        │                          unchanged: same ledger, same payout
        │
        └── approved < requested → payout(kind=balance, amount=approved)
                                   ledger: dr escrow_held  approved + commission + psp_fee
                                           cr vendor_payable      approved
                                           cr commission_revenue  commission
                                           cr psp_fee_expense     psp_fee
                                   refund(status=requested, requested_by=client,
                                          amount=withheld, reason=admin_discretion)
        ▼
   Finance settles the payout (maker-checker, unchanged), and approves and
   settles the refund through the existing refunds queue.
```

### Why the withheld amount is a refund, raised in the client's name

Two reasons. The refund maker-checker requires approver ≠ requester, and the
client is the party who asked to pay less — so any Finance admin can approve it
without a segregation-of-duties problem. And the withheld money stays in
`escrow_held` until `approve_refund` debits it, which is why
`release_settlement` debits only `approved + commission + psp_fee`: debiting the
shortfall too would double-count it against the escrow account.

**Commission and the processing fee are not reduced.** They were earned on a
booking that happened; the parties adjusted what the _vendor_ is paid, not what
the platform and the processor charged. The refund carries the whole withheld
amount as `agreed_component`.

---

## 4. Clocks

| Setting                             | Default | What expiring does                                                                                          |
| ----------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| `settlement_admin_response_hours`   | 2       | Escalates to admins. Nothing auto-advances — nobody has been asked yet.                                     |
| `settlement_client_response_hours`  | 6       | Recorded as a **full approval** (`decided_automatically`) and handed to Finance to approve. Moves no money. |
| `settlement_vendor_response_hours`  | 6       | Escalates to admins. **Never** treated as accepting a reduction.                                            |
| `settlement_nudge_cooldown_minutes` | 60      | Gap between manual reminders, per request.                                                                  |

Swept by `escalate_settlement`, called from the `escrow-lifecycle` edge
function, which now runs **every 15 minutes** rather than hourly — an hourly
sweep is up to 59 minutes late on a six-hour promise.

The asymmetry is deliberate. Client silence after being asked a direct question
about a finished event converts to approval of what the escrow already held for
the vendor. Vendor silence about a _reduction_ never converts to anything: a
payout the vendor did not agree to is the one that becomes a legal problem.

---

## 5. Consent, and where it lives

| Consent               | Column                                                  | Taken by                                                                 |
| --------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------ |
| Client → the figure   | `client_consent_at`                                     | Checkbox naming the amount, in `SettlementDecisionDialog`                |
| Vendor → a reduction  | `vendor_consent_at`                                     | Checkbox naming the amount and the shortfall, in `SettlementOfferDialog` |
| Sinnapi → the release | `released_by` / `released_at` (+ `payouts.approved_by`) | `SettlementReleaseDialog`, amounts read-only                             |

`settlement_events` is append-only and shown unchanged to all three parties —
decisions, reasons, reminders and escalations. `SettlementPanel` renders it, the
figures and the consent note identically in every portal, so the screen a vendor
describes on the phone is the screen the operator is looking at.

---

## 6. Interaction with the existing release paths

| Path                     | Behaviour                                                                                                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client_confirm_release` | Closes any open request as a full approval by the client — confirming from the escrow card _is_ approving in full.                                                         |
| `approve_escrow_release` | Refuses with `settlement_pending` when an open request is not a full approval. It pays the whole balance by construction, which would overpay against an agreed reduction. |
| `auto_request_release`   | Unchanged. Its 7-day timer covers a client who never engaged at all; this flow's clocks cover one who has just been asked directly.                                        |
| `open_dispute`           | Unchanged, and is where a contested reduction lands. Freezes both timers.                                                                                                  |

---

## 7. Edge cases

| Case                                           | Handling                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------- |
| Vendor requests before the event ends          | Impossible: the request needs `completed`, which needs the event to have ended. |
| Two requests on one booking                    | Partial unique index on `(booking_id)` over the four live statuses.             |
| Vendor asks again after a dispute              | Allowed — `contested` and `cancelled` do not block a fresh request.             |
| Client approves 0                              | Allowed. No payout row is raised; the whole amount is refunded.                 |
| Client confirms release mid-flow               | Request closes as a full approval; escrow proceeds normally.                    |
| Escrow frozen or disputed at release time      | `release_settlement` raises `escrow_frozen`.                                    |
| Vendor has no primary bank account             | Payout is still raised, flagged `vendor_has_no_primary_bank_account`.           |
| Admin tries to release from the escrow console | Blocked by `settlement_pending`; the booking page is the only route.            |
| Client never answers                           | Full approval after 6h, reviewed by a human before release.                     |
| Vendor never answers a reduction               | Escalated to admins; nothing is paid or refunded.                               |

---

## 8. Files

| Layer      | Path                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Migrations | `supabase/migrations/20260818000001…000006`                                                                                          |
| Cron       | `supabase/functions/escrow-lifecycle` (sweep 4)                                                                                      |
| Copy       | `20260818000005_settlement_notifications.sql` (in-app + email per audience)                                                          |
| Shared     | `packages/ui/src/molecules/settlement.ts`, `SettlementFigures`, `SettlementDeadline`, `SettlementTrail`, `organisms/SettlementPanel` |
| Vendor     | `pages/bookingDetail/hooks/useSettlement.ts` + `BookingSettlementCard`                                                               |
| Client     | `pages/bookingDetail/hooks/useSettlementDecision.ts` + `BookingSettlementCard`                                                       |
| Admin      | `pages/bookingDetail/hooks/useSettlementAdmin.ts` + `BookingSettlementCard`                                                          |
