// escrow-lifecycle — cron, every fifteen minutes. Advances the escrow state
// machine on time.
//
// Five independent sweeps, each isolated so a failure in one cannot stop the
// others. None of them move money out of the platform: the advance sweep only
// raises a payout for Finance to settle by hand, and the auto-release sweep
// only asks a Finance admin to approve. Nothing here settles anything.
//
// The fifth sweep is the odd one out and worth naming: it runs over *bookings*
// rather than escrows, chasing clients who have not funded a confirmed booking.
// It reminds, and when a deadline passes it flags — it never cancels. A booking
// cancelled unattended is a date released out from under a client whose payment
// may be one late webhook away, so the cancellation stays with a person.
//
// ATTRIBUTION (0904). Every one of these sweeps writes an audited table —
// `escrow_transactions`, `payouts`, `bookings` — and until 0904a every row it
// wrote said `actor_id` null, which the console rendered as "system". An
// advance released on a timer and an advance released by a Finance admin
// produced audit rows distinguishable only by the direction of the status
// change. `actor_kind: 'cron'` with `actor_label: 'escrow-lifecycle'` says
// which, and the RPC adopts each escrow's own correlation id so the release
// lands on the same trace as the payment that funded it.
import { handler, json } from '../_shared/http.ts';
import { adminClient, isServiceRoleCaller, HttpError } from '../_shared/supabase.ts';
import { paymentContext, writeAudit, type PaymentContext } from '../_shared/audit.ts';
import { redactMessage } from '../_shared/redact.ts';

// No `req`: a cron's own request headers describe Supabase's infrastructure
// talking to itself, not a caller. See the same note in payment-reconciliation.
const CTX: PaymentContext = paymentContext('cron', 'escrow-lifecycle', 'escrow-lifecycle');

const BATCH = 200;

type Outcome = {
  advancesReleased: number;
  remindersSent: number;
  autoRequested: number;
  settlementsEscalated: number;
  paymentRemindersSent: number;
  paymentsFlaggedOverdue: number;
  errors: string[];
};

