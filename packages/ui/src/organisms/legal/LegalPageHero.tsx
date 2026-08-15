'use client';
import type { LegalDocument } from '@sinnapi/content';
import { Box, Chip, Container, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PublicIcon from '@mui/icons-material/Public';
import MenuBookIcon from '@mui/icons-material/MenuBook';

export type LegalPageHeroProps = {
  document: Pick<LegalDocument, 'title' | 'subtitle' | 'effectiveDate' | 'jurisdiction'>;
  /** Number of sections, shown as a "how long is this" cue. */
  sectionCount: number;
};

/**
 * Editorial hero for a legal document inside a portal.
 *
 * The public site has its own photographic hero for these pages; this is its
 * portal-weight sibling — the same idea (the document's title and metadata own
 * the top of the page, so `LegalContent` renders with `hideHeader`) done with a
 * brand gradient rather than an image, because a portal serves this page to
 * someone who arrived to check a clause, not to be sold to.
 */
export function LegalPageHero({ document, sectionCount }: LegalPageHeroProps) {
  const { title, subtitle, effectiveDate, jurisdiction } = document;

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        color: 'common.white',
        bgcolor: 'primary.dark',
        backgroundImage: (t) =>
          `radial-gradient(120% 140% at 12% 0%, ${alpha(
            t.palette.secondary.main,
            0.28,
          )} 0%, transparent 55%), linear-gradient(140deg, ${t.palette.primary.dark} 0%, ${
            t.palette.primary.main
          } 100%)`,
        py: { xs: 6, md: 9 },
      }}
    >
      <Container sx={{ maxWidth: 1180, position: 'relative' }}>
        <Typography
          variant="h1"
          sx={{ color: 'common.white', fontSize: { xs: '2.1rem', sm: '2.6rem', md: '3rem' } }}
        >
          {title}
        </Typography>

        {subtitle && (
          <Typography
            variant="h6"
            sx={{
              mt: 2,
              fontWeight: 400,
              maxWidth: 680,
              color: (t) => alpha(t.palette.common.white, 0.88),
            }}
          >
            {subtitle}
          </Typography>
        )}

        <Stack direction="row" flexWrap="wrap" sx={{ mt: 3.5, gap: 1 }}>
          <HeroChip icon={<EventAvailableIcon />} label={`Effective ${effectiveDate}`} />
          {jurisdiction && <HeroChip icon={<PublicIcon />} label={jurisdiction} />}
          <HeroChip icon={<MenuBookIcon />} label={`${sectionCount} sections`} />
        </Stack>
      </Container>
    </Box>
  );
}

/** One metadata pill — translucent white so it reads on the gradient at any stop. */
function HeroChip({ icon, label }: { icon: React.ReactElement; label: string }) {
  return (
    <Chip
      icon={icon}
      label={label}
      size="small"
      sx={{
        color: 'common.white',
        fontWeight: 600,
        bgcolor: (t) => alpha(t.palette.common.white, 0.14),
        border: 1,
        borderColor: (t) => alpha(t.palette.common.white, 0.18),
        '& .MuiChip-icon': { color: 'secondary.light' },
      }}
    />
  );
}
