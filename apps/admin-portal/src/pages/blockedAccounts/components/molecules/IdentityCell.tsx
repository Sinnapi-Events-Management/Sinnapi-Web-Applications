import { Box, Chip, Stack, Typography } from '@sinnapi/ui';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import { roleLabel } from '../../schema/presenter';
import type { BlockedAccountModel } from '@/lib/types';

/**
 * Who the row is about: name over email, with the account's role beside it.
 *
 * A locked address that matches no account gets a distinct treatment rather
 * than an empty name — those rows are not a user who needs help, they are an
 * attack against an address nobody owns, and reading as "blank user" would hide
 * exactly the thing this page exists to surface.
 */
export default function IdentityCell({ row }: { row: BlockedAccountModel }) {
  const role = roleLabel(row);
  const orphaned = !row.profile_id;

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
      {orphaned && (
        <PersonOffIcon fontSize="small" color="warning" titleAccess="No account for this address" />
      )}
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {row.full_name ?? row.email}
        </Typography>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
          {row.full_name && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {row.email}
            </Typography>
          )}
          {role && (
            <Chip
              size="small"
              variant="outlined"
              label={role}
              color={orphaned ? 'warning' : 'default'}
              sx={{ height: 18, fontSize: 11 }}
            />
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
