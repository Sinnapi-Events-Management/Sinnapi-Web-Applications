// escrow-lifecycle — cron, hourly. Advances the escrow state machine on time.
//
// Three independent sweeps, each isolated so a failure in one cannot stop the
// others. None of them move money out of the platform: the advance sweep only
// raises a payout for Finance to settle by hand, and the auto-release sweep
// only asks a Finance admin to approve. Nothing here settles anything.
import { handler, json } from '../_shared/http.ts';
import { adminClient } from '../_shared/supabase.ts';

const BATCH = 200;

type Outcome = {
  advancesReleased: number;
  remindersSent: number;
  autoRequested: number;
  errors: string[];
};

Deno.serve(
  handler(async (req) => {
    const supa = adminClient();
    const now = new Date().toISOString();
    const out: Outcome = { advancesReleased: 0, remindersSent: 0, autoRequested: 0, errors: [] };

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
      const { error } = await supa.rpc('release_advance', { p_escrow_id: e.id });
      if (error) out.errors.push(`release_advance ${e.id}: ${error.message}`);
      else out.advancesReleased++;
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
      const { error } = await supa.rpc('auto_request_release', { p_escrow_id: e.id });
      if (error) out.errors.push(`auto_request_release ${e.id}: ${error.message}`);
      else out.autoRequested++;
    }

    if (out.errors.length) {
      console.error(
        JSON.stringify({ level: 'error', message: 'escrow_lifecycle_errors', errors: out.errors }),
      );
    }
    return json(req, { ok: true, ...out });
  }),
);
