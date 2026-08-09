import { Link as RouterLink } from 'react-router-dom';
import { Button, Stack, SectionCard } from '@sinnapi/ui';
import ChecklistIcon from '@mui/icons-material/Checklist';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import ChatIcon from '@mui/icons-material/Chat';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';

type Props = {
  /** Only a completed booking has anything to review. */
  canReview: boolean;
};

/**
 * Where the client goes from here. Exactly one action is filled at a time — the
 * review prompt when it applies, otherwise messaging the vendor — so the panel
 * reads as a recommendation rather than three equal choices.
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
          to="/messages"
          variant={canReview ? 'outlined' : 'contained'}
          startIcon={<ChatIcon />}
        >
          Message vendor
        </Button>
        <Button
          component={RouterLink}
          to="/escrow"
          variant="text"
          startIcon={<AccountBalanceIcon />}
        >
          View escrow
        </Button>
      </Stack>
    </SectionCard>
  );
}
