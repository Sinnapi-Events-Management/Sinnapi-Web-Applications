import { Stack, Tooltip, Typography } from '@sinnapi/ui';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import type { AdminOfferModel } from '@/lib/types';

/**
 * How far the offer reaches.
 *
 * The column that decides whether a claim is a problem. "70% off" on one tier
 * of one package is a vendor being aggressive on a slow product; "70% off"
 * across a whole catalogue is either a mistake or a business in trouble, and
 * those want different responses from an operator.
 *
 * A count with the names behind a tooltip rather than the names inline: this is
 * a table, and a vendor with nine packages would otherwise set the row height
 * for every other row on the page.
 *
 * Zero packages is called out rather than shown as "0". An offer that reaches
 * nothing is invisible to clients — usually a vendor whose packages are all
 * unpublished — and that is a support answer, not a moderation one.
 */
export default function OfferReachCell({ offer }: { offer: AdminOfferModel }) {
  const count = offer.package_count ?? 0;
  const names = offer.package_names ?? [];

  if (count === 0) {
    return (
      <Tooltip title="This offer covers no published package, so no client can see it.">
        <Typography variant="caption" color="warning.main">
          Reaches nobody
        </Typography>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={names.join(', ')}>
      <Stack direction="row" spacing={0.5} alignItems="center">
        {names.length === 0 && <PublicOutlinedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />}
        <Typography variant="body2" noWrap>
          {count} {count === 1 ? 'package' : 'packages'}
        </Typography>
      </Stack>
    </Tooltip>
  );
}
