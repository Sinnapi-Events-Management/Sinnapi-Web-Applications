'use client';
import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { PAPER, PAPER_FONT, SINNAPI_FOOTER } from '../paper';

type Props = {
  children: ReactNode;
  /** Printed bottom-right of the footer next to the page count. */
  documentNo: string | null;
  /** Draws the diagonal CANCELLED mark across the page. */
  isVoid?: boolean;
  /** Accessible name for the whole sheet. */
  label: string;
};

/**
 * A sheet of paper: white whatever the theme, the thin gold line on top,
 * the Sinnapi footer at the bottom. The invoice and receipt previews are
 * drawn inside one of these, at A4 proportions on a desktop and edge to
 * edge on a phone.
 */
export function DocumentPaper({ children, documentNo, isVoid, label }: Props) {
  return (
    <Box
      component="article"
      aria-label={label}
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: 794,
        mx: 'auto',
        minHeight: { md: 1123 * 0.85 },
        bgcolor: PAPER.paper,
        color: PAPER.ink,
        fontFamily: PAPER_FONT,
        borderRadius: { xs: 2, sm: 1 },
        boxShadow: '0 2px 14px rgba(26,19,32,0.14)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        // The page is paper in both themes; nothing inside inherits the app's.
        colorScheme: 'light',
      }}
    >
      <Box sx={{ height: 6, bgcolor: PAPER.accent, flexShrink: 0 }} />
      {isVoid && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          <Box
            sx={{
              transform: 'rotate(-28deg)',
              // Sized for "CANCELLED" (nine letters) to stay inside a phone-width page.
              fontSize: { xs: 36, sm: 72 },
              fontWeight: 700,
              letterSpacing: { xs: '4px', sm: '8px' },
              whiteSpace: 'nowrap',
              color: 'rgba(154,27,27,0.12)',
              border: '6px solid rgba(154,27,27,0.12)',
              px: 4,
              borderRadius: 3,
            }}
          >
            CANCELLED
          </Box>
        </Box>
      )}
      <Box
        sx={{
          flexGrow: 1,
          px: { xs: 2.5, sm: 8 },
          pt: { xs: 3, sm: 5.5 },
          pb: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 3, sm: 3.5 },
        }}
      >
        {children}
      </Box>
      <Box
        component="footer"
        sx={{
          mx: { xs: 2.5, sm: 8 },
          pt: 1.75,
          pb: 3.5,
          borderTop: `1px solid ${PAPER.rule}`,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: 1,
          fontSize: 11,
          color: PAPER.muted,
        }}
      >
        <span>{SINNAPI_FOOTER}</span>
        {documentNo && (
          <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {documentNo}
          </Box>
        )}
      </Box>
    </Box>
  );
}
