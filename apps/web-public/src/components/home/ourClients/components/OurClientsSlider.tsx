'use client';
import { Box, IconButton } from '@sinnapi/ui';
import { ChevronLeft, ChevronRight } from '@sinnapi/ui/icons';
import { common } from '@sinnapi/ui/tokens';
import type { Client } from '../data/clients';
import { useClientsCarousel } from '../hooks/useClientsCarousel';
import ClientChip from './ClientChip';

/** Shared styling for the circular prev/next controls flanking the track. */
const navButtonSx = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 2,
  bgcolor: 'background.paper',
  border: 1,
  borderColor: 'divider',
  boxShadow: 2,
  '&:hover': { bgcolor: 'background.paper', boxShadow: 4 },
} as const;

export default function OurClientsSlider({ clients }: { clients: Client[] }) {
  const { emblaRef, scrollPrev, scrollNext } = useClientsCarousel();

  return (
    <Box sx={{ position: 'relative' }}>
      <IconButton
        aria-label="Previous clients"
        onClick={scrollPrev}
        sx={{ ...navButtonSx, left: { xs: -6, md: -20 } }}
      >
        <ChevronLeft />
      </IconButton>

      {/* Embla viewport — clips the track and softly fades both edges. */}
      <Box
        ref={emblaRef}
        sx={{
          overflow: 'hidden',
          // Luminance/alpha mask only: `black` marks the opaque middle while the
          // transparent ends feather the partially-revealed neighbouring slides.
          maskImage: `linear-gradient(to right, transparent, ${common.black} 6%, ${common.black} 94%, transparent)`,
          WebkitMaskImage: `linear-gradient(to right, transparent, ${common.black} 6%, ${common.black} 94%, transparent)`,
        }}
      >
        {/* Embla container — one uniform gap (16px) controls all chip spacing. */}
        <Box sx={{ display: 'flex', gap: 2, py: 1 }}>
          {clients.map((client, i) => (
            <Box
              key={`${client.name}-${i}`}
              sx={{
                // Auto-width slides: each pill sizes to its own content so chips
                // pack tightly behind a single gap, with no dead columns to leave
                // whitespace at any breakpoint. Embla snaps per chip as you page.
                flex: '0 0 auto',
              }}
            >
              <ClientChip client={client} />
            </Box>
          ))}
        </Box>
      </Box>

      <IconButton
        aria-label="Next clients"
        onClick={scrollNext}
        sx={{ ...navButtonSx, right: { xs: -6, md: -20 } }}
      >
        <ChevronRight />
      </IconButton>
    </Box>
  );
}
