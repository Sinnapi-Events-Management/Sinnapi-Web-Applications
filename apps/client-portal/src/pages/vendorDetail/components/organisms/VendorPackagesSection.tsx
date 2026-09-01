import { Button, Grid, Paper, QueryState, Typography } from '@sinnapi/ui';
import { PackageShowcase } from '@sinnapi/ui';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import VendorSectionHeading from '../atoms/VendorSectionHeading';
import { useVendorPackages } from '../../hooks/useVendorPackages';
import PackageQuoteDialog from './PackageQuoteDialog';

type Props = {
  vendorId: string;
  vendorName: string;
};

/**
 * What this vendor sells, priced.
 *
 * Second in the tab order because it answers the question a visitor arrives
 * with — "what does this cost and what do I get" — and every section after it
 * is a question they only ask once that one is answered.
 *
 * It used to disappear entirely for a vendor who publishes no packages, so a
 * bespoke-only profile read as if the section had never existed. A fixed tab
 * bar can't do that without a tab opening onto nothing, so the empty case now
 * says the thing that is actually true — this vendor quotes bespoke — which is
 * information a visitor wants either way.
 *
 * The showcase is the same component the vendor previews in their editor and
 * the marketing site renders to signed-out visitors. One renderer, so the
 * package a client compares here is the package they were shown before they
 * signed in.
 */
export default function VendorPackagesSection({ vendorId, vendorName }: Props) {
  const state = useVendorPackages(vendorId);

  return (
    <section>
      <VendorSectionHeading
        eyebrow="Packages"
        title="Packages & pricing"
        subtitle={`Priced offers from ${vendorName}. Ask for one and it arrives as a quote you can accept.`}
      />

      <QueryState isLoading={state.isLoading} error={state.error}>
        {state.hasPackages ? (
          <Grid container spacing={3}>
            {state.packages.map((pkg) => (
              // Full width up to `lg`: a package carries an itemised table, two
              // scope lists and a tier row, and half a tablet is not enough for
              // any of them. The tab panel is now full-page width on desktop
              // rather than two thirds of it, so the pair fits where it didn't.
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
        ) : (
          <NoPublishedPackages vendorName={vendorName} />
        )}
      </QueryState>

      <PackageQuoteDialog
        vendorId={vendorId}
        request={state.request}
        onClose={state.closeRequest}
      />
    </section>
  );
}

/**
 * Not an absence — a pricing model. Quoting bespoke is a normal way to work,
 * and the useful next step is the same one a priced package leads to.
 */
function NoPublishedPackages({ vendorName }: { vendorName: string }) {
  return (
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
        {vendorName} prices each event individually rather than publishing set packages. Request a
        quote with your date and guest count and they’ll come back with a figure.
      </Typography>
    </Paper>
  );
}
