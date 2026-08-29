'use client';
import NextLink from 'next/link';
import { Box, Button, Grid, Stack, Typography } from '@sinnapi/ui/atoms';
import { PackageShowcase } from '@sinnapi/ui/organisms';
import { packageTiers } from '@sinnapi/ui/molecules';
import type { PackageModel } from '@/lib/types';

type Props = {
  packages: PackageModel[];
  vendorName: string;
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
 * The action routes to `/sign-in` rather than opening a form, matching the
 * sidebar's quote and message buttons exactly: vendor contact and quoting are
 * gated until a client is authenticated.
 */
export default function VendorDetailPackages({ packages, vendorName }: Props) {
  // The database refuses to publish a package with no priced tier, but one can
  // lose its tiers to a later edit. A card offering nothing is worse than one
  // fewer card.
  const priced = packages.filter((pkg) => packageTiers(pkg).length > 0);
  if (priced.length === 0) return null;

  return (
    <Box component="section" sx={{ mt: { xs: 5, md: 6 } }}>
      <Typography variant="h5" sx={{ mb: 0.5 }}>
        Packages &amp; pricing
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        What {vendorName} offers and what it costs. Sign in to ask for one and it comes back as a
        quote you can accept.
      </Typography>

      <Grid container spacing={{ xs: 3, md: 4 }}>
        {priced.map((pkg) => (
          // Full width until `xl`: a package carries an itemised table, two
          // scope lists and a tier row, and this sits in a column that is
          // already only 7/12 of the page on desktop.
          <Grid item xs={12} xl={6} key={pkg.id}>
            <PackageShowcase
              pkg={pkg}
              renderAction={(tier) => (
                <Stack spacing={1}>
                  <Button component={NextLink} href="/sign-in" variant="contained" fullWidth>
                    Request the {tier.name} package
                  </Button>
                  <Typography variant="caption" color="text.secondary" textAlign="center">
                    You will be asked to sign in first.
                  </Typography>
                </Stack>
              )}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
