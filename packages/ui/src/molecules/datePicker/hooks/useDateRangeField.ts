'use client';
/**
 * All of `DateRangeField`'s behaviour.
 *
 * Unlike a single date, a range is edited through a *draft*: committing each
 * half as it is clicked would fire a query the moment someone picked a start
 * day, with an end bound they had not chosen yet. The draft is re-seeded from
 * the incoming value every time the panel opens — so an external reset, like a
 * toolbar's "Clear filters", is picked up — and committed when the panel closes,
 * which covers both "picked both ends" and "picked one end and clicked away".
 *
 * An open-ended commit is a legitimate outcome: `From 1 Aug` with no end is a
 * filter people actually want.
 */
import { useCallback, useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { formatIsoRange } from '../formatDate';
import { EMPTY_RANGE, normalizeRange, parseIsoDate, toIsoDate } from '../isoDate';
import type { IsoDateRange } from '../isoDate';
import type { RangePreset } from '../presets';
import type { DateBoundsProps } from '../types';
import { useDayBounds, useDefaultMonth } from './useDayBounds';
import { usePickerPopover } from './usePickerPopover';

export type UseDateRangeFieldOptions = DateBoundsProps & {
  value: IsoDateRange;
  onChange: (next: IsoDateRange) => void;
  onBlur?: () => void;
  disabled?: boolean;
};

export function useDateRangeField({
  value,
  onChange,
  onBlur,
  disabled,
  ...boundProps
}: UseDateRangeFieldOptions) {
  const [draft, setDraft] = useState<IsoDateRange>(value);
  // The close handler runs outside React's render, so it reads the draft from a
  // ref rather than a closure that may have been captured a render ago.
  const draftRef = useRef(draft);
  const committedRef = useRef(value);
  committedRef.current = value;

  const writeDraft = useCallback((next: IsoDateRange) => {
    draftRef.current = next;
    setDraft(next);
  }, []);

  const commit = useCallback(() => {
    const next = normalizeRange(draftRef.current);
    const current = committedRef.current;
    if (next.from !== current.from || next.to !== current.to) onChange(next);
    onBlur?.();
  }, [onChange, onBlur]);

  const popover = usePickerPopover({ disabled, onClose: commit });
  const bounds = useDayBounds(boundProps);
  const defaultMonth = useDefaultMonth(value.from || value.to, bounds);
  const { openPicker, closePicker } = popover;

  /** Re-seed from the committed value so a reopened panel never shows a stale draft. */
  const open = useCallback(() => {
    writeDraft(committedRef.current);
    openPicker();
  }, [writeDraft, openPicker]);

  const selectRange = useCallback(
    (next: DateRange | undefined) => {
      const from = toIsoDate(next?.from ?? null);
      const to = toIsoDate(next?.to ?? null);
      writeDraft({ from, to });
      // Both ends chosen means the interaction is finished — closing here is
      // what commits, via the popover's `onClose`.
      if (from && to) closePicker();
    },
    [writeDraft, closePicker],
  );

  const applyPreset = useCallback(
    (preset: RangePreset) => {
      writeDraft(preset.resolve());
      closePicker();
    },
    [writeDraft, closePicker],
  );

  const clear = useCallback(() => {
    writeDraft(EMPTY_RANGE);
    onChange(EMPTY_RANGE);
    onBlur?.();
  }, [writeDraft, onChange, onBlur]);

  const clearInPanel = useCallback(() => {
    writeDraft(EMPTY_RANGE);
  }, [writeDraft]);

  const selected: DateRange | undefined = draft.from
    ? { from: parseIsoDate(draft.from) ?? undefined, to: parseIsoDate(draft.to) ?? undefined }
    : undefined;

  return {
    popover: { ...popover, openPicker: open },
    bounds,
    defaultMonth,
    draft,
    selected,
    display: formatIsoRange(value),
    /** The half-picked range, echoed in the panel so the state is never a mystery. */
    draftDisplay: formatIsoRange(draft),
    selectRange,
    applyPreset,
    clear,
    clearInPanel,
  };
}
