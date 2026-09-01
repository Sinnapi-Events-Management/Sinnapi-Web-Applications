'use client';
import NextLink from 'next/link';
import { Box, Button } from '@sinnapi/ui/atoms';
import { OfferStrip } from '@sinnapi/ui/offers';
import type { PublicVendorOfferModel } from '@/lib/types';

type Props = {
  offers: PublicVendorOfferModel[];
  vendorName: string;
};

/**
 * What this vendor is running, between the highlights strip and the tabs.
 *
 * A client component, and it has to be: `OfferStrip` takes `renderAction` as a
 * function, and a function cannot cross the server/client boundary. What it
 * receives — the offers themselves — is plain serialisable data, so the copy
 * still reaches the prerendered HTML.
 *
 * That matters more than it usually does. This is a claim about price with a
 * date on it, which is exactly the kind of thing that earns a click from a
 * search result — and a saving that only exists after hydration is a saving no
 * crawler ever sees.
 *
 * The action routes to `/sign-in`, matching the sidebar and the package cards:
 * a visitor may read every offer on this site, and needs an account to claim
 * one. The strip has already shown them the saving and the deadline, so the
 * sign-in is being asked for after the value is established rather than before.
 *
 * Renders nothing when the vendor has no offers — `OfferStrip` handles that
 * itself, which is why there is no guard here.
 */
export default function VendorDetailOffers({ offers, vendorName }: Props) {
  return (
    <Box sx={{ mt: { xs: 3, md: 4 } }}>
      <OfferStrip
        offers={offers}
        title={`Current offers from ${vendorName}`}
        renderAction={() => (
          <Button
            component={NextLink}
            href="/sign-in"
            size="small"
            variant="outlined"
            color="success"
          >
            Sign in to claim
          </Button>
        )}
      />
    </Box>
  );
}
