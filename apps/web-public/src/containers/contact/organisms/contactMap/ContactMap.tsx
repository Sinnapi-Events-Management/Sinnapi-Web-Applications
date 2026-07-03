import { Box, Container } from '@sinnapi/ui/atoms';
import { CONTACT } from '@sinnapi/utils/constants';

// Keyless Google Maps embed centred on the office location. Uses the public
// `output=embed` endpoint so no API key / billing is required; swap the query
// for precise coordinates once the office address is finalised.
const mapQuery = encodeURIComponent(CONTACT.address);
const MAP_SRC = `https://www.google.com/maps?q=${mapQuery}&output=embed`;

/**
 * Full-width location map. Lazy-loaded and framed in a rounded card so it reads
 * as part of the page rather than a raw iframe.
 */
export default function ContactMap() {
  return (
    <Container sx={{ py: { xs: 6, md: 9 } }}>
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: { xs: 280, md: 420 },
          borderRadius: 3,
          overflow: 'hidden',
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Box
          component="iframe"
          src={MAP_SRC}
          title={`Map showing Sinnapi's location in ${CONTACT.address}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
        />
      </Box>
    </Container>
  );
}
