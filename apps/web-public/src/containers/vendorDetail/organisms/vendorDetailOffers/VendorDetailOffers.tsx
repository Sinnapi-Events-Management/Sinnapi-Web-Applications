'use client';
import NextLink from 'next/link';
import { Box, Button } from '@sinnapi/ui/atoms';
import { OfferStrip } from '@sinnapi/ui/offers';
import { NEW_TAB_LINK_PROPS, isExternalHref } from '@/lib/config/site';
import type { PublicVendorOfferModel } from '@/lib/types';

type Props = {
  offers: PublicVendorOfferModel[];
  vendorName: string;
  /**
   * This vendor's profile in the client portal, resolved by the server
   * container and handed down.
   *
   * A prop rather than a call to `clientPortalVendorUrl` here, and it has to
   * be: the portal's origin comes from `NEXT_CLIENT_PORTAL_URL`, which has no
   * `NEXT_PUBLIC_` prefix and so does not exist in this client bundle. Reading
   * it here would quietly resolve to the fallback on every render.
   */
  portalProfileHref: string;
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
 * The action routes into the client portal — to this vendor's offers section,
 * matching the sidebar and the package cards: a visitor may read every offer on
 * this site, and needs an account to claim one. The strip has already shown
 * them the saving and the deadline, so the account is being asked for after the
 * value is established rather than before.
 *
 * It opens the offers tab rather than the profile's default section, because
 * the claim that earned the click is the one thing the arrival should land on;
 * the portal's own tab is where the terms that decide whether it applies to
 * this client actually fit. A visitor with no session is still asked to sign in
 * first — the portal does that itself and returns them here, tab and all.
 *
 * Renders nothing when the vendor has no offers — `OfferStrip` handles that
 * itself, which is why there is no guard here.
 */
export default function VendorDetailOffers({ offers, vendorName, portalProfileHref }: Props) {
  // Another origin, so a new tab — and not when the href degraded to this
  // site's own `/sign-in`. See `NEW_TAB_LINK_PROPS`.
  const newTab = isExternalHref(portalProfileHref) ? NEW_TAB_LINK_PROPS : {};

  return (
    <Box sx={{ mt: { xs: 3, md: 4 } }}>
      <OfferStrip
        offers={offers}
        title={`Current offers from ${vendorName}`}
        renderAction={() => (
          <Button
            component={NextLink}
            href={portalProfileHref}
            {...newTab}
            size="small"
            variant="outlined"
            color="success"
          >
            Claim this offer
          </Button>
        )}
      />
    </Box>
  );
}
