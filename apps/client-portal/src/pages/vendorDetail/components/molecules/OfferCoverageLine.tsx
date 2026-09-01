import { Stack, Tooltip, Typography } from '@sinnapi/ui';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import type { VendorOfferModel } from '@/lib/types';

/** Beyond this many, the names stop being a list and become a paragraph. */
const NAMES_SHOWN = 3;

type Props = { offer: VendorOfferModel };

/**
 * What this saving actually covers, above the claim.
 *
 * THE MOST EXPENSIVE THING A CLIENT CAN GET WRONG ABOUT A DISCOUNT
 * Choosing a package on the strength of a saving that never covered it. The
 * facts to prevent that are already on the row — `vendor_offers` returns the
 * covered package names precisely so a card can say them without a second read
 * — and not rendering them is a choice to withhold something the platform is
 * holding.
 *
 * An empty `package_names` is not an absence. `vendor_offers` returns an empty
 * array for an offer with no targets, which the SQL resolves as covering
 * everything the vendor sells — so the empty case says the broadest thing on
 * the card, not the narrowest.
 *
 * Long lists truncate to a count with the full set behind a tooltip. A vendor
 * running one campaign across nine packages would otherwise set the height of
 * every card beside it in the grid.
 */
export default function OfferCoverageLine({ offer }: Props) {
  const names = offer.package_names ?? [];

  const label =
    names.length === 0
      ? 'Everything from this vendor'
      : names.length <= NAMES_SHOWN
        ? `Covers ${names.join(', ')}`
        : `Covers ${names.slice(0, NAMES_SHOWN).join(', ')} + ${names.length - NAMES_SHOWN} more`;

  return (
    <Tooltip title={names.length > NAMES_SHOWN ? names.join(', ') : ''}>
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
        <SellOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
        <Typography variant="caption" color="text.secondary" noWrap>
          {label}
        </Typography>
      </Stack>
    </Tooltip>
  );
}
