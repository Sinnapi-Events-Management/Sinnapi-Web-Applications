'use client';
import { useMediaQuery, useTheme } from '@mui/material';

export type CheckoutDialogLayout = {
  /** Phones: the dialog takes the whole screen instead of floating. */
  fullScreen: boolean;
  /** Desktop: the summary is a rail beside the form rather than a footer under it. */
  hasRail: boolean;
};

/**
 * The two breakpoint decisions every checkout dialog makes, in one place.
 *
 * A floating `sm` dialog on a phone wastes the margins around it on a screen
 * where the Pay button was already scrolling out of reach; full-screen hands
 * that room back. From `md` up there is width for the summary to sit beside
 * the choices and stay put while they scroll — the same rail
 * `OutcomeLayout` uses on the page the payer lands on afterwards, so the
 * money is in the same place before and after they pay.
 *
 * `noSsr` because both values decide the first paint: the default-false first
 * pass would render the phone layout on a desktop and then snap.
 */
export function useCheckoutDialogLayout(): CheckoutDialogLayout {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });
  const hasRail = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  return { fullScreen, hasRail };
}
