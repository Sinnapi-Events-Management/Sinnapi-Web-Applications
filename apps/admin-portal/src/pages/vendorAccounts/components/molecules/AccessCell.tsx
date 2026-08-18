import { Chip, Stack, Typography } from '@sinnapi/ui';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { formatDate, formatRelative } from '@/lib/config';
import type { VendorAccountModel } from '@/lib/types';

/**
 * Whether this vendor has ever got in, and when they were last seen.
 *
 * "Never signed in" is called out rather than left as a dash because it is the
 * single most actionable fact on the page: an approved, listed vendor who never
 * reached the portal is a stalled onboarding that nothing else surfaces, and it
 * is the exact condition the resend-credentials action answers. It reads as a
 * warning next to a date rather than as an absence.
 */
export default function AccessCell({ row }: { row: VendorAccountModel }) {
  if (!row.last_login_at) {
    return (
      <Stack spacing={0.25} sx={{ minWidth: 0 }}>
        <Chip
          size="small"
          color="warning"
          variant="outlined"
          icon={<ErrorOutlineIcon />}
          label="Never signed in"
        />
        {row.applied_at && (
          <Typography variant="caption" color="text.secondary" noWrap>
            Applied {formatDate(row.applied_at)}
          </Typography>
        )}
      </Stack>
    );
  }

  return (
    <Stack spacing={0.25} sx={{ minWidth: 0 }}>
      <Typography variant="body2" noWrap>
        {formatRelative(row.last_login_at)}
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap>
        {formatDate(row.last_login_at)}
      </Typography>
    </Stack>
  );
}
