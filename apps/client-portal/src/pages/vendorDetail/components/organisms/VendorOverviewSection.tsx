import { Stack, Typography } from '@sinnapi/ui';
import VendorSectionHeading from '../atoms/VendorSectionHeading';
import VendorTerms from '../molecules/VendorTerms';
import type { VendorDetailModel } from '@/lib/types';

/**
 * Who the vendor is and how they work — the section a visitor lands on.
 *
 * The biography is split on blank lines rather than rendered as one block, the
 * way the public profile does it: vendors write these in a textarea and their
 * paragraph breaks are the only structure the text has.
 *
 * Never empty. A vendor who has written nothing still gets a sentence, because
 * this is the default tab and an empty first screen reads as a broken page
 * rather than a quiet one.
 */
export default function VendorOverviewSection({ vendor }: { vendor: VendorDetailModel }) {
  const paragraphs =
    vendor.biography
      ?.split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean) ?? [];

  return (
    <section>
      <VendorSectionHeading eyebrow="Overview" title={`About ${vendor.business_name}`} />

      <Stack spacing={2.5}>
        <VendorTerms vendor={vendor} />

        {paragraphs.length > 0 ? (
          <Stack spacing={2}>
            {paragraphs.map((paragraph, index) => (
              <Typography
                key={index}
                color="text.secondary"
                // Long-form prose, so a taller line and a measure that stops
                // around 70 characters — a full-width paragraph on a desktop
                // column is a paragraph nobody finishes.
                sx={{ lineHeight: 1.8, maxWidth: '70ch' }}
              >
                {paragraph}
              </Typography>
            ))}
          </Stack>
        ) : (
          <Typography color="text.secondary" sx={{ lineHeight: 1.8, maxWidth: '70ch' }}>
            {vendor.business_name} hasn’t written an introduction yet. Their work, pricing and
            availability are in the sections above — or message them and ask.
          </Typography>
        )}
      </Stack>
    </section>
  );
}
