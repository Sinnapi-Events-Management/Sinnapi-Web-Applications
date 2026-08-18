'use client';
import { useEffect, useState } from 'react';
import { Alert, Snackbar, type SnackbarProps } from '@mui/material';
import type { ToastMessage } from './types';

export type ToastProps = {
  /** The outcome to announce, or null when there is nothing to say. */
  toast: ToastMessage | null;
  onClose: () => void;
  /**
   * Milliseconds on screen, or null to stay until dismissed. Left unset,
   * successes and notes fade and errors stay — an operator who missed a green
   * "sent" can read the page instead, but one who missed a red line cannot.
   */
  autoHideDuration?: number | null;
  anchorOrigin?: SnackbarProps['anchorOrigin'];
};

const DEFAULT_ANCHOR: SnackbarProps['anchorOrigin'] = { vertical: 'top', horizontal: 'right' };
const DEFAULT_DURATION = 6000;

/**
 * Clears `PortalShell`'s fixed top bar, plus a gap.
 *
 * The bar is a default MUI `Toolbar` (56 on xs, 64 from sm up) and the shell
 * pins it with `position="fixed"`; a Snackbar outranks it on z-index, so a top
 * toast left at MUI's 24px would land on the breadcrumbs rather than under
 * them. Anything anchored to the bottom ignores this.
 */
const TOP_BAR_OFFSET = { xs: 64, sm: 72 };

/**
 * Long copy wraps instead of stretching. A toast reporting counts — "… now
 * holds 1,204 contacts, 12 added, 1,192 already there" — is a paragraph, and a
 * custom child gets none of `SnackbarContent`'s own width bounds.
 */
const MAX_WIDTH = 440;

/**
 * The one toast in the design system.
 *
 * ── Why this exists rather than a Snackbar per page ───────────────────────
 * MUI's `Snackbar` renders its own black bar when handed a bare `message`, so a
 * screen that reaches for the raw primitive announces success in the same
 * charcoal slab used for undo prompts — off-palette, and severity-blind. Every
 * portal had therefore grown the same hand-rolled `Snackbar` + filled `Alert`
 * pair, and they had already drifted on placement and duration. This is that
 * pair, decided once.
 *
 * ── Top right, under the chrome ───────────────────────────────────────────
 * Placement is a system decision, not a per-screen one, so it is a default here
 * rather than a prop each page remembers to pass. Top right keeps the bar clear
 * of the thing an operator just pressed — send, save and submit all sit bottom
 * right of a form or a dialog — and clear of the FAB corner. It tucks under the
 * portal's top bar so the two read as one column of chrome.
 *
 * ── Two deliberate behaviours ─────────────────────────────────────────────
 * The message survives the close transition: driving the text straight off a
 * nullable prop empties the alert mid-fade, so the last one is held locally
 * until the bar is gone. And a click elsewhere on the page does not dismiss —
 * `clickaway` is ignored, because typing on into the form behind a toast is not
 * a statement that its message was read.
 */
export function Toast({
  toast,
  onClose,
  autoHideDuration,
  anchorOrigin = DEFAULT_ANCHOR,
}: ToastProps) {
  const [shown, setShown] = useState<ToastMessage | null>(toast);

  // Compared by value, not identity: call sites build this object inline
  // (`toast={saved ? {…} : null}`), and re-rendering the same message must not
  // cost a state update.
  useEffect(() => {
    if (!toast) return;
    setShown((prev) =>
      prev && prev.message === toast.message && prev.severity === toast.severity ? prev : toast,
    );
  }, [toast]);

  const severity = shown?.severity ?? 'success';
  const duration =
    autoHideDuration !== undefined
      ? autoHideDuration
      : severity === 'error'
        ? null
        : DEFAULT_DURATION;

  return (
    <Snackbar
      open={Boolean(toast)}
      autoHideDuration={duration}
      anchorOrigin={anchorOrigin}
      sx={anchorOrigin?.vertical === 'top' ? { top: TOP_BAR_OFFSET } : undefined}
      onClose={(_, reason) => {
        if (reason !== 'clickaway') onClose();
      }}
    >
      {/* `borderRadius` and the severity colours come from the theme — a filled
          Alert is a Paper, so it already rounds to `radius.md` like every other
          floating surface. Only elevation is stated: MUI ships alerts flat, and
          a bar hovering over the page has to read as lifted off it. */}
      <Alert
        severity={severity}
        variant="filled"
        onClose={onClose}
        sx={{ width: '100%', maxWidth: { sm: MAX_WIDTH }, boxShadow: 6, alignItems: 'center' }}
      >
        {shown?.message ?? ''}
      </Alert>
    </Snackbar>
  );
}
