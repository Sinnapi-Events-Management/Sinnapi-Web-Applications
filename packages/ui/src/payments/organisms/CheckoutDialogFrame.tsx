'use client';
import { useId, type ReactNode } from 'react';
import { Box, Dialog, DialogActions, DialogContent, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { CheckoutDialogHeader } from '../molecules/CheckoutDialogHeader';
import { useCheckoutDialogLayout } from '../hooks/useCheckoutDialogLayout';

export type CheckoutDialogFrameProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  /** The decisions — schedule, payment method, consent. */
  children: ReactNode;
  /** The `CheckoutSummaryPanel`. */
  summary: ReactNode;
  /** The `CheckoutActions`. */
  actions: ReactNode;
  /**
   * The total, restated in the pinned footer on narrow screens, where the
   * summary panel has usually scrolled out of view by the time the payer
   * reaches the button.
   */
  footerTotal?: { label: string; amount: string | null };
  /** Dialogs that open over this one — the FX confirmation step. */
  overlays?: ReactNode;
};

/**
 * The frame every hosted-checkout dialog is laid out in, for escrow funding
 * and subscriptions alike.
 *
 * From `md` up it is two columns: the decisions on the left, and a summary
 * rail on the right holding the total and the Pay button, which stays in
 * place while the decisions scroll. Below `md` it is one column with the
 * summary after the decisions and the total and actions pinned in a footer, so
 * the button is never scrolled away. Below `sm` the dialog takes the whole
 * screen.
 *
 * Layout only; the breakpoint rules are `useCheckoutDialogLayout`.
 */
export function CheckoutDialogFrame({
  open,
  onClose,
  title,
  subtitle,
  children,
  summary,
  actions,
  footerTotal,
  overlays,
}: CheckoutDialogFrameProps) {
  const { fullScreen, hasRail } = useCheckoutDialogLayout();
  const titleId = useId();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby={titleId}
      maxWidth={hasRail ? 'md' : 'sm'}
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{ sx: { borderRadius: fullScreen ? 0 : 4, backgroundImage: 'none' } }}
    >
      <CheckoutDialogHeader titleId={titleId} title={title} subtitle={subtitle} onClose={onClose} />

      <DialogContent
        dividers
        sx={{
          p: 0,
          display: 'grid',
          alignItems: 'start',
          gridTemplateColumns: hasRail
            ? 'minmax(0, 1fr) clamp(320px, 42%, 380px)'
            : 'minmax(0, 1fr)',
        }}
      >
        <Stack spacing={3.5} sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}>
          {children}
          {!hasRail && <SummarySurface>{summary}</SummarySurface>}
        </Stack>

        {hasRail && (
          <Box
            component="aside"
            aria-label="Payment summary"
            sx={{
              position: 'sticky',
              top: 0,
              alignSelf: 'stretch',
              p: 3,
              borderLeft: 1,
              borderColor: 'divider',
              bgcolor: (t) => alpha(t.palette.text.primary, 0.025),
            }}
          >
            <Stack spacing={3} sx={{ position: 'sticky', top: 24 }}>
              {summary}
              {actions}
            </Stack>
          </Box>
        )}
      </DialogContent>

      {!hasRail && (
        <DialogActions
          // MUI's default spacing left-margins every child after the first,
          // which indents the button row once the footer is a column.
          disableSpacing
          sx={{
            px: { xs: 2, sm: 3 },
            py: 1.5,
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 1,
          }}
        >
          {footerTotal && (
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}>
              <Typography variant="body2" color="text.secondary">
                {footerTotal.label}
              </Typography>
              <Typography
                variant="h6"
                component="p"
                fontWeight={800}
                sx={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {footerTotal.amount ?? '—'}
              </Typography>
            </Stack>
          )}
          {actions}
        </DialogActions>
      )}

      {overlays}
    </Dialog>
  );
}

/** The summary's card surface when it sits inline rather than in the rail. */
function SummarySurface({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 4,
        border: 1,
        borderColor: 'divider',
        bgcolor: (t) => alpha(t.palette.text.primary, 0.025),
      }}
    >
      {children}
    </Box>
  );
}
