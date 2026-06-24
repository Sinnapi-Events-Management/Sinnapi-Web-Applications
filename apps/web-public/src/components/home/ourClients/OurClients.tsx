import { Box, Container } from '@sinnapi/ui';
import SectionHeading from '@/components/common/SectionHeading';
import { CLIENTS } from './data/clients';
import ClientChip from './components/ClientChip';

export default function OurClients() {
  // Duplicate the track so the -50% translate loops seamlessly.
  const track = [...CLIENTS, ...CLIENTS];

  return (
    <Container sx={{ py: { xs: 6, md: 9 } }}>
      <SectionHeading
        align="center"
        overline="Our clients"
        title="Trusted by Uganda's leading brands"
        subtitle="From corporate galas to product launches, teams across the country plan with Sinnapi."
      />
      <Box
        sx={{
          overflow: 'hidden',
          // Soft fade on both edges so chips emerge/exit smoothly.
          // The mask only uses luminance/alpha (not a brand color), so plain `black`
          // marks the opaque middle; the transparent ends fade the marquee edges.
          maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
          '&:hover .sinnapi-marquee-track': { animationPlayState: 'paused' },
        }}
      >
        <Box
          className="sinnapi-marquee-track"
          sx={{
            display: 'flex',
            gap: 3,
            width: 'max-content',
            animation: 'sinnapi-clients-marquee 45s linear infinite',
            '@keyframes sinnapi-clients-marquee': {
              from: { transform: 'translateX(0)' },
              to: { transform: 'translateX(-50%)' },
            },
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
              flexWrap: 'wrap',
              justifyContent: 'center',
            },
          }}
        >
          {track.map((client, i) => (
            <ClientChip key={`${client.name}-${i}`} client={client} />
          ))}
        </Box>
      </Box>
    </Container>
  );
}
