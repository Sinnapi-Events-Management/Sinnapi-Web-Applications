import { privacyPolicy } from '@sinnapi/content';
import { Box, LegalContent, fonts } from '@sinnapi/ui';
import { APP } from '@/lib/config';

// Public (unauthenticated) legal page — shares the structured Privacy Policy
// content and the `LegalContent` renderer with the public site and the
// client-portal.
export default function Privacy() {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      <Box sx={{ p: 3 }}>
        <Box
          component="a"
          href={APP.publicUrl}
          sx={{
            fontFamily: fonts.heading,
            fontWeight: 600,
            fontSize: 24,
            color: 'primary.main',
            textDecoration: 'none',
          }}
        >
          {APP.name}
        </Box>
      </Box>
      <Box component="main" sx={{ flex: 1 }}>
        <LegalContent document={privacyPolicy} />
      </Box>
    </Box>
  );
}
