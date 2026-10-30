import { Link as RouterLink } from 'react-router-dom';
import { Button, SectionCard, Stack, Typography } from '@sinnapi/ui';
import ChecklistIcon from '@mui/icons-material/Checklist';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import type { BookingDetailModel } from '@/lib/types';

type Props = { booking: BookingDetailModel };

/**
 * Where the client goes from here, for the things that are not on this page.
 *
 * WHAT THIS CARD NO LONGER DOES. It held the rating: first as a button linking
 * to `/reviews`, then as a composer opened in place. Both were in the Progress
 * tab, behind a tab press and a scroll, and clients reported not finding the
 * rating at all. It is five stars in the action bar pinned above the tabs now —
 * `BookingActionBar` — and nothing here points at it, because a second entry
 * point to the same write is a second place for the two to disagree about
 * whether the review exists.
 *
 * What is left is genuinely elsewhere: the money is one ledger across every
 * booking, so escrow is its own page rather than a panel repeated per booking.
 */
export default function BookingNextStepsCard({ booking }: Props) {
  const isSettled = ['completed', 'cancelled'].includes(booking.status);

  return (
    <SectionCard title="Next steps" icon={<ChecklistIcon />} accent="info">
      <Stack spacing={1.25}>
        <Typography variant="body2" color="text.secondary">
          {isSettled
            ? 'This booking is closed. Your payments and any release are on the escrow page.'
            : 'Anything you need to do about this booking is in the box at the top of this page.'}
        </Typography>

        <Button
          component={RouterLink}
          to="/escrow"
          variant="outlined"
          startIcon={<AccountBalanceIcon />}
          sx={{ alignSelf: 'flex-start' }}
        >
          View escrow
        </Button>
      </Stack>
    </SectionCard>
  );
}
