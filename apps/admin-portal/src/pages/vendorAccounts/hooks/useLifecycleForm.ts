import { useCallback, useEffect, useMemo, useState } from 'react';
import { SUSPENSION_PRESETS, type LifecycleSpec } from '../schema/actions';

/** Days → an ISO instant that many days from now, at the current time of day. */
function daysFromNow(days: number): string {
  const until = new Date();
  until.setDate(until.getDate() + days);
  return until.toISOString();
}

/** `2026-09-03` from a date input → the end of that day, in the local zone. */
function endOfLocalDay(value: string): string | null {
  const parsed = new Date(`${value}T23:59:59`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** Today + 1, as `yyyy-mm-dd` — the earliest a custom suspension may end. */
function tomorrowInputValue(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Form state for the lifecycle dialog: the justification, and — for a
 * suspension — how long it runs.
 *
 * Split out of the dialog so the dialog is structure and this is the rules.
 * The rules are not trivial: which fields apply depends on the action, a preset
 * and a hand-picked date resolve to the same submitted value by different
 * routes, and `canSubmit` has to agree with what `manage-vendor-account` will
 * accept or the operator meets a server error for something the form could have
 * told them.
 *
 * `resetKey` identifies which account+action the form is currently for, and
 * every change to it wipes the fields. The dialog component stays mounted
 * between opens, so without this a justification typed for one vendor would
 * still be sitting in the box when the next vendor's dialog opens — which is
 * how a wrong reason ends up in the audit log against the wrong account.
 */
export function useLifecycleForm(spec: LifecycleSpec | null, resetKey: string | null) {
  const [reason, setReason] = useState('');
  const [presetDays, setPresetDays] = useState<number | null>(SUSPENSION_PRESETS[0].days);
  const [customDate, setCustomDate] = useState('');

  useEffect(() => {
    setReason('');
    setPresetDays(SUSPENSION_PRESETS[0].days);
    setCustomDate('');
  }, [resetKey]);

  const minCustomDate = useMemo(tomorrowInputValue, []);

  // `null` means "the operator has not produced a usable date yet", which is
  // what blocks submission — distinct from "this action has no date".
  const suspendedUntil = useMemo(() => {
    if (!spec?.requiresUntil) return undefined;
    if (presetDays !== null) return daysFromNow(presetDays);
    return customDate ? endOfLocalDay(customDate) : null;
  }, [spec, presetDays, customDate]);

  const reasonOk = !spec?.requiresReason || reason.trim().length >= 4;
  const untilOk = !spec?.requiresUntil || Boolean(suspendedUntil);
  const canSubmit = reasonOk && untilOk;

  const submission = useCallback(
    () => ({ reason: reason.trim(), suspendedUntil: suspendedUntil ?? undefined }),
    [reason, suspendedUntil],
  );

  return {
    reason,
    setReason,
    presetDays,
    setPresetDays,
    customDate,
    setCustomDate,
    minCustomDate,
    /** True once the preset is "Custom date…" and the date field should show. */
    isCustom: presetDays === null,
    canSubmit,
    submission,
  };
}
