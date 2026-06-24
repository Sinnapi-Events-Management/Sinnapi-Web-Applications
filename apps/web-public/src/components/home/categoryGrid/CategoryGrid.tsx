import NextLink from 'next/link';
import { Box, Container, Grid, Typography, Button } from '@sinnapi/ui';
import { ArrowForward } from '@sinnapi/ui/icons';
import { palette, withAlpha } from '@sinnapi/ui/tokens';
import SectionHeading from '@/components/common/SectionHeading';
import { titleize } from '@/lib/config/site';
import { mutedSurface } from '@/lib/sx';
import { CATEGORIES } from './data/categories';

export default function CategoryGrid() {
  return (
    <Box sx={{ ...mutedSurface, borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
      <Container sx={{ py: { xs: 6, md: 9 } }}>
        <SectionHeading
          overline="Explore"
          title="Browse by category"
          subtitle="From photographers to venues — discover trusted providers for every part of your event."
        />
        <Grid container spacing={2.5}>
          {CATEGORIES.map(({ key, Icon, img }) => (
            <Grid item xs={6} sm={4} md={3} key={key}>
              <Box
                component={NextLink}
                href={`/vendors?category=${key}`}
                sx={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  height: { xs: 120, md: 160 },
                  p: 2,
                  borderRadius: 2,
                  overflow: 'hidden',
                  textDecoration: 'none',
                  color: 'common.white',
                  bgcolor: 'primary.dark',
                  backgroundImage: `linear-gradient(to top, ${withAlpha(palette.light.primary.dark, 0.92)} 0%, ${withAlpha(palette.light.primary.dark, 0.35)} 60%, ${withAlpha(palette.light.primary.dark, 0.15)} 100%), url(${img})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  transition: 'transform .2s, box-shadow .2s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                }}
              >
                <Box sx={{ '& svg': { fontSize: 28 } }}>
                  <Icon />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 0.5 }}>
                  {titleize(key)}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button
            component={NextLink}
            href="/vendors"
            variant="outlined"
            endIcon={<ArrowForward />}
          >
            View all vendors
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
