import { Stack, Button, Alert, Typography, Box, alpha, SectionCard } from '@sinnapi/ui';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import RateReviewIcon from '@mui/icons-material/RateReview';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ArchiveIcon from '@mui/icons-material/Archive';

type Props = {
  status: string;
  has: (perm: string) => boolean;
  busy: boolean;
  onMarkReviewing: () => void;
  onPromote: () => void;
  onReject: () => void;
  onWithdraw: () => void;
};

/** Triage actions available for the current reviewer + application state. */
export default function WorkflowSection({
  status,
  has,
  busy,
  onMarkReviewing,
  onPromote,
  onReject,
  onWithdraw,
}: Props) {
  // Every state that closes the queue entry. `withdrawn` counts: it is reversible
  // (an admin can move it back to submitted) but it is not a row anyone should be
  // approving or rejecting from here without first putting it back deliberately.
  const decided = status === 'approved' || status === 'rejected' || status === 'withdrawn';

  return (
    <SectionCard title="Workflow" icon={<AccountTreeIcon />} accent="success">
      <Stack spacing={1.5}>
        {has('vendor.review') && status === 'submitted' && (
          <Button
            variant="outlined"
            startIcon={<RateReviewIcon />}
            disabled={busy}
            onClick={onMarkReviewing}
          >
            Mark as reviewing
          </Button>
        )}

        {has('vendor.approve') && !decided && (
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: (t) => alpha(t.palette.success.main, 0.08),
              border: (t) => `1px solid ${alpha(t.palette.success.main, 0.3)}`,
            }}
          >
            <Button
              fullWidth
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              disabled={busy}
              onClick={onPromote}
            >
              Approve &amp; promote
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Creates the applicant&apos;s account, a vendor, and a trial subscription.
            </Typography>
          </Box>
        )}

        {has('vendor.review') && !decided && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            disabled={busy}
            onClick={onReject}
          >
            Reject
          </Button>
        )}

        {has('vendor.review') && !decided && (
          <Button
            variant="text"
            color="inherit"
            startIcon={<ArchiveIcon />}
            disabled={busy}
            onClick={onWithdraw}
          >
            Withdraw as duplicate
          </Button>
        )}

        {status === 'withdrawn' && (
          <Alert severity="info" icon={<ArchiveIcon />}>
            Withdrawn — replaced by a newer submission from this applicant, or retired by an admin.
            Nothing was sent to the applicant.
          </Alert>
        )}

        {status === 'approved' && (
          <Alert severity="success" icon={<CheckCircleIcon />}>
            Approved — promoted to a vendor application.
          </Alert>
        )}
        {status === 'rejected' && (
          <Alert severity="error" icon={<CancelIcon />}>
            Rejected.
          </Alert>
        )}
      </Stack>
    </SectionCard>
  );
}
