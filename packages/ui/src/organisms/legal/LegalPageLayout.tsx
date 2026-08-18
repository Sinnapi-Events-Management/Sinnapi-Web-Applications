'use client';
import type { ReactNode } from 'react';
import type { LegalDocument } from '@sinnapi/content';
import { Box, Container, Divider, Typography } from '@mui/material';
import { LegalContent } from '../LegalContent';
import { LegalPageHeader } from './LegalPageHeader';
import { LegalPageHero } from './LegalPageHero';
import { LegalSectionNav } from './LegalSectionNav';

export type LegalPageLayoutProps = {
  document: LegalDocument;
  /** Wordmark text, from the portal's `APP.name`. */
  brandName: string;
  /** Where the wordmark points — the public site, from `APP.publicUrl`. */
  brandHref: string;
  /** Optional trailing header element, e.g. a link back into the portal. */
  headerAction?: ReactNode;
};

/**
 * A complete legal page: chrome, hero, table of contents and document body.
 *
 * This replaces seven hand-copied page shells — Privacy, Terms, Escrow Policy
 * and Vendor Terms across the client and vendor portals — that differed only in
 * which `LegalDocument` they passed and were otherwise identical down to the
 * `sx` props. Each page is now the document plus the two config values that
 * name the portal, so a change to how legal pages look is one change rather
 * than seven, and the two portals cannot end up rendering the same policy
 * differently.
 *
 * These routes are public: they are linked from sign-in and from the settings
 * page, and must render for someone with no session at all. That is why the
 * layout owns its own header and full-height frame rather than assuming the
 * portal shell around it.
 */
export function LegalPageLayout({
  document,
  brandName,
  brandHref,
  headerAction,
}: LegalPageLayoutProps) {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      <LegalPageHeader brandName={brandName} brandHref={brandHref} action={headerAction} />

      <Box component="main" sx={{ flex: 1 }}>
        <LegalPageHero document={document} sectionCount={document.sections.length} />

        <Container sx={{ maxWidth: 1180, py: { xs: 4, md: 6 } }}>
          <Box
            sx={{
              display: 'grid',
              // The nav is a convenience, not the content: below `md` it would
              // push the document a screen down the page, so it is dropped
              // rather than stacked and the body takes the full measure.
              gridTemplateColumns: { xs: '1fr', md: '248px minmax(0, 1fr)' },
              gap: { md: 6 },
              alignItems: 'start',
            }}
          >
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <LegalSectionNav sections={document.sections} />
            </Box>

            {/* `LegalContent` sets its own Container width for standalone use;
                inside the grid the column already governs the measure. */}
            <Box sx={{ minWidth: 0, '& > .MuiContainer-root': { p: 0, maxWidth: '100%' } }}>
              <LegalContent document={document} hideHeader />
            </Box>
          </Box>
        </Container>
      </Box>

      <Divider />
      <Box component="footer" sx={{ py: 3 }}>
        <Container sx={{ maxWidth: 1180 }}>
          <Typography variant="caption" color="text.secondary">
            {brandName} · {document.title} · Effective {document.effectiveDate}
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
