import type { Metadata } from 'next';
import NextLink from 'next/link';
import { Container, Box, Typography, Paper, Button, Stack, Grid } from '@sinnapi/ui';
import { Person as PersonIcon, Storefront as StorefrontIcon } from '@sinnapi/ui/icons';
import { SITE } from '@/lib/config/site';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false, follow: true } };

const portal = SITE.portalUrl;

export default function SignInPage() {
  return (
    <Container sx={{ py: { xs: 6, md: 10 }, maxWidth: 720 }}>
      <Typography variant="h1" sx={{ textAlign: 'center', fontSize: { xs: '2rem', md: '2.5rem' } }}>
        Welcome back
      </Typography>
      <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
        Choose how you’d like to sign in.
      </Typography>
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6}>
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', height: '100%' }}>
            <PersonIcon color="primary" sx={{ fontSize: 40 }} />
            <Typography variant="h5" sx={{ mt: 1 }}>
              Client / Event Planner
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Plan events, book vendors, and manage quotes.
            </Typography>
            <Button
              component={NextLink}
              href={`${portal}?role=client`}
              variant="contained"
              sx={{ mt: 2 }}
              fullWidth
            >
              Sign in as Client
            </Button>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', height: '100%' }}>
            <StorefrontIcon color="primary" sx={{ fontSize: 40 }} />
            <Typography variant="h5" sx={{ mt: 1 }}>
              Vendor
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Manage your listing, bookings, and payouts.
            </Typography>
            <Button
              component={NextLink}
              href={`${portal}?role=vendor`}
              variant="contained"
              sx={{ mt: 2 }}
              fullWidth
            >
              Sign in as Vendor
            </Button>
          </Paper>
        </Grid>
      </Grid>
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="body2" color="text.secondary">
          New to Sinnapi? <NextLink href="/sign-up">Create an account</NextLink>
        </Typography>
      </Box>
    </Container>
  );
}
