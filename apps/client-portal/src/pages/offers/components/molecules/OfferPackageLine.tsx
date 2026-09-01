import { Stack, Tooltip, Typography } from '@sinnapi/ui';
import { formatAmount } from '@sinnapi/ui';
import InventoryOutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import type { PublicOfferModel } from '@/lib/types';

/**
 * Which packages the saving covers, and what they start at.
 *
 * The `from` price is the cheapest tier the offer touches BEFORE the offer is
 * applied, and it is deliberately not discounted here. This card has no tier on
 * screen and no way to know which one a client will choose, and a discounted
 * "from" figure would be a specific promise about a specific tier that the card
 * cannot name — the vendor's profile is where the saving becomes a number
 * against something.
 *
 * Names rather than a count. "Full Day Wedding and 2 more" tells a client
 * whether this is for them; "3 packages" tells them to click to find out.
 */
export default function OfferPackageLine({ offer }: { offer: PublicOfferModel }) {
  const names = offer.package_names ?? [];
  if (names.length === 0) return null;

  const shown = names.slice(0, 2).join(', ');
  const rest = names.length - 2;

  return (
    <Tooltip title={names.join(', ')}>
      <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{ minWidth: 0 }}>
        <InventoryOutlinedIcon sx={{ fontSize: 16, color: 'text.disabled', mt: '2px' }} />
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 0 }}>
          On {shown}
          {rest > 0 && ` and ${rest} more`}
          {offer.from_price != null &&
            ` · from ${formatAmount(offer.from_price, offer.currency ?? 'UGX')}`}
        </Typography>
      </Stack>
    </Tooltip>
  );
}
