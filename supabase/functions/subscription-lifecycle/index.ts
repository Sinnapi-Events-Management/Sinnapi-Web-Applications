// subscription-lifecycle — cron, every fifteen minutes. service_role.
//
// Two sweeps, isolated so a failure in one cannot stop the other.
//
//   1. apply_subscription_state — rolls trials and periods into grace,
//      expires after the configurable grace window, and hides the vendor —
//      but only a vendor who has had at least one renewal prompt. One who
//      was never prompted is flagged for Finance instead (0903l).
//
//   2. Pay-to-renew reminders. Pesapal mobile money has no card-on-file and
//      no merchant-initiated debit, so `auto_renew` cannot mean auto-charge;
//      it means "remind me". This sweep sends one reminder per configured
//      day-offset before the period (or trial) ends, following the
//      platform_settings + last-mark pattern escrow-lifecycle uses. The RPC
//      re-checks everything under a row lock, so a query that went stale
//      between the select and the call cannot remind a subscription that
//      was just paid, and cannot send the same mark twice.
import { handler, json } from '../_shared/http.ts';
import { adminClient, isServiceRoleCaller, HttpError } from '../_shared/supabase.ts';

const BATCH = 200;

type Outcome = {
  transitioned: number;
  remindersSent: number;
  errors: string[];
};

Deno.serve(
  handler(async (req) => {
    // Cron-only. The gateway does not verify a JWT here, and
    // apply_subscription_state is revoked from end users for the same reason:
    // rolling trials and periods over is not something a visitor gets to
    // trigger. pg_cron presents the service-role key as its bearer.
    if (!isServiceRoleCaller(req)) throw new HttpError(401, 'unauthorized');

    const supa = adminClient();
    const out: Outcome = { transitioned: 0, remindersSent: 0, errors: [] };

    // -----------------------------------------------------------------
    // 1. State transitions.
    // -----------------------------------------------------------------
    const { data: transitioned, error: stateError } = await supa.rpc('apply_subscription_state', {
      p_context: CTX,
    });
    if (stateError) {
      out.errors.push(`apply_subscription_state: ${redactMessage(stateError.message)}`);
      // A state sweep that did not run leaves expired subscriptions active and
      // paid ones un-renewed. Worth a row: it previously existed only as a
      // string in this function's HTTP response, which nothing reads.
      await writeAudit(supa, CTX, {
        action: 'subscription_sweep_failed',
        entityType: 'subscriptions',
        detail: { reason: redactMessage(stateError.message), sweep: 'apply_subscription_state' },
      });
    } else {
      out.transitioned = Number(transitioned ?? 0);
    }

    // -----------------------------------------------------------------
    // 2. Renewal reminders on the configured day offsets.
    //
    // The largest mark that has been passed and not yet sent wins, so a job
    // that misses a few ticks sends one reminder for the mark it skipped,
    // not a burst. `last_renewal_reminder_day` is the closest mark already
    // sent this period; the RPC resets it when a payment starts a new one.
    // -----------------------------------------------------------------
    const { data: reminderSetting } = await supa
      .from('platform_settings')
      .select('value')
      .eq('key', 'subscription_renewal_reminder_days')
      .maybeSingle();

    const reminderDays: number[] = Array.isArray(reminderSetting?.value)
      ? (reminderSetting!.value as number[]).map(Number).filter((d) => Number.isFinite(d) && d > 0)
      : [7, 3, 1];

    if (reminderDays.length > 0) {
      const horizon = new Date(Date.now() + Math.max(...reminderDays) * 86_400_000).toISOString();
      const now = new Date().toISOString();

      // Trials end on trial_ends_at; paid periods on current_period_end.
      // Both are read and the RPC picks the one that applies to the status.
      const { data: due, error: dueError } = await supa
        .from('subscriptions')
        .select('id, status, trial_ends_at, current_period_end, last_renewal_reminder_day')
        .in('status', ['trialing', 'active'])
        .eq('auto_renew', true)
        .is('deleted_at', null)
        .or(
          `and(status.eq.active,current_period_end.gt.${now},current_period_end.lte.${horizon}),` +
            `and(status.eq.trialing,trial_ends_at.gt.${now},trial_ends_at.lte.${horizon})`,
        )
        .limit(BATCH);

      if (dueError) out.errors.push(`reminder_query: ${dueError.message}`);

      for (const s of due ?? []) {
        const endAt = s.status === 'trialing' ? s.trial_ends_at : s.current_period_end;
        if (!endAt) continue;
        const daysLeft = Math.ceil((new Date(endAt as string).getTime() - Date.now()) / 86_400_000);

        const mark = reminderDays
          .filter((d) => d >= daysLeft && d < (s.last_renewal_reminder_day ?? Infinity))
          .sort((a, b) => b - a)[0];
        if (mark == null) continue;

        const { data, error } = await supa.rpc('remind_subscription_renewal', {
          p_subscription_id: s.id,
          p_day_mark: mark,
          p_context: CTX,
        });
        if (error) out.errors.push(`remind_subscription_renewal ${s.id}: ${error.message}`);
        else if (data !== 'noop') out.remindersSent++;
      }
    }

    if (out.errors.length) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'subscription_lifecycle_errors',
          errors: out.errors,
        }),
      );
    }
    return json(req, { ok: true, ...out });
  }),
);