Deno.serve(
  handler(async (req) => {
    // Cron-only. The gateway does not verify a JWT here, so this is the only
    // thing standing between an unauthenticated caller and a sweep that
    // releases advances, requests settlements and fires client reminders.
    // pg_cron presents the service-role key as its bearer.
    if (!isServiceRoleCaller(req)) throw new HttpError(401, 'unauthorized');

    const supa = adminClient();
    const now = new Date().toISOString();
    const out: Outcome = {
      advancesReleased: 0,
      remindersSent: 0,
      autoRequested: 0,
      settlementsEscalated: 0,
      paymentRemindersSent: 0,
      paymentsFlaggedOverdue: 0,
      errors: [],
    };

    // -----------------------------------------------------------------
    // 1. Advances that have come due.
    //
    // The window opens `advance_release_days_before` days ahead of the event,
    // set per booking on the quotation. Frozen escrows (open dispute) are
    // excluded by the query, not just by the RPC, so a large dispute backlog
    // cannot crowd out the rest of the batch.
    // -----------------------------------------------------------------
    const { data: dueAdvances, error: advError } = await supa
      .from('escrow_transactions')
      .select('id')
      .in('status', ['held', 'awaiting_advance'])
      .is('advance_released_at', null)
      .is('timers_frozen_at', null)
      .not('advance_release_due_at', 'is', null)
      .lte('advance_release_due_at', now)
      .limit(BATCH);

    if (advError) out.errors.push(`advance_query: ${advError.message}`);

    for (const e of dueAdvances ?? []) {
      // `p_context` names the sweep; the correlation id is resolved inside the
      // RPC from the escrow's funding payment, which is the only correct
      // answer — the money being released is the money that arrived on it.
      const { error } = await supa.rpc('release_advance', {
        p_escrow_id: e.id,
        p_context: CTX,
      });
      if (error) {
        out.errors.push(`release_advance ${e.id}: ${redactMessage(error.message)}`);
        // A due advance that could not be released is money a vendor is owed
        // and has not been paid. Previously it existed only as a string in the
        // sweep's HTTP response, which nothing reads.
        await writeAudit(supa, CTX, {
          action: 'advance_release_failed',
          entityType: 'escrow_transactions',
          entityId: e.id,
          detail: { reason: redactMessage(error.message) },
        });
      } else {
        out.advancesReleased++;
      }
    }

    // -----------------------------------------------------------------
    // 2. Reminders to confirm, on the configured day offsets.
    //
    // `last_reminder_day` records the highest offset already sent, so a job
    // that runs hourly sends each reminder exactly once.
    // -----------------------------------------------------------------
    const { data: reminderSetting } = await supa
      .from('platform_settings')
      .select('value')
      .eq('key', 'escrow_release_reminder_days')
      .maybeSingle();
    const { data: windowSetting } = await supa
      .from('platform_settings')
      .select('value')
      .eq('key', 'escrow_auto_release_days')
      .maybeSingle();

    const reminderDays: number[] = Array.isArray(reminderSetting?.value)
      ? (reminderSetting!.value as number[])
      : [1, 3, 6];
    const autoReleaseDays = Number(windowSetting?.value ?? 7);

    const { data: awaiting, error: awaitError } = await supa
      .from('escrow_transactions')
      .select('id, auto_release_due_at, last_reminder_day, balance_amount')
      .in('status', ['held', 'advance_released'])
      .is('timers_frozen_at', null)
      .is('client_confirmed_at', null)
      .not('auto_release_due_at', 'is', null)
      .limit(BATCH);

    if (awaitError) out.errors.push(`reminder_query: ${awaitError.message}`);

    for (const e of awaiting ?? []) {
      // Days elapsed since the window opened = total window minus days left.
      const msLeft = new Date(e.auto_release_due_at as string).getTime() - Date.now();
      const daysElapsed = autoReleaseDays - Math.ceil(msLeft / 86_400_000);

      const due = reminderDays
        .filter((d) => d <= daysElapsed && d > (e.last_reminder_day ?? 0))
        .sort((a, b) => b - a)[0];
      if (due == null) continue;

      const { error } = await supa.rpc('escrow_notify', {
        p_escrow_id: e.id,
        p_event: 'release_reminder_sent',
        p_trigger: 'escrow.release_reminder',
        p_to_client: true,
        p_to_vendor: false,
        p_to_admin: false,
        p_amount: e.balance_amount,
        p_metadata: { reminder_day: due, auto_release_days: autoReleaseDays },
        // This is the one place a notification is sent from OUTSIDE a money
        // RPC, so it is its own transaction with no context in it. Without
        // this, every reminder the sweep sends writes an `escrow_events` row
        // attributed to 'system' — indistinguishable from an IPN's.
        p_context: CTX,
      });
      if (error) {
        out.errors.push(`reminder ${e.id}: ${error.message}`);
        continue;
      }
      // Only stamp after the notification is safely enqueued, so a failure
      // here means the reminder is retried rather than silently skipped.
      await supa.from('escrow_transactions').update({ last_reminder_day: due }).eq('id', e.id);
      out.remindersSent++;
    }

    // -----------------------------------------------------------------
    // 3. Auto-request release where the client never confirmed.
    //
    // This does not release anything. It moves the escrow to
    // release_requested so a Finance admin reviews it — the same state a
    // client confirmation produces. Money still needs a human.
    // -----------------------------------------------------------------
    const { data: overdue, error: overdueError } = await supa
      .from('escrow_transactions')
      .select('id')
      .in('status', ['held', 'advance_released'])
      .is('timers_frozen_at', null)
      .not('auto_release_due_at', 'is', null)
      .lte('auto_release_due_at', now)
      .limit(BATCH);

    if (overdueError) out.errors.push(`auto_release_query: ${overdueError.message}`);

    for (const e of overdue ?? []) {
      const { error } = await supa.rpc('auto_request_release', {
        p_escrow_id: e.id,
        p_context: CTX,
      });
      if (error) out.errors.push(`auto_request_release ${e.id}: ${error.message}`);
      else out.autoRequested++;
    }

    // -----------------------------------------------------------------
    // 4. Settlement clocks that have run out.
    //
    // These are the short ones — hours, not days — because they run after the
    // event, with a vendor waiting to be paid for work already delivered. Only
    // one of the three advances anything: a client who was asked directly and
    // did not answer has their request recorded as a full approval and handed
    // to Finance. A vendor who has not answered a *reduction* is never treated
    // as having accepted it, and a request no admin has forwarded has not been
    // put to anyone yet; both of those escalate to a person instead.
    //
    // `escalate_settlement` re-checks every clock under a row lock, so a query
    // that goes slightly stale between the select and the call cannot escalate
    // something that was answered in between.
    // -----------------------------------------------------------------
    const { data: settlements, error: settlementError } = await supa
      .from('settlement_requests')
      .select('id, status, admin_due_at, client_due_at, vendor_due_at')
      .in('status', ['vendor_requested', 'admin_forwarded', 'awaiting_vendor_consent'])
      .or(
        `and(status.eq.vendor_requested,admin_due_at.lte.${now}),` +
          `and(status.eq.admin_forwarded,client_due_at.lte.${now}),` +
          `and(status.eq.awaiting_vendor_consent,vendor_due_at.lte.${now})`,
      )
      .limit(BATCH);

    if (settlementError) out.errors.push(`settlement_query: ${settlementError.message}`);

    for (const s of settlements ?? []) {
      const { data, error } = await supa.rpc('escalate_settlement', { p_request_id: s.id });
      if (error) out.errors.push(`escalate_settlement ${s.id}: ${error.message}`);
      else if (data !== 'noop') out.settlementsEscalated++;
    }

    // -----------------------------------------------------------------
    // 5. Clients who have not funded a confirmed booking yet.
    //
    // This sweep runs on bookings, not on escrows, and that is the point: the
    // client who most needs chasing is the one who never opened a checkout,
    // and that client has no escrow row for an escrow-shaped sweep to find.
    //
    // Reminders first, then the overdue flag, in that order and in one pass —
    // so a booking whose last reminder mark and whose deadline both come due
    // in the same tick gets the reminder before it gets the "you missed it".
    // The reverse order sends those two messages backwards.
    // -----------------------------------------------------------------
    const { data: reminderHoursSetting } = await supa
      .from('platform_settings')
      .select('value')
      .eq('key', 'booking_payment_reminder_hours')
      .maybeSingle();

    const paymentReminderHours: number[] = Array.isArray(reminderHoursSetting?.value)
      ? (reminderHoursSetting!.value as number[])
      : [24, 6, 1];

    const { data: unpaid, error: unpaidError } = await supa
      .from('bookings')
      .select(
        'id, payment_due_at, payment_due_override_at, payment_overdue_at, last_payment_reminder_hour',
      )
      .eq('payment_type', 'escrow')
      .eq('status', 'confirmed')
      .is('payment_settled_at', null)
      .is('deleted_at', null)
      .not('payment_due_at', 'is', null)
      .limit(BATCH);

    if (unpaidError) out.errors.push(`unpaid_query: ${unpaidError.message}`);

    for (const b of unpaid ?? []) {
      // The override is the deadline in force when one exists — the same
      // precedence `booking_payment_deadline` applies server-side.
      const dueAt = new Date((b.payment_due_override_at ?? b.payment_due_at) as string).getTime();

      if (dueAt > Date.now()) {
        const hoursLeft = (dueAt - Date.now()) / 3_600_000;
        // The largest mark that has been passed and not yet sent. Taking the
        // largest rather than the smallest means a job that misses a few ticks
        // sends one reminder for the mark it skipped, not a burst of three.
        const mark = paymentReminderHours
          .filter((h) => h >= hoursLeft && h < (b.last_payment_reminder_hour ?? Infinity))
          .sort((x, y) => y - x)[0];
        if (mark == null) continue;

        const { data, error } = await supa.rpc('remind_booking_payment', {
          p_booking_id: b.id,
          p_hours_mark: mark,
        });
        if (error) out.errors.push(`remind_booking_payment ${b.id}: ${error.message}`);
        else if (data !== 'noop') out.paymentRemindersSent++;
        continue;
      }

      // Past the deadline. `flag_booking_payment_overdue` re-checks every
      // condition under a row lock and stamps once, so a query that went stale
      // between the select and the call cannot flag a booking that was paid or
      // extended in between — and cannot flag the same one twice.
      if (b.payment_overdue_at) continue;

      const { data, error } = await supa.rpc('flag_booking_payment_overdue', {
        p_booking_id: b.id,
      });
      if (error) out.errors.push(`flag_booking_payment_overdue ${b.id}: ${error.message}`);
      else if (data !== 'noop') out.paymentsFlaggedOverdue++;
    }

    if (out.errors.length) {
      console.error(
        JSON.stringify({ level: 'error', message: 'escrow_lifecycle_errors', errors: out.errors }),
      );
    }
    return json(req, { ok: true, ...out });
  }),
);
