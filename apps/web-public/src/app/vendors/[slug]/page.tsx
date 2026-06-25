import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import NextLink from 'next/link';
import {
  Container,
  Grid,
  Box,
  Typography,
  Button,
  Chip,
  Stack,
  Rating,
  Divider,
  Paper,
  Alert,
  ImageList,
  ImageListItem,
} from '@sinnapi/ui';
import { Verified as VerifiedIcon, Place as PlaceIcon, Lock as LockIcon } from '@sinnapi/ui/icons';
import {
  getVendorBySlug,
  getVendorMedia,
  getVendorReviews,
  getAllVendorSlugs,
} from '@/lib/queries';
import { formatMoney, titleize, SITE } from '@/lib/config/site';

export const revalidate = 600; // ISR + on-demand revalidation on profile changes

export async function generateStaticParams() {
  const slugs = await getAllVendorSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const vendor = await getVendorBySlug(params.slug);
  if (!vendor) return { title: 'Vendor not found' };
  const desc =
    vendor.biography?.slice(0, 155) ??
    `${vendor.business_name} — verified event vendor on Sinnapi.`;
  return {
    title: vendor.business_name,
    description: desc,
    alternates: { canonical: `/vendors/${vendor.slug}` },
    openGraph: {
      title: vendor.business_name,
      description: desc,
      images: vendor.primary_image_url ? [vendor.primary_image_url] : [],
    },
  };
}

export default async function VendorProfilePage({ params }: { params: { slug: string } }) {
  const vendor = await getVendorBySlug(params.slug);
  if (!vendor) notFound();

  const [media, reviews] = await Promise.all([
    getVendorMedia(vendor.id),
    getVendorReviews(vendor.id),
  ]);
  const images = media.filter((m) => m.media_type === 'image' && m.url);
  const price = formatMoney(vendor.starting_price, vendor.starting_price_currency);

  // Structured data for SEO (LocalBusiness + AggregateRating).
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: vendor.business_name,
    description: vendor.biography ?? undefined,
    image: vendor.primary_image_url ?? undefined,
    url: `${SITE.url}/vendors/${vendor.slug}`,
    address: vendor.base_city
      ? { '@type': 'PostalAddress', addressLocality: vendor.base_city }
      : undefined,
    aggregateRating:
      vendor.review_count > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: vendor.avg_rating,
            reviewCount: vendor.review_count,
          }
        : undefined,
  };

  return (
    <Container sx={{ py: { xs: 4, md: 6 } }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Grid container spacing={4}>
        {/* Main */}
        <Grid item xs={12} md={8}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h1" sx={{ fontSize: { xs: '2rem', md: '2.5rem' } }}>
              {vendor.business_name}
            </Typography>
            <VerifiedIcon color="primary" titleAccess="Verified vendor" />
          </Stack>
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{ mt: 1, color: 'text.secondary' }}
          >
            {vendor.base_city && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <PlaceIcon fontSize="small" />
                <Typography>{vendor.base_city}</Typography>
              </Stack>
            )}
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Rating value={vendor.avg_rating} precision={0.5} size="small" readOnly />
              <Typography variant="body2">
                {vendor.avg_rating.toFixed(1)} ({vendor.review_count})
              </Typography>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
            {vendor.pricing_model && <Chip label={titleize(vendor.pricing_model)} />}
            {vendor.lead_time && (
              <Chip variant="outlined" label={`Lead time: ${titleize(vendor.lead_time)}`} />
            )}
            {vendor.years_in_operation && (
              <Chip variant="outlined" label={titleize(vendor.years_in_operation)} />
            )}
          </Stack>

          {vendor.biography && (
            <Typography sx={{ mt: 3 }} color="text.secondary">
              {vendor.biography}
            </Typography>
          )}

          {images.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h4" sx={{ mb: 2 }}>
                Portfolio
              </Typography>
              <ImageList variant="masonry" cols={3} gap={8}>
                {images.map((m) => (
                  <ImageListItem key={m.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.url!}
                      alt={m.caption ?? vendor.business_name}
                      loading="lazy"
                      style={{ borderRadius: 8 }}
                    />
                  </ImageListItem>
                ))}
              </ImageList>
            </Box>
          )}

          <Divider sx={{ my: 4 }} />

          <Typography variant="h4" sx={{ mb: 2 }}>
            Reviews
          </Typography>
          {reviews.length === 0 ? (
            <Typography color="text.secondary">No reviews yet.</Typography>
          ) : (
            <Stack spacing={2}>
              {reviews.map((r) => (
                <Paper key={r.id} variant="outlined" sx={{ p: 2 }}>
                  <Rating value={r.rating} size="small" readOnly />
                  {r.title && (
                    <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
                      {r.title}
                    </Typography>
                  )}
                  {r.body && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {r.body}
                    </Typography>
                  )}
                </Paper>
              ))}
            </Stack>
          )}
        </Grid>

        {/* Sticky action panel — contacts hidden; CTAs require sign-in */}
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 3, position: { md: 'sticky' }, top: { md: 88 } }}>
            {price && (
              <>
                <Typography variant="overline" color="text.secondary">
                  Starting from
                </Typography>
                <Typography variant="h4">{price}</Typography>
              </>
            )}
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              <Button component={NextLink} href="/sign-in" variant="contained" size="large">
                Request a quote
              </Button>
              <Button component={NextLink} href="/sign-in" variant="outlined" size="large">
                Message vendor
              </Button>
            </Stack>
            <Alert icon={<LockIcon fontSize="inherit" />} severity="info" sx={{ mt: 2 }}>
              Sign in to chat and request quotations. Vendor contact details are protected.
            </Alert>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
