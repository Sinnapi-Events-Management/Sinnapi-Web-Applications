import { Box, Link, Stack, Tooltip, Typography } from '@sinnapi/ui';
import { ipDisplay, locationInfo } from '../../schema/presenter';
import type { BlockedAccountModel } from '@/lib/types';

type Props = {
  row: BlockedAccountModel;
  revealed: boolean;
  onReveal: () => void;
};

/**
 * Where the attempt came from: country, plus a masked IP that can be revealed.
 *
 * The mask is the default because an IP is personal data and most visits to
 * this page never need one — showing them all by default would be processing
 * beyond what the task requires. Revealing is one click, per row, and logged.
 *
 * Country is shown at country granularity only, which is all `cf-ipcountry`
 * provides and all that is defensible as minimal: enough to notice a sign-in
 * from an unexpected place, not enough to place anyone in a city.
 */
export default function OriginCell({ row, revealed, onReveal }: Props) {
  const location = locationInfo(row);

  if (!row.last_ip && !location.code) {
    return (
      <Typography variant="body2" color="text.disabled">
        —
      </Typography>
    );
  }

  return (
    <Stack sx={{ minWidth: 0 }}>
      <Stack direction="row" spacing={0.5} alignItems="center">
        {location.flag && (
          <Box component="span" aria-hidden sx={{ fontSize: 15, lineHeight: 1 }}>
            {location.flag}
          </Box>
        )}
        <Typography variant="body2" noWrap>
          {location.label}
        </Typography>
      </Stack>

      {row.last_ip &&
        (revealed ? (
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {ipDisplay(row, true)}
          </Typography>
        ) : (
          <Tooltip title="Show the full IP address. This is recorded in the audit log.">
            <Link
              component="button"
              type="button"
              variant="caption"
              onClick={(e) => {
                // The row itself is not clickable here, but the table may gain a
                // row action later; stopping propagation keeps this local.
                e.stopPropagation();
                onReveal();
              }}
              sx={{ fontFamily: 'monospace', textAlign: 'left', color: 'text.secondary' }}
            >
              {ipDisplay(row, false)}
            </Link>
          </Tooltip>
        ))}
    </Stack>
  );
}
