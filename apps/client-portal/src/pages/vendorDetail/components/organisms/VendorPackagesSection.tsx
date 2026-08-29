import { Box, Button, Grid, QueryState, Typography } from '@sinnapi/ui';
import { PackageShowcase } from '@sinnapi/ui';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import { useVendorPackages } from '../../hooks/useVendorPackages';
import PackageQuoteDialog from './PackageQuoteDialog';

/**
 * What this vendor sells, priced.
 *
 * Sits above availability and reviews because it answers the question a
 * visitor arrives with — "what does this cost and what do I get" — and every
 * section below it is a question they only ask once that one is answered.
 *
 * Renders nothing at all when the vendor has published no packages. A heading
 * over an empty state would read as an absence on the vendor's profile, and
 * plenty of good vendors quote entirely bespoke.
 *
 * The showcase is the same component the vendor previews in their editor and
 * the marketing site renders to signed-out visitors. One renderer, so the
 * package a client compares here is the package they were shown before they
 * signed in.
 */
export default function VendorPackagesSection({
  vendorId,
  vendorName,
}: {
  vendorId: string;
  vendorName: string;
}) {
  const state = useVendorPackages(vendorId);

  if (!state.isLoading && !state.error && !state.hasPackages) return null;

  return (
    <Box component="section">
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        Packages
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        Priced offers from {vendorName}. Ask for one and it arrives as a quote you can accept.
      </Typography>

      <QueryState isLoading={state.isLoading} error={state.error}>
        <Grid container spacing={3}>
          {state.packages.map((pkg) => (
            // Full width up to `lg`: a package carries an itemised table, two
            // scope lists and a tier row, and half a tablet is not enough for
            // any of them.
            <Grid item xs={12} lg={6} key={pkg.id}>
              <PackageShowcase
                pkg={pkg}
                defaultTierId={state.selectedTierId(pkg)}
                onTierChange={(tierId) => state.selectTier(pkg.id, tierId)}
                renderAction={(tier) => (
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<RequestQuoteIcon />}
                    onClick={() => state.openRequest(pkg, tier.id, tier.name)}
                  >
                    Request this package
                  </Button>
                )}
              />
            </Grid>
          ))}
        </Grid>
      </QueryState>

      <PackageQuoteDialog
        vendorId={vendorId}
        request={state.request}
        onClose={state.closeRequest}
      />
    </Box>
  );
}
