'use client';
import type { ReactNode } from 'react';
import { Box, Card, CardActionArea, Stack, Typography } from '@mui/material';

export type RecordCardProps = {
  /** Who or what — usually a person's name. */
  title: ReactNode;
  /** The money figure, already formatted. */
  amount?: ReactNode;
  /** Second line: date, reference, method. Kept to one line. */
  meta?: ReactNode;
  /** Status chip, bottom right. */
  chip?: ReactNode;
  /** Optional extra row, e.g. a payment-deadline chip. */
  footer?: ReactNode;
  /** Makes the whole card one tap target. Omit for read-only records. */
  onClick?: () => void;
};

/**
 * One row of a list, shaped for a phone: name and amount on top, details and
 * status underneath, the whole card tappable. A table with six columns on a
 * 390px screen hides the amount and status off the right edge, which are the
 * two things a vendor opened the list to see.
 */
export function RecordCard({ title, amount, meta, chip, footer, onClick }: RecordCardProps) {
  const body = (
    <Stack spacing={0.75}>
      <Stack direction="row" justifyContent="space-between" spacing={1.5} alignItems="baseline">
        <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ minWidth: 0 }}>
          {title}
        </Typography>
        {amount != null && (
          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}
          >
            {amount}
          </Typography>
        )}
      </Stack>
      {(meta != null || chip != null) && (
        <Stack direction="row" justifyContent="space-between" spacing={1.5} alignItems="center">
          <Typography variant="body2" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
            {meta}
          </Typography>
          {chip != null && <Box sx={{ flexShrink: 0 }}>{chip}</Box>}
        </Stack>
      )}
      {/* A flex row so a chip here keeps its own width instead of stretching. */}
      {footer && <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>{footer}</Box>}
    </Stack>
  );

  return (
    <Card variant="outlined">
      {onClick ? (
        <CardActionArea onClick={onClick} sx={{ p: 1.75 }}>
          {body}
        </CardActionArea>
      ) : (
        <Box sx={{ p: 1.75 }}>{body}</Box>
      )}
    </Card>
  );
}
