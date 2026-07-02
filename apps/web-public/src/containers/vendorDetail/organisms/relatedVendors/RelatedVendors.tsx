import { Box, Container, Grid, Typography } from '@sinnapi/ui';
import VendorCard from '@/components/molecules/vendorCard';
import { mutedSurface } from '@/lib/sx';
import type { VendorCardModel } from '@/lib/types';

/**
 * "More vendors like this" rail. Reuses the listing's VendorCard so the cards
 * look and behave identically across the site. Renders nothing when there are no
 * related vendors, keeping the detail page clean.
 */
export default function RelatedVendors({ vendors }: { vendors: VendorCardModel[] }) {
  if (vendors.length === 0) return null;

  return (
    <Box sx={{ ...mutedSurface, py: { xs: 6, md: 9 } }}>
      <Container>
        <Typography variant="overline" color="primary">
          Keep exploring
        </Typography>
        <Typography variant="h4" sx={{ mt: 0.5, mb: 4 }}>
          More vendors like this
        </Typography>
        <Grid container spacing={3}>
          {vendors.map((vendor) => (
            <Grid item xs={12} sm={6} md={3} key={vendor.id}>
              <VendorCard vendor={vendor} />
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
