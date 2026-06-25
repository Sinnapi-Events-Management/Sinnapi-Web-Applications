import type { Metadata } from 'next';
import NextLink from 'next/link';
import { Container, Typography, Paper, Button, Grid } from '@sinnapi/ui';
import { PersonAdd as PersonAddIcon, Storefront as StorefrontIcon } from '@sinnapi/ui/icons';
import { SITE } from '@/lib/config/site';

export const metadata: Metadata = {
  title: 'Create an account',
  robots: { index: false, follow: true },
};

export default function SignUpPage() {
  return (
    <Container sx={{ py: { xs: 6, md: 10 }, maxWidth: 720 }}>
      <Typography variant="h1" sx={{ textAlign: 'center', fontSize: { xs: '2rem', md: '2.5rem' } }}>
        Join Sinnapi
      </Typography>
      <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
        How will you use Sinnapi?
      </Typography>
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6}>
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', height: '100%' }}>
            <PersonAddIcon color="primary" sx={{ fontSize: 40 }} />
            <Typography variant="h5" sx={{ mt: 1 }}>
              I’m planning an event
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Discover and book trusted vendors.
            </Typography>
            <Button
              component={NextLink}
              href={`${SITE.portalUrl}?role=client&mode=signup`}
              variant="contained"
              sx={{ mt: 2 }}
              fullWidth
            >
              Register as Client
            </Button>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', height: '100%' }}>
            <StorefrontIcon color="primary" sx={{ fontSize: 40 }} />
            <Typography variant="h5" sx={{ mt: 1 }}>
              I’m a service provider
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Apply to list your business and get bookings.
            </Typography>
            <Button component={NextLink} href="/apply" variant="contained" sx={{ mt: 2 }} fullWidth>
              Apply as Vendor
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
