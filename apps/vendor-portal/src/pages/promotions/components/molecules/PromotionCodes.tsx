import { formatMoney } from '@/lib/config';
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
        No offers in this sale yet — add one from the Offers tab
      </Typography>
    );
  }

  // What clients actually get, from the offers themselves — the sale's own
  // description is free text and once said "40% discount" over two codes
  // worth 10% and 15% (2026-11-17).
  return (
    <Stack spacing={0.75}>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>
        What clients get
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
        <LocalOfferOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        {promotion.codes.map((code) => {
          const off =
            code.type === 'fixed'
              ? `${formatMoney(code.value, code.currency ?? 'UGX')} off`
              : `${Number(code.value)}% off`;
          return (
            <Tooltip
              key={code.id}
              title={code.is_active === false ? 'This offer is paused' : ''}
              disableHoverListener={code.is_active !== false}
            >
              <Chip
                size="small"
                color="secondary"
                variant="outlined"
                label={code.code ? `${off} · ${code.code}` : `${off} · automatic`}
                sx={{ opacity: code.is_active === false ? 0.55 : 1, fontWeight: 600 }}
              />
            </Tooltip>
          );
        })}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Used {promotion.redemptions} {promotion.redemptions === 1 ? 'time' : 'times'}
      </Typography>
    </Stack>
  );
}
