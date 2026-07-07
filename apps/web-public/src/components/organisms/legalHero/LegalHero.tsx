import type { LegalDocument } from '@sinnapi/content';
import { Box, Chip, Container, Typography } from '@sinnapi/ui/atoms';
import { common, palette, withAlpha } from '@sinnapi/ui/tokens';
import HeroBackdrop from '@/components/molecules/heroBackdrop';
import LegalHeroMeta from '@/components/molecules/legalHeroMeta';
import type { LegalHeroChrome } from './types';

export interface LegalHeroProps extends LegalHeroChrome {
  /**
   * The document this hero introduces. Its `title`, `effectiveDate` and
   * `jurisdiction` are the single source of truth — the paired `LegalContent`
   * renders with `hideHeader` so the title lives here, not twice.
   */
  document: Pick<LegalDocument, 'title' | 'effectiveDate' | 'jurisdiction'>;
}

/**
 * Editorial hero for the public legal pages (Vendor Terms, Client Terms, Escrow
 * Policy, Privacy). Reuses the About hero's photo-over-teal treatment for brand
 * continuity, but is purpose-built for documents: eyebrow, title, tagline and a
 * metadata row — no CTAs. Each page varies only through its `LegalHeroChrome`.
 */
export default function LegalHero({
  document,
  eyebrow,
  Icon,
  tagline,
  image,
  accentColor,
}: LegalHeroProps) {
  const { title, effectiveDate, jurisdiction } = document;

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        color: 'common.white',
        backgroundColor: 'primary.dark',
        pt: { xs: 8, md: 12 },
        pb: { xs: 8, md: 12 },
      }}
    >
      <HeroBackdrop image={image} accentColor={accentColor} />

      <Container
        sx={{ position: 'relative', maxWidth: 'md', textAlign: { xs: 'left', md: 'center' } }}
      >
        <Chip
          icon={<Icon sx={{ color: 'inherit !important' }} fontSize="small" />}
          label={eyebrow}
          size="small"
          sx={{
            mb: 3,
            color: 'common.white',
            bgcolor: withAlpha(common.white, 0.14),
            fontWeight: 600,
            '& .MuiChip-icon': { color: palette.light.secondary.light },
          }}
        />
        <Typography
          variant="h1"
          sx={{
            color: 'common.white',
            fontSize: { xs: '2.2rem', sm: '2.7rem', md: '3.3rem' },
            lineHeight: 1.1,
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="h6"
          sx={{
            mt: 2.5,
            fontWeight: 400,
            color: withAlpha(common.white, 0.9),
            maxWidth: 680,
            mx: { md: 'auto' },
          }}
        >
          {tagline}
        </Typography>

        <LegalHeroMeta effectiveDate={effectiveDate} jurisdiction={jurisdiction} />
      </Container>
    </Box>
  );
}
