'use client';
import type { ReactNode } from 'react';
import { Box, Button, Collapse, Divider, Paper, Stack } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { MoneyBreakdown, type MoneyBreakdownProps } from '../../molecules/MoneyBreakdown';
import { ReceiptTotal } from '../atoms/ReceiptTotal';
import { useReceiptDisclosure } from '../hooks/useReceiptDisclosure';

export type ReceiptPanelProps = {
  /** What the headline figure is — "Total paid", "Charged". */
  totalLabel: string;
  /** The headline figure, already formatted by the caller. */
  totalAmount: string;
  /** Optional line under the figure — what protects it, or when it cleared. */
  totalCaption?: ReactNode;
  /** Itemisation. Omit to show the figure alone. */
  breakdown?: Omit<MoneyBreakdownProps, 'dense'>;
  /** Label on the disclosure button. */
  disclosureLabel?: string;
  /** Rendered under the breakdown — a trust note, a link to the receipt. */
  footer?: ReactNode;
};

/**
 * The receipt, as the rail beside a confirmed payment.
 *
 * Escrow charges commission and the processing fee on top of the amount the
 * client agreed with their vendor, so the figure paid is larger than the one
 * negotiated. That is exactly the number a payer checks twice, which is why
 * the itemisation is shown rather than summarised: the total is never
 * presented without its parts.
 *
 * Whether those parts start visible is `useReceiptDisclosure`'s call, not
 * this component's — layout here, the breakpoint rule in one place.
 */
export function ReceiptPanel({
  totalLabel,
  totalAmount,
  totalCaption,
  breakdown,
  disclosureLabel = 'Receipt breakdown',
  footer,
}: ReceiptPanelProps) {
  const { open, toggle } = useReceiptDisclosure();

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 4,
        p: { xs: 2.5, sm: 3 },
        // A hair recessed from the card beside it, in both schemes: the wash
        // is the divider ink at low alpha, which is already scheme-aware.
        bgcolor: (t) => alpha(t.palette.divider, 0.035),
      }}
    >
      <Stack spacing={2}>
        <ReceiptTotal label={totalLabel} amount={totalAmount} caption={totalCaption} />

        {breakdown && (
          <>
            <Divider />
            <Box>
              <Button
                onClick={toggle}
                size="small"
                color="inherit"
                aria-expanded={open}
                endIcon={
                  <ExpandMoreIcon
                    sx={{
                      transition: (t) => t.transitions.create('transform'),
                      transform: open ? 'rotate(180deg)' : 'none',
                    }}
                  />
                }
                sx={{
                  px: 0,
                  fontWeight: 600,
                  justifyContent: 'space-between',
                  width: '100%',
                  color: 'text.secondary',
                  '&:hover': { bgcolor: 'transparent', color: 'text.primary' },
                }}
              >
                {disclosureLabel}
              </Button>
              <Collapse in={open} unmountOnExit>
                <Box sx={{ pt: 2 }}>
                  <MoneyBreakdown {...breakdown} dense wrapLabels />
                </Box>
              </Collapse>
            </Box>
          </>
        )}

        {/* No rule above the footer: it carries its own edge — an info alert
            or a muted note — and a divider as well read as two separators
            stacked on one boundary. */}
        {footer}
      </Stack>
    </Paper>
  );
}
