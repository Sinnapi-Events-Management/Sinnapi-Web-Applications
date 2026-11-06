'use client';
import { Box } from '@mui/material';
import { PAPER } from '../paper';
import { vendorContactLines } from '../views';
import type { VendorSnapshot } from '../types';

function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => /[A-Za-z0-9]/.test(p[0] ?? ''));
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
}

/**
 * The vendor's business logo, name and contact lines — the top-left of every
 * document. The vendor's brand leads; Sinnapi appears only in the footer.
 * Without a logo, their initials sit in a quiet tile instead of a blank.
 */
export function VendorBrandBlock({ vendor }: { vendor: VendorSnapshot }) {
  const lines = vendorContactLines(vendor);
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start', minWidth: 0 }}>
      {vendor.logo_url ? (
        // The whole logo, in its own shape: up to 64px tall and 160px wide,
        // never cropped — a wide wordmark keeps its ends, the PDF matches.
        <Box
          component="img"
          src={vendor.logo_url}
          alt={`${vendor.business_name} logo`}
          sx={{
            maxWidth: { xs: 120, sm: 160 },
            maxHeight: 64,
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            objectPosition: 'left top',
            flexShrink: 0,
            display: 'block',
          }}
        />
      ) : (
        <Box
          aria-hidden
          sx={{
            width: 64,
            height: 64,
            borderRadius: '12px',
            bgcolor: PAPER.logoTile,
            color: PAPER.muted,
            fontSize: 22,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            textTransform: 'uppercase',
          }}
        >
          {initials(vendor.business_name)}
        </Box>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4, minWidth: 0 }}>
        <Box sx={{ fontSize: 19, fontWeight: 700, color: PAPER.ink, overflowWrap: 'anywhere' }}>
          {vendor.business_name}
        </Box>
        {lines.map((line) => (
          <Box
            key={line}
            sx={{ fontSize: 12.5, color: PAPER.muted, lineHeight: 1.5, overflowWrap: 'anywhere' }}
          >
            {line}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
