import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Skeleton,
  Stack,
  Typography,
  SectionCard,
  StatusChip,
} from '@sinnapi/ui';
import StorefrontIcon from '@mui/icons-material/Storefront';
import type { MyApplicationModel } from '@/lib/types';

type Props = {
  application: MyApplicationModel | null | undefined;
  loading: boolean;
};

/**
 * The pre-vendor state: an owner who has signed up but has no vendor record
 * yet, so there is nothing to measure. It shows the one thing that *is* true —
 * where their application stands — and the single next step.
 *
 * Kept as its own organism rather than an early return inside the page, because
 * it is a different screen with a different job, not a variant of the dashboard.
 */
export default function ApplicationStatusCard({ application, loading }: Props) {
  return (
    <SectionCard
      title="Application status"
      subtitle="Where your listing stands"
      icon={<StorefrontIcon />}
      accent="secondary"
    >
      {loading && (
        <Stack spacing={1.5}>
          <Skeleton variant="rounded" width={120} height={28} />
          <Skeleton variant="text" width="70%" />
          <Skeleton variant="rounded" width={180} height={36} />
        </Stack>
      )}

      {!loading && application && (
        <Stack spacing={1.5} alignItems="flex-start">
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusChip status={application.status} />
            {application.is_reapplication && (
              <Typography variant="caption" color="text.secondary">
                (re-application)
              </Typography>
            )}
          </Box>

          {application.status === 'rejected' && application.rejection_reason && (
            <Alert severity="error" sx={{ width: '100%' }}>
              {application.rejection_reason}
            </Alert>
          )}

          <Button component={RouterLink} to="/onboarding" variant="contained">
            View onboarding
          </Button>
        </Stack>
      )}

      {!loading && !application && (
        <Stack spacing={2} alignItems="flex-start">
          <Typography color="text.secondary">
            You haven't started an application yet. It takes a few minutes, and you can save and
            come back to it.
          </Typography>
          <Button component={RouterLink} to="/onboarding" variant="contained">
            Start application
          </Button>
        </Stack>
      )}
    </SectionCard>
  );
}
