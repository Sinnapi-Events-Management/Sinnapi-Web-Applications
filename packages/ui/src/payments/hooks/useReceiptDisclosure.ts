'use client';
import { useCallback, useState } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';

export type ReceiptDisclosure = {
  /** Whether the itemised lines are currently showing. */
  open: boolean;
  toggle: () => void;
  /** True once there is room for the rail — the breakdown's default-open case. */
  hasRoom: boolean;
};

/**
 * Whether the receipt's line items start open.
 *
 * In the desktop rail there is room to show the itemisation outright, and
 * Baymard's order-confirmation work is blunt about it: the summary should be
 * readable, not buried behind a tap. On a phone the same lines push the
 * "what happens next" steps below the fold, so there they start collapsed.
 *
 * A payer's own toggle outranks the breakpoint from then on, including across
 * a resize or rotate — someone who closed the breakdown did not ask for it
 * back because the window got wider.
 *
 * `noSsr` is set because this decides initial open state: the default-false
 * first pass a media query otherwise returns would render the rail collapsed
 * and then pop it open on hydration.
 */
export function useReceiptDisclosure(): ReceiptDisclosure {
  const theme = useTheme();
  const hasRoom = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const [chosen, setChosen] = useState<boolean | null>(null);

  const open = chosen ?? hasRoom;
  const toggle = useCallback(() => setChosen(!open), [open]);

  return { open, toggle, hasRoom };
}
