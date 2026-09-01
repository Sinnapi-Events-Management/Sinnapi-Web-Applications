'use client';
import type { ReactNode } from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import { OfferCard } from '../molecules/OfferCard';
import { useOfferClock } from '../hooks/useOfferClock';
import type { OfferModel } from '../types';

export type OfferGridProps<T extends OfferModel> = {
  offers: readonly T[];
  /** The eyebrow, price and action for one card. Every audience's differ. */
  renderEyebrow?: (offer: T) => ReactNode;
  renderPrice?: (offer: T) => ReactNode;
  renderAction?: (offer: T) => ReactNode;
  renderHeaderAction?: (offer: T) => ReactNode;
  /** Shown in place of the grid when there is nothing. */
  emptyTitle?: string;
  emptyBody?: string;
  /** Cards per row at `md` and up. Two by default. */
  columns?: 2 | 3;
};

/**
 * A responsive grid of offers.
 *
 * One clock for the whole grid, resolved here and threaded into every card, so
 * thirty deadlines are computed against one instant rather than thirty. That is
 * the only piece of state this component owns, and it is the reason the grid
 * exists at all rather than each page mapping `OfferCard` itself.
 *
 * Full width on a phone and never three-across below `lg`: an offer card
 * carries a badge row, a title, a price, a conditions row and a code, and a
 * third of a tablet is not enough for any of them.
 *
 * The empty state is a statement, not a blank. A vendor profile with no offers
 * and a directory with no matches are both places a reader is entitled to be
 * told what happened rather than shown space where cards would be.
 */
export function OfferGrid<T extends OfferModel>({
  offers,
  renderEyebrow,
  renderPrice,
  renderAction,
  renderHeaderAction,
  emptyTitle = 'No offers right now',
  emptyBody = 'Nothing is on offer at the moment. Check back — campaigns open and close through the season.',
  columns = 2,
}: OfferGridProps<T>) {
  const now = useOfferClock();

  if (offers.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 3, sm: 5 },
          borderRadius: 3,
          borderStyle: 'dashed',
          textAlign: 'center',
          bgcolor: 'action.hover',
        }}
      >
        <LocalOfferOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
        <Typography variant="subtitle1">{emptyTitle}</Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.5, maxWidth: 460, mx: 'auto' }}
        >
          {emptyBody}
        </Typography>
      </Paper>
    );
  }

  return (
    <Grid container spacing={{ xs: 2, md: 3 }} alignItems="stretch">
      {offers.map((offer) => (
        <Grid item xs={12} md={6} lg={columns === 3 ? 4 : 6} key={offer.discount_id}>
          <Box sx={{ height: '100%' }}>
            <OfferCard
              offer={offer}
              now={now}
              eyebrow={renderEyebrow?.(offer)}
              price={renderPrice?.(offer)}
              action={renderAction?.(offer)}
              headerAction={renderHeaderAction?.(offer)}
            />
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}
