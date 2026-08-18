import { Box } from '@sinnapi/ui';
import { useAuthBrand } from './hooks/useAuthBrand';

/**
 * The logo above the form column. Wordmark is baked into the asset itself, so
 * this is just the mark.
 *
 * Only rendered below `md`: from `md` up the showcase panel carries the brand,
 * and repeating it in the form column would put the same logo on screen twice.
 */
export default function AuthBrandMark() {
  const { logoSrc, name, href } = useAuthBrand();

  return (
    <Box
      component="a"
      href={href}
      sx={{ display: { xs: 'inline-flex', md: 'none' } }}
      aria-label={`${name} home`}
    >
      <Box
        component="img"
        src={logoSrc}
        alt={`${name} logo`}
        sx={{ height: 36, width: 'auto', display: 'block' }}
      />
    </Box>
  );
}
