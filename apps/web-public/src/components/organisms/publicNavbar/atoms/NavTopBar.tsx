import { Box, Container, Stack, Divider } from '@sinnapi/ui';
import { common, withAlpha } from '@sinnapi/ui/tokens';
import NavSearchForm from '@/components/molecules/navSearchForm';
import SocialLinks from '@/components/molecules/socialLinks';
import NavContactLinks from './NavContactLinks';

/**
 * Utility bar above the main navigation row: left-aligned discovery search, with
 * quick-contact links and social icons on the right (right cluster is desktop-only;
 * the search stays full-width on mobile). Colours track the navbar's transparent
 * (over-hero) vs solid surface.
 */
export default function NavTopBar({ transparent = false }: { transparent?: boolean }) {
  return (
    <Box
      sx={{
        borderBottom: 1,
        borderColor: transparent ? withAlpha(common.white, 0.16) : 'divider',
        transition: 'border-color .3s ease',
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
            <NavSearchForm transparent={transparent} sx={{ width: '100%' }} />
          </Box>

          <Stack
            direction="row"
            spacing={2.5}
            alignItems="center"
            sx={{ display: { xs: 'none', lg: 'flex' } }}
          >
            <NavContactLinks transparent={transparent} />
            <Divider
              orientation="vertical"
              flexItem
              sx={{ borderColor: transparent ? withAlpha(common.white, 0.22) : 'divider' }}
            />
            <SocialLinks
              spacing={0.5}
              iconSx={{
                color: transparent ? withAlpha(common.white, 0.85) : 'text.secondary',
                transition: 'color .2s ease',
                '&:hover': { color: transparent ? 'common.white' : 'primary.main' },
              }}
            />
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
