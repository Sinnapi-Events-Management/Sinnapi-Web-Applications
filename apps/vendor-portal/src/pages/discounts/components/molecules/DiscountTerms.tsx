import { Chip, Stack, Tooltip } from '@sinnapi/ui';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import { formatMoney } from '@/lib/config';
import type { DiscountRow } from '../../schema';

/**
 * The conditions attached to a code, as chips rather than sentences.
 *
 * Two things qualify a discount beyond its value: the floor a booking has to
 * clear, and the campaign it belongs to. Both are optional and most codes carry
 * neither, so this renders nothing at all rather than two "None" rows — a card
 * with no conditions is a simpler offer and should look like one.
 *
 * Chips rather than prose because these are read at a glance across a grid, and
 * because the row wraps cleanly on a phone where a sentence would push the
 * card's footer out of line with its neighbours.
 *
 * The campaign chip is the visible half of the link the Promotions screen reads
 * back through — it is how a vendor confirms, from here, that the code they
 * printed on a campaign's artwork is actually attached to it.
 */
export default function DiscountTerms({ discount }: { discount: DiscountRow }) {
  const hasFloor = discount.min_amount != null && discount.min_amount > 0;
  if (!hasFloor && !discount.promotionTitle) return null;

  return (
    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
      {hasFloor && (
        <Tooltip title="Only redeemable on bookings at or above this amount">
          <Chip
            size="small"
            variant="outlined"
            icon={<PaymentsOutlinedIcon />}
            label={`Min. ${formatMoney(discount.min_amount, discount.currency ?? 'UGX')}`}
          />
        </Tooltip>
      )}
      {discount.promotionTitle && (
        <Tooltip title="This code's redemptions roll up into this campaign">
          <Chip
            size="small"
            variant="outlined"
            icon={<CampaignOutlinedIcon />}
            label={discount.promotionTitle}
            // A long campaign title must not stretch the row it shares with the
            // minimum: the chip truncates and the tooltip carries the rest.
            sx={{ maxWidth: '100%', '& .MuiChip-label': { overflow: 'hidden' } }}
          />
        </Tooltip>
      )}
    </Stack>
  );
}
