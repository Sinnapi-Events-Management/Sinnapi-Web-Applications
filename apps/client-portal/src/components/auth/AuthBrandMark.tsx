import { Box } from '@sinnapi/ui';
import { APP } from '@/lib/config';

// Wordmark is baked into the logo asset itself, so this is just the mark.
export default function AuthBrandMark() {
  return (
    <Box component="a" href={APP.publicUrl} sx={{ display: 'inline-flex' }}>
      <Box
        component="img"
        src="/logo.png"
        alt={`${APP.name} logo`}
        sx={{ height: 36, width: 'auto', display: 'block' }}
      />
    </Box>
  );
}
