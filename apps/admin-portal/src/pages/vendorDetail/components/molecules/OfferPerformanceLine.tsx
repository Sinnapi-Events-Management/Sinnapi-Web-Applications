import { Box, Divider, Stack, Typography } from '@sinnapi/ui';
import OfferReachCell from '@/components/offers/molecules/OfferReachCell';
import OfferResultCell from '@/components/offers/molecules/OfferResultCell';
import type { AdminOfferModel } from '@/lib/types';

/**
 * How far the offer reaches and what it has returned, in the card's price slot.
 *
 * The two facts an operator weighs together and never separately: 70% off is a
 * vendor being aggressive on one slow product or a business in trouble, and
 * which one it is depends entirely on how many packages it touches and how much
 * it has already given away. The console's table puts them in two columns
 * because a table is scanned down; a card is read across, so they sit side by
 * side under one rule.
 *
 * Stacks on a phone. The two halves are short but their values are not — a
 * money figure beside a package count at 360px would either wrap mid-number or
 * push the divider off the card.
 */
export default function OfferPerformanceLine({ offer }: { offer: AdminOfferModel }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 1, sm: 2 }}
      divider={
        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
      }
      sx={{
        p: 1.25,
        borderRadius: 2,
        bgcolor: 'action.hover',
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="overline" color="text.secondary" sx={{ display: 'block' }}>
          Reach
        </Typography>
        <OfferReachCell offer={offer} />
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="overline" color="text.secondary" sx={{ display: 'block' }}>
          Result
        </Typography>
        <OfferResultCell offer={offer} />
      </Box>
    </Stack>
  );
}
