import { Link as RouterLink } from 'react-router-dom';
import { Button, Stack, SectionCard } from '@sinnapi/ui';
import ChecklistIcon from '@mui/icons-material/Checklist';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';

type Props = {
  /** Only a completed booking has anything to review. */
  canReview: boolean;
};

/**
 * Where the client goes from here — the pages this booking leads to, once there
 * is nothing left to do on the booking itself.
 *
 * Messaging the vendor used to sit here and now lives in the pinned action bar:
 * it is available in every state of the booking, so it belongs where it is
 * always reachable rather than inside a section. What is left is genuinely
 * "afterwards" — the review a completed booking earns, and the escrow record.
 *
 * At most one action is filled, so the panel reads as a recommendation rather
 * than two equal choices.
 */
export default function BookingNextStepsCard({ canReview }: Props) {
  return (
    <SectionCard title="Next steps" icon={<ChecklistIcon />} accent="info">
      <Stack spacing={1.25}>
        {canReview && (
          <Button
            component={RouterLink}
            to="/reviews"
            variant="contained"
            startIcon={<StarOutlineIcon />}
          >
            Leave a review
          </Button>
        )}
        <Button
          component={RouterLink}
          to="/escrow"
          variant={canReview ? 'text' : 'outlined'}
          startIcon={<AccountBalanceIcon />}
        >
          View escrow
        </Button>
      </Stack>
    </SectionCard>
  );
}
