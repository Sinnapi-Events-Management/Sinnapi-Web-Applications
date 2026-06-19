import NextLink from 'next/link';
import { Box, Container, Typography, Button, Grid, Stack, Paper } from '@sinnapi/ui';
import VerifiedIcon from '@mui/icons-material/Verified';
import LockIcon from '@mui/icons-material/Lock';
import ChatIcon from '@mui/icons-material/Chat';
import SearchIcon from '@mui/icons-material/Search';
import VendorCard from '@/components/vendor/VendorCard';
import SectionHeading from '@/components/common/SectionHeading';
import EmptyState from '@/components/common/EmptyState';
import { getFeaturedVendors } from '@/lib/queries';
import { SITE } from '@/lib/config/site';

// Home is revalidated periodically (ISR) for fresh featured vendors.
export const revalidate = 3600;

const VALUE_PROPS = [
  {
    icon: <VerifiedIcon color="primary" />,
    title: 'Verified vendors',
    body: 'Every vendor is vetted through due diligence and an MOU before listing.',
  },
  {
    icon: <LockIcon color="primary" />,
    title: 'Secure escrow',
    body: 'Pay safely — funds are held in escrow and released when you confirm.',
  },
  {
    icon: <ChatIcon color="primary" />,
    title: 'Direct messaging',
    body: 'Chat, compare quotations, and coordinate everything in one place.',
  },
  {
    icon: <SearchIcon color="primary" />,
    title: 'Easy discovery',
    body: 'Search and filter trusted providers by category, region, and budget.',
  },
];

export default async function HomePage() {
  const featured = await getFeaturedVendors(6);
  return (
    <>
      {/* Hero */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #4E1B5E 0%, #7A2E97 60%, #A95EC4 100%)',
          color: 'common.white',
          py: { xs: 8, md: 12 },
        }}
      >
        <Container>
          <Box sx={{ maxWidth: 760 }}>
            <Typography variant="h1" sx={{ color: 'common.white' }}>
              {SITE.tagline}
            </Typography>
            <Typography
              variant="h6"
              sx={{ mt: 2, fontWeight: 400, color: 'rgba(255,255,255,0.85)' }}
            >
              {SITE.description}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
              <Button
                component={NextLink}
                href="/vendors"
                variant="contained"
                color="secondary"
                size="large"
              >
                Browse vendors
              </Button>
              <Button
                component={NextLink}
                href="/apply"
                variant="outlined"
                size="large"
                sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.6)' }}
              >
                Become a vendor
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* Value props */}
      <Container sx={{ py: { xs: 6, md: 8 } }}>
        <Grid container spacing={3}>
          {VALUE_PROPS.map((v) => (
            <Grid item xs={12} sm={6} md={3} key={v.title}>
              <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
                {v.icon}
                <Typography variant="h6" sx={{ mt: 1.5 }}>
                  {v.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {v.body}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Featured vendors */}
      <Container sx={{ pb: { xs: 6, md: 10 } }}>
        <SectionHeading
          overline="Handpicked"
          title="Featured vendors"
          subtitle="Top-rated, verified providers ready for your next event."
        />
        {featured.length === 0 ? (
          <EmptyState
            title="Featured vendors coming soon"
            description="Verified vendors will appear here once onboarded."
            ctaLabel="Browse all vendors"
            ctaHref="/vendors"
          />
        ) : (
          <Grid container spacing={3}>
            {featured.map((v) => (
              <Grid item xs={12} sm={6} md={4} key={v.id}>
                <VendorCard vendor={v} />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      {/* CTA band */}
      <Box sx={{ bgcolor: 'grey.50', borderTop: 1, borderColor: 'divider', py: 8 }}>
        <Container>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={3}
            alignItems="center"
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h3">Ready to plan your event?</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Create a free account to chat, request quotes, and book with confidence.
              </Typography>
            </Box>
            <Button component={NextLink} href="/sign-up" variant="contained" size="large">
              Get started
            </Button>
          </Stack>
        </Container>
      </Box>
    </>
  );
}
