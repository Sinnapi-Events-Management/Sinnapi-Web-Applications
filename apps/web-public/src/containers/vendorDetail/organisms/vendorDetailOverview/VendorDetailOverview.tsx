import { Box, Typography, Stack } from '@sinnapi/ui/atoms';
import ScrollReveal from '@/components/atoms/scrollReveal';
import VendorSectionHeading from '../../atoms/VendorSectionHeading';
import type { VendorDetailModel } from '@/lib/types';

/**
 * Who the vendor is — the section the page opens on.
 *
 * Renders the biography as spaced paragraphs (split on blank lines, which is
 * the only structure a vendor writing into a textarea gives it) and reveals on
 * scroll for a calm entrance. Falls back to neutral copy when a vendor has no
 * biography: this is the default tab, and an empty first screen reads as a
 * broken page rather than a quiet one.
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
      <Box component="section">
        <VendorSectionHeading eyebrow="Overview" title={`About ${vendor.business_name}`} />

        {paragraphs.length > 0 ? (
          <Stack spacing={2}>
            {paragraphs.map((paragraph, i) => (
              <Typography
                key={i}
                variant="body1"
                color="text.secondary"
                // A measure that stops around 70 characters: a paragraph run
                // the full width of a desktop column is one nobody finishes.
                sx={{ lineHeight: 1.8, maxWidth: '70ch' }}
              >
                {paragraph}
              </Typography>
            ))}
          </Stack>
        ) : (
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ lineHeight: 1.8, maxWidth: '70ch' }}
          >
            {fallback}
          </Typography>
        )}
      </Box>
    </ScrollReveal>
  );
}
