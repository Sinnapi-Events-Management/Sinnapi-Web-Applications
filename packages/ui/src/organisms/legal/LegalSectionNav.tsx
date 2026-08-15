'use client';
import { legalSectionId, type LegalSection } from '@sinnapi/content';
import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useActiveSection } from './hooks/useActiveSection';

export type LegalSectionNavProps = { sections: LegalSection[] };

/**
 * Sticky table of contents for the current document.
 *
 * These documents run to dozens of numbered clauses and are almost always
 * arrived at to check one of them — "what does clause 12 say about refunds" —
 * so the page should offer a way in that is not scrolling. The active row is
 * tracked as the reader moves, which is also the answer to "where am I" on a
 * page with no other landmarks.
 *
 * Anchors are plain `<a href="#...">`: they survive a copied link, work with no
 * JavaScript, and let the browser own the smooth-scroll and focus handling that
 * a click handler would have to reimplement.
 */
export function LegalSectionNav({ sections }: LegalSectionNavProps) {
  const ids = sections.map((section) => legalSectionId(section.heading));
  const active = useActiveSection(ids);

  return (
    <Box
      component="nav"
      aria-label="Sections"
      sx={{ position: 'sticky', top: 88, maxHeight: 'calc(100dvh - 120px)', overflowY: 'auto' }}
    >
      <Typography
        variant="overline"
        sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '.08em' }}
      >
        On this page
      </Typography>

      <Box component="ol" sx={{ listStyle: 'none', m: 0, mt: 1, p: 0 }}>
        {sections.map((section, index) => {
          const id = ids[index];
          const isActive = id === active;
          return (
            <Box component="li" key={id}>
              <Box
                component="a"
                href={`#${id}`}
                aria-current={isActive ? 'true' : undefined}
                sx={{
                  display: 'flex',
                  gap: 1,
                  py: 0.75,
                  pl: 1.5,
                  pr: 1,
                  borderLeft: 2,
                  borderColor: isActive ? 'secondary.main' : 'divider',
                  color: isActive ? 'text.primary' : 'text.secondary',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '0.85rem',
                  lineHeight: 1.45,
                  textDecoration: 'none',
                  bgcolor: (t) =>
                    isActive ? alpha(t.palette.secondary.main, 0.08) : 'transparent',
                  transition: 'color .15s, background-color .15s, border-color .15s',
                  '&:hover': { color: 'text.primary' },
                }}
              >
                <Box
                  component="span"
                  sx={{ color: 'text.disabled', fontVariantNumeric: 'tabular-nums' }}
                >
                  {index + 1}.
                </Box>
                <Box component="span">{section.heading}</Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
