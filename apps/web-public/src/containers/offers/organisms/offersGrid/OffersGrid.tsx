'use client';
import NextLink from 'next/link';
import { Avatar, Box, Button, Stack, Typography } from '@sinnapi/ui/atoms';
import { formatAmount } from '@sinnapi/ui/molecules';
import { OfferGrid } from '@sinnapi/ui/offers';
import type { PublicOfferModel } from '@/lib/types';

type Props = {
  offers: PublicOfferModel[];
  isFiltered: boolean;
};

/**
 * The directory grid.
 *
 * A client component only because `OfferGrid` takes three render props, and a
 * function cannot cross the server/client boundary. What it receives — the
 * offers — is plain serialisable data resolved on the server, so every card,
 * every saving and every deadline is in the prerendered HTML. That is the
 * point: this page's second reader is a crawler, and a directory whose prices
 * only exist after hydration ranks for nothing.
 *
 * The action goes to the vendor's packages tab rather than to `/sign-in`. A
 * visitor who has just read "20% off, ends in 3 days" wants to see what it is
 * off — sending them to a login first asks for a commitment before the value is
 * established. The sign-in wall is where it belongs, one step later, on the
 * package card that carries the button to claim it.
 */
export default function OffersGrid({ offers, isFiltered }: Props) {
  return (
    <OfferGrid
      offers={offers}
      columns={3}
      emptyTitle={isFiltered ? 'No offers in this category' : 'No offers running today'}
      emptyBody={
        isFiltered
          ? 'Nothing is on offer here at the moment. Try another category, or browse all offers.'
          : 'Nothing is on offer right now. Campaigns open and close through the season — check back, or browse vendors and ask for a quote.'
      }
      renderEyebrow={(offer) => (
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
          <Avatar
            src={offer.vendor_image_url ?? undefined}
            alt=""
            sx={{ width: 30, height: 30, flexShrink: 0 }}
          >
            {offer.vendor_name.charAt(0)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              component={NextLink}
              href={`/vendors/${offer.vendor_slug}`}
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: 'text.primary',
                textDecoration: 'none',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {offer.vendor_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {offer.category_name ?? 'Verified vendor'}
              {offer.vendor_review_count
                ? ` · ${Number(offer.vendor_rating ?? 0).toFixed(1)}★ (${offer.vendor_review_count})`
                : ''}
            </Typography>
          </Box>
        </Stack>
      )}
      renderPrice={(offer) =>
        offer.package_names?.length ? (
          <Typography variant="caption" color="text.secondary">
            On {offer.package_names.slice(0, 2).join(', ')}
            {offer.package_names.length > 2 && ` and ${offer.package_names.length - 2} more`}
            {/* The `from` price is the cheapest tier the offer touches BEFORE
                the saving. Not discounted here on purpose: this card has no
                tier on screen, and a discounted "from" would be a specific
                promise about a tier the card cannot name. */}
            {offer.from_price != null &&
              ` · from ${formatAmount(offer.from_price, offer.currency ?? 'UGX')}`}
          </Typography>
        ) : null
      }
      renderAction={(offer) => (
        <Button
          fullWidth
          variant="contained"
          component={NextLink}
          href={`/vendors/${offer.vendor_slug}?tab=packages`}
        >
          See what it applies to
        </Button>
      )}
    />
  );
}
