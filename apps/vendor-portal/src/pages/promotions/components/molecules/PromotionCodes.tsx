import { Chip, Skeleton, Stack, Tooltip, Typography } from '@sinnapi/ui';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import type { PromotionRow } from '../../schema';

/**
 * The discount codes attached to a campaign, and what they have returned.
 *
 * This is the only line on the card that is an *outcome* rather than a setting,
 * so it gets the sentence rather than a bare number: "14 redemptions" is what a
 * vendor is deciding about when they choose to extend or drop a campaign.
 *
 * A campaign with no code attached is a normal thing — an announcement, a
 * seasonal notice — so the absence is stated plainly and pointed at the screen
 * that fixes it, rather than shown as a zero that reads like a failure.
 */
export default function PromotionCodes({
  promotion,
  loading,
}: {
  promotion: PromotionRow;
  loading: boolean;
}) {
  if (loading) return <Skeleton variant="text" width="60%" />;

  if (promotion.codes.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        No discount code attached
      </Typography>
    );
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
      <LocalOfferOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
      {promotion.codes.map((code) => (
        <Tooltip
          key={code.id}
          title={code.is_active === false ? 'This code is switched off' : ''}
          disableHoverListener={code.is_active !== false}
        >
          <Chip
            size="small"
            variant="outlined"
            label={code.code ?? 'Automatic'}
            sx={{
              fontFamily: 'monospace',
              // A switched-off code still counts toward redemptions, so it
              // stays on the card — just visibly out of play.
              opacity: code.is_active === false ? 0.55 : 1,
            }}
          />
        </Tooltip>
      ))}
      <Typography variant="caption" color="text.secondary">
        {promotion.redemptions} {promotion.redemptions === 1 ? 'redemption' : 'redemptions'}
      </Typography>
    </Stack>
  );
}
