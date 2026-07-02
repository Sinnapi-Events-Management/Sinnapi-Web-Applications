import { Box, Typography, Stack } from '@sinnapi/ui';
import ScrollReveal from '@/components/atoms/scrollReveal';
import type { VendorDetailModel } from '@/lib/types';

/**
 * The reading column of the detail page. Renders the vendor's biography as
 * spaced paragraphs (split on blank lines) and reveals on scroll for a calm
 * entrance. Falls back to neutral copy when a vendor has no biography so the
 * column is never empty.
 */
export default function VendorDetailOverview({ vendor }: { vendor: VendorDetailModel }) {
  const paragraphs =
    vendor.biography
      ?.split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean) ?? [];

  const fallback =
    'A verified provider on Sinnapi. Sign in to chat, request a quote and see how they can help bring your event to life.';

  return (
    <ScrollReveal>
      <Box>
        <Typography variant="overline" color="primary">
          Overview
        </Typography>
        <Typography variant="h4" sx={{ mt: 0.5, mb: 2.5 }}>
          About {vendor.business_name}
        </Typography>

        {paragraphs.length > 0 ? (
          <Stack spacing={2}>
            {paragraphs.map((paragraph, i) => (
              <Typography key={i} variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                {paragraph}
              </Typography>
            ))}
          </Stack>
        ) : (
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
            {fallback}
          </Typography>
        )}
      </Box>
    </ScrollReveal>
  );
}
