import { Box, LOGO_PLATE } from '@sinnapi/ui/atoms';
import { common, withAlpha } from '@sinnapi/ui/tokens';

/**
 * The vendor's business logo on the hero: whole, on a light plate, so a
 * wordmark or a transparent PNG reads cleanly over the teal banner.
 */
export function HeroLogoPlate({ src, name }: { src: string; name: string }) {
  return (
    <Box
      sx={{
        width: { xs: 96, md: 120 },
        height: { xs: 96, md: 120 },
        flexShrink: 0,
        borderRadius: 4,
        bgcolor: LOGO_PLATE,
        p: 1.5,
        display: 'grid',
        placeItems: 'center',
        boxShadow: `0 12px 32px -12px ${withAlpha(common.black, 0.55)}`,
      }}
    >
      <Box
        component="img"
        src={src}
        alt={`${name} logo`}
        sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
      />
    </Box>
  );
}

/**
 * A soft, heavily blurred wash of the logo behind the banner — the logo's own
 * colours, without stretching the logo itself across the page.
 */
export function HeroLogoBackdrop({ src }: { src: string }) {
  return (
    <Box
      aria-hidden
      component="img"
      src={src}
      alt=""
      sx={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        filter: 'blur(48px) saturate(1.2)',
        transform: 'scale(1.3)',
        opacity: 0.55,
      }}
    />
  );
}
