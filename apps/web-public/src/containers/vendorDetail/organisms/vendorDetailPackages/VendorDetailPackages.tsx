'use client';
import NextLink from 'next/link';
import { Box, Button, Grid, Paper, Stack, Typography } from '@sinnapi/ui/atoms';
import { formatAmount } from '@sinnapi/ui/molecules';
import { PackageShowcase } from '@sinnapi/ui/organisms';
import { packageTiers } from '@sinnapi/ui/molecules';
import { groupOffersByPackage, offersForTier, type PackageOfferRow } from '@sinnapi/ui/offers';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import VendorSectionHeading from '../../atoms/VendorSectionHeading';
import { NEW_TAB_LINK_PROPS, isExternalHref } from '@/lib/config/site';
import type { PackageModel } from '@/lib/types';

type Props = {
  packages: PackageModel[];
  vendorName: string;
  /**
   * Live offers across this vendor's packages, from `vendor_package_offers`.
   *
   * Fetched on the server alongside the packages and passed down as plain
   * serialisable data — which is the only shape that can cross into this client
   * component, and the reason the discounted price reaches the prerendered HTML
   * a crawler reads rather than appearing after hydration.
   */
  packageOffers?: PackageOfferRow[];
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
 * What this vendor sells, priced, on the public profile.
 *
 * The most valuable block on the page for a visitor who has not signed in.
 * Every other section answers "are they any good"; this one answers "can I
 * afford them", which is the question that decides whether they carry on. It is
 * also the section search engines can index — a page with real prices on it is
 * a page that ranks for "wedding photographer Kampala price".
 *
 * The showcase is the same component the vendor previews in their editor, the
 * client portal renders and the console moderates. One renderer across four
 * apps, so the package a visitor reads here is exactly the package they see
 * after signing in — the moment those two diverge is the moment the price on
 * this page stops being trustworthy.
 *
 * A client component, and it has to be: `PackageShowcase` takes `renderAction`
 * as a function, and a function cannot cross the server/client boundary. The
 * page above stays a server component — only this section hydrates, and what it
 * receives (the packages themselves) is plain serialisable data.
 *
 * The action routes into the client portal — to this vendor's packages section
 * — rather than opening a form, matching the sidebar's buttons exactly: vendor
 * contact and quoting are gated until a client is authenticated. The portal
 * decides what a signed-out arrival sees, sending them through its own sign-in
 * and back to this same tier list; this page never claims to know.
 *
 * WHAT A SIGNED-OUT VISITOR SEES OF AN OFFER
 * The saving, the deadline, what it covers and the discounted total — all of
 * it, priced against the tier they are looking at. What they do not see is the
 * CODE: `vendor_package_offers` returns null for it to a caller with no
 * session, so there is nothing here to leak. That is the deliberate split. The
 * saving is marketing and belongs on a page Google indexes; the code is a
 * bearer token, and a hundred-use campaign printed on an indexed page is gone
 * by Tuesday. The sign-in caption is what converts the first into the second.
 *
 * It used to vanish for a vendor with no priced package, which under a fixed
 * tab bar would be a tab opening onto blank space. Quoting bespoke is a normal
 * way to work, so the empty case now says that instead — and says it in the
 * HTML, which is worth more to this page than silence.
 */
export default function VendorDetailPackages({
  packages,
  vendorName,
  packageOffers = [],
  portalProfileHref,
}: Props) {
  // Indexed once rather than filtered per card. The showcase then picks the
  // best offer for whichever tier the reader is on and prices it — the same
  // component, the same arithmetic and the same result the client portal
  // renders after sign-in, which is the whole point of it being one component.
  const offersByPackage = groupOffersByPackage(packageOffers);
  // Another origin, so a new tab — and not when the href degraded to this
  // site's own `/sign-in`. See `NEW_TAB_LINK_PROPS`.
  const newTab = isExternalHref(portalProfileHref) ? NEW_TAB_LINK_PROPS : {};
  // The database refuses to publish a package with no priced tier, but one can
  // lose its tiers to a later edit. A card offering nothing is worse than one
  // fewer card.
  const priced = packages.filter((pkg) => packageTiers(pkg).length > 0);

  return (
    <Box component="section">
      <VendorSectionHeading
        eyebrow="Packages"
        title="Packages & pricing"
        subtitle={`What ${vendorName} offers and what it costs. Sign in to ask for one and it comes back as a quote you can accept.`}
      />

      {priced.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 3,
            borderStyle: 'dashed',
            textAlign: 'center',
            bgcolor: 'action.hover',
          }}
        >
          <LocalOfferOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography variant="subtitle1">Quoted per event</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {vendorName} prices each event individually rather than publishing set packages. Sign in
            and send your date and guest count to get a figure back.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={{ xs: 3, md: 4 }}>
          {priced.map((pkg) => (
            // Full width until `xl`: a package carries an itemised table, two
            // scope lists and a tier row, and this sits in a column that is
            // already only 7/12 of the page on desktop.
            <Grid item xs={12} xl={6} key={pkg.id}>
              <PackageShowcase
                pkg={pkg}
                // Package-level (tier null): this page has no tier state of its
                // own, so the showcase re-narrows per tier as the reader
                // switches. Passing a tier here would fix the whole card to it.
                offers={offersForTier(offersByPackage.get(pkg.id), null)}
                renderAction={(tier, pricing, offer) => (
                  <Stack spacing={1}>
                    <Button
                      component={NextLink}
                      href={portalProfileHref}
                      {...newTab}
                      variant="contained"
                      fullWidth
                    >
                      Request the {tier.name} package
                    </Button>
                    {/* Hedged on purpose. The caption used to assert "you will
                        be asked to sign in first", which this page is in no
                        position to claim: the portal holds the session on
                        another origin, so half the readers of that sentence
                        are already signed in and go straight through. */}
                    <Typography variant="caption" color="text.secondary" textAlign="center">
                      {offer
                        ? `Claim ${formatAmount(pricing.offerSaving, pricing.currency)} off this tier in your account.`
                        : 'Continues in your Sinnapi account.'}
                    </Typography>
                  </Stack>
                )}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
