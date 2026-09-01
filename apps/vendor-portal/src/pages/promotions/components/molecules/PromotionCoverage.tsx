import { Stack, Tooltip, Typography } from '@sinnapi/ui';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import type { PromotionRow } from '../../schema';

/**
 * What this campaign is an offer on.
 *
 * Every code under a campaign inherits this scope unless it names packages of
 * its own, so this line is usually what decides where a client actually sees a
 * saving — which makes it the most consequential fact on the card and one this
 * screen could not state at all before offers had targets.
 *
 * The unscoped case gets the globe and the warning tint rather than the same
 * grey as everything else. A campaign covering the whole catalogue is legal and
 * sometimes meant; far more often it is a vendor who did not notice the picker,
 * and a difference they can see is the only thing that tells the two apart
 * before the month's revenue does.
 */
export default function PromotionCoverage({ promotion }: { promotion: PromotionRow }) {
  const unscoped = promotion.coverage === 'Everything you sell';

  return (
    <Tooltip
      title={
        unscoped
          ? 'No packages are attached, so every code under this campaign discounts everything you sell. Edit the campaign to narrow it.'
          : 'Codes under this campaign apply to these, unless a code names packages of its own.'
      }
    >
      <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{ minWidth: 0 }}>
        {unscoped ? (
          <PublicOutlinedIcon sx={{ fontSize: 16, color: 'warning.main', mt: '2px' }} />
        ) : (
          <SellOutlinedIcon sx={{ fontSize: 16, color: 'text.disabled', mt: '2px' }} />
        )}
        <Typography
          variant="caption"
          color={unscoped ? 'warning.main' : 'text.secondary'}
          sx={{
            minWidth: 0,
            // Two lines then ellipsis, so one campaign covering six packages
            // cannot push its neighbours' footers out of line.
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {promotion.coverage}
        </Typography>
      </Stack>
    </Tooltip>
  );
}
