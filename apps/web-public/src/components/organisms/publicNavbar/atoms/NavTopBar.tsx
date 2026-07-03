import { Box, Container, Stack, Divider } from '@sinnapi/ui';
import { common, withAlpha } from '@sinnapi/ui/tokens';
import NavSearchForm from '@/components/molecules/navSearchForm';
import SocialLinks from '@/components/molecules/socialLinks';
import NavContactLinks from './NavContactLinks';

/**
 * Utility bar above the main navigation row: left-aligned discovery search, with
 * quick-contact links and social icons on the right (right cluster is desktop-only;
 * the search stays full-width on mobile).
 *
 * The bar always sits on a dark surface — the hero photo shows through when
 * `transparent`, otherwise a solid brand-teal fill that reads as a distinct
 * branded strip above the main-nav row. Because the surface is dark in both
 * states, the inner controls always render in light-on-dark mode; only the bar's
 * own background transitions between the two.
 *
 * The solid fill is scheme-specific: brand teal (`primary.main`, `#07504D`) in
 * light mode, and pure black (`#000000`) in dark mode, where it sits above a
 * lighter "light black" nav row (`background.paper`) for a two-tier contrast.
 * White text clears AA against both fills. The `data-mui-color-scheme` selector
 * resolves the CSS variables at paint time — no flash, no `theme =>` callback.
 */
export default function NavTopBar({ transparent = false }: { transparent?: boolean }) {
  return (
    <Box
      sx={{
        bgcolor: transparent ? 'transparent' : 'primary.main',
        borderBottom: 1,
        borderColor: transparent ? withAlpha(common.white, 0.16) : withAlpha(common.black, 0.14),
        transition: 'background-color .3s ease, border-color .3s ease',
        ...(transparent
          ? null
          : {
              '[data-mui-color-scheme="dark"] &': {
                bgcolor: common.black,
                borderColor: withAlpha(common.white, 0.1),
              },
            }),
      }}
    >
      <Container>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ gap: 2, py: 1 }}
        >
          <Box sx={{ flexGrow: { xs: 1, lg: 0 }, width: { xs: '100%', lg: 380 } }}>
            <NavSearchForm transparent sx={{ width: '100%' }} />
          </Box>

          <Stack
            direction="row"
            spacing={2.5}
            alignItems="center"
            sx={{ display: { xs: 'none', lg: 'flex' } }}
          >
            <NavContactLinks transparent />
            <Divider
              orientation="vertical"
              flexItem
              sx={{ borderColor: withAlpha(common.white, 0.22) }}
            />
            <SocialLinks
              spacing={0.5}
              iconSx={{
                color: withAlpha(common.white, 0.85),
                transition: 'color .2s ease',
                '&:hover': { color: 'common.white' },
              }}
            />
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
