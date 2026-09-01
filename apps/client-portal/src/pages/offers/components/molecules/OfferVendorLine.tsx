import { Link as RouterLink } from 'react-router-dom';
import { Avatar, Link, Rating, Stack, Typography } from '@sinnapi/ui';
import type { PublicOfferModel } from '@/lib/types';

/**
 * Whose offer this is, above the saving.
 *
 * An offer is only as good as the vendor behind it, and a directory of savings
 * with no vendor attached is a directory of numbers. The rating rides along for
 * the same reason it is on a discover card: "20% off" from a 4.8 vendor and
 * "20% off" from an unrated one are different propositions, and a client who
 * has to open both to find that out will open neither.
 *
 * The name is the link, not the whole card. A card carries a code the client
 * may want to select and copy, and a card-wide anchor makes selecting text
 * navigate instead.
 */
export default function OfferVendorLine({ offer }: { offer: PublicOfferModel }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
      <Avatar
        src={offer.vendor_image_url ?? undefined}
        alt=""
        sx={{ width: 32, height: 32, flexShrink: 0 }}
      >
        {offer.vendor_name.charAt(0)}
      </Avatar>

      <Stack sx={{ minWidth: 0 }}>
        <Link
          component={RouterLink}
          to={`/discover/vendors/${offer.vendor_slug}`}
          variant="subtitle2"
          underline="hover"
          sx={{
            fontWeight: 700,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {offer.vendor_name}
        </Link>

        <Stack direction="row" spacing={0.75} alignItems="center">
          {offer.vendor_review_count ? (
            <>
              <Rating
                value={Number(offer.vendor_rating ?? 0)}
                precision={0.1}
                readOnly
                size="small"
              />
              <Typography variant="caption" color="text.secondary">
                ({offer.vendor_review_count})
              </Typography>
            </>
          ) : (
            <Typography variant="caption" color="text.secondary">
              {offer.category_name ?? 'New on Sinnapi'}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Stack>
  );
}
