import NextLink from 'next/link';
import Image from 'next/image';
import { Box, Container, Grid, Typography, Button } from '@sinnapi/ui/atoms';
import { ArrowForward } from '@mui/icons-material';
import { palette, withAlpha } from '@sinnapi/ui/tokens';
import SectionHeading from '@/components/molecules/sectionHeading';
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
          subtitle="From photographers to venues, discover trusted providers for every part of your event."
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
                  transition: 'transform .2s, box-shadow .2s',
                  '& .category-img': { transition: 'transform .4s ease' },
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                  '&:hover .category-img': { transform: 'scale(1.08)' },
                  '&:focus-visible': {
                    outline: `3px solid ${palette.light.secondary.main}`,
                    outlineOffset: 2,
                  },
                }}
              >
                <Image
                  className="category-img"
                  src={img}
                  alt=""
                  aria-hidden
                  fill
                  sizes="(max-width: 600px) 50vw, (max-width: 900px) 33vw, 25vw"
                  style={{ objectFit: 'cover' }}
                />
                {/* Brand scrim keeps the icon + label legible over any photo. */}
                <Box
                  aria-hidden
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(to top, ${withAlpha(palette.light.primary.dark, 0.92)} 0%, ${withAlpha(palette.light.primary.dark, 0.35)} 60%, ${withAlpha(palette.light.primary.dark, 0.15)} 100%)`,
                  }}
                />
                <Box sx={{ position: 'relative', '& svg': { fontSize: 28 } }}>
                  <Icon />
                </Box>
                <Typography
                  variant="subtitle1"
                  sx={{ position: 'relative', fontWeight: 600, mt: 0.5 }}
                >
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
