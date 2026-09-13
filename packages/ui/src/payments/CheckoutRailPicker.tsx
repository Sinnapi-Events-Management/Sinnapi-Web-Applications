'use client';
import { Stack } from '@mui/material';
import type { CheckoutRailOption } from './rails';
import { CheckoutRailCard } from './molecules/CheckoutRailCard';
import { useRadioGroupNavigation } from './hooks/useRadioGroupNavigation';

export type CheckoutRailPickerProps = {
  rails: readonly CheckoutRailOption[];
  selected: number;
  onSelect: (index: number) => void;
  disabled?: boolean;
  /** Names the group for assistive tech; match the visible heading above it. */
  label?: string;
};

/**
 * How the payer wants to pay.
 *
 * Radio rows rather than a select so every choice is visible and comparable
 * with its brand mark beside it. On an escrow checkout the choice also changes
 * the total (the processing fee differs per rail and is passed on); on a
 * subscription it does not, and the same picker says so by leaving the total
 * alone.
 */
export function CheckoutRailPicker({
  rails,
  selected,
  onSelect,
  disabled,
  label = 'Payment method',
}: CheckoutRailPickerProps) {
  const nav = useRadioGroupNavigation({ count: rails.length, selected, onSelect, disabled });

  return (
    <Stack role="radiogroup" aria-label={label} aria-disabled={disabled || undefined} spacing={1}>
      {rails.map((rail, i) => (
        <CheckoutRailCard
          key={`${rail.provider}-${rail.method}`}
          rail={rail}
          selected={i === selected}
          disabled={disabled}
          tabIndex={nav.tabIndexFor(i)}
          optionRef={nav.registerOption(i)}
          onSelect={() => onSelect(i)}
          onKeyDown={(e) => nav.onKeyDown(e, i)}
        />
      ))}
    </Stack>
  );
}
