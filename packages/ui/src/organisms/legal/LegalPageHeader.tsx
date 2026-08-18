'use client';
import type { ReactNode } from 'react';
import { Box, Container, Stack } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { fonts } from '../../theme/tokens';
import { useReadingProgress } from './hooks/useReadingProgress';

export type LegalPageHeaderProps = {
  brandName: string;
  brandHref: string;
  /** Optional trailing element — typically a link back into the portal. */
  action?: ReactNode;
};

/**
 * Sticky page chrome: the wordmark, an optional action, and a reading-progress
 * hairline along the bottom edge.
 *
 * Translucent with a backdrop blur so the document scrolls visibly underneath
 * it — with an opaque bar the page reads as two stacked panes, and on a legal
 * document the header should stay out of the way of the thing being read.
 */
export function LegalPageHeader({ brandName, brandHref, action }: LegalPageHeaderProps) {
  const progress = useReadingProgress();

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: (t) => alpha(t.palette.background.default, 0.85),
        backdropFilter: 'blur(10px)',
      }}
    >
      <Container sx={{ maxWidth: 1180 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ py: 1.75, gap: 2 }}
        >
          <Box
            component="a"
            href={brandHref}
            sx={{
              fontFamily: fonts.heading,
              fontWeight: 600,
              fontSize: 24,
              lineHeight: 1,
              color: 'primary.main',
              textDecoration: 'none',
            }}
          >
            {brandName}
          </Box>
          {action}
        </Stack>
      </Container>

      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          left: 0,
          bottom: -1,
          height: 2,
          width: `${progress}%`,
          bgcolor: 'secondary.main',
          transition: 'width .1s linear',
        }}
      />
    </Box>
  );
}
