import type { Metadata } from 'next';
import NextLink from 'next/link';
import {
  Container,
  Typography,
  Button,
  Stack,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Box,
} from '@sinnapi/ui';
import { CheckCircle as CheckCircleIcon } from '@sinnapi/ui/icons';
import { SITE } from '@/lib/config/site';

export const metadata: Metadata = {
  title: 'Become a vendor',
  description:
    'Apply to list your event business on Sinnapi — verified vendors reach more clients with secure bookings and escrow.',
  alternates: { canonical: '/apply' },
};

const STEPS = [
  'Submit your application with business details, media, and verification documents',
  'Our team reviews your application and completes due diligence',
  'Sign the vendor MOU',
  'Get approved and enjoy a 30-day free trial',
  'Choose a subscription plan and go live to clients',
];

export default function ApplyPage() {
  return (
    <Container sx={{ py: { xs: 6, md: 10 }, maxWidth: 820 }}>
      <Typography variant="h1" sx={{ fontSize: { xs: '2.2rem', md: '2.8rem' } }}>
        Grow your event business with Sinnapi
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 400, color: 'text.secondary', mt: 2 }}>
        Join a trusted marketplace of verified vendors. Reach more clients, manage bookings, and get
        paid securely through escrow.
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, mt: 4 }}>
        <Typography variant="h5">How onboarding works</Typography>
        <List>
          {STEPS.map((s, i) => (
            <ListItem key={i} disableGutters>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <CheckCircleIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary={s} />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
        <Button
          component={NextLink}
          href={`${SITE.portalUrl}?role=vendor&mode=apply`}
          variant="contained"
          size="large"
        >
          Start your application
        </Button>
        <Button component={NextLink} href="/pricing" variant="outlined" size="large">
          View pricing
        </Button>
      </Stack>
      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary">
          By applying you agree to our <NextLink href="/vendor-terms">Vendor Terms</NextLink> and{' '}
          <NextLink href="/escrow-policy">Escrow Policy</NextLink>.
        </Typography>
      </Box>
    </Container>
  );
}
