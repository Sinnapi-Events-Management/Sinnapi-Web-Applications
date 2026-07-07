'use client';
import { useState } from 'react';
import NextLink from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Container, Box, Button, IconButton, Stack, Divider } from '@sinnapi/ui/atoms';
import {
  PrimaryButton,
  List,
  ListItemButton,
  ListItemText,
  ThemeToggle,
} from '@sinnapi/ui/molecules';
import { AppBar, Toolbar, Drawer } from '@sinnapi/ui/organisms';
import { useColorScheme } from '@sinnapi/ui/theme';
import type { Theme } from '@sinnapi/ui/theme';
import { useScrollTrigger } from '@sinnapi/ui/system';
import { Menu as MenuIcon } from '@mui/icons-material';
import { common, withAlpha } from '@sinnapi/ui/tokens';
import { PRIMARY_NAV, SITE } from '@/lib/config/site';
import { isActiveHref } from '@/lib/nav';
import NavTopBar from './atoms/NavTopBar';

export default function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === '/';
  const { mode } = useColorScheme();
  const isDark = mode === 'dark';

  // Fires as soon as the user scrolls away from the very top of the page.
  const scrolled = useScrollTrigger({ disableHysteresis: true, threshold: 0 });

  // The navbar is see-through only while it overlays the homepage hero (top, unscrolled).
  // Everywhere else — and once scrolled — it keeps the standard solid surface.
  const transparent = isHome && !scrolled;

  // The light logo reads on a dark background — use it over the hero overlay and
  // on solid surfaces in dark mode; otherwise the dark logo on the light surface.
  const logoSrc = transparent || isDark ? '/logo-light.png' : '/logo.png';

  // The active menu item reads as a distinct pill — a soft brand-tinted, fully
  // rounded background with bold brand-coloured text — so the current page stands
  // out clearly against the flat sibling links (Material 3 / pill-nav pattern),
  // instead of a subtle colour change that blends in. Over the transparent hero
  // it's a translucent white chip so it stays legible on the photo (in practice
  // no primary-nav item is active on `/`, but this keeps the rule robust).
  const activeNavSx = (theme: Theme) => ({
    fontWeight: 700,
    borderRadius: '999px',
    ...(transparent
      ? {
          color: common.white,
          backgroundColor: withAlpha(common.white, 0.16),
          '&:hover': { backgroundColor: withAlpha(common.white, 0.24) },
        }
      : {
          color:
            theme.palette.mode === 'dark'
              ? theme.palette.primary.light
              : theme.palette.primary.main,
          backgroundColor: withAlpha(
            theme.palette.primary.main,
            theme.palette.mode === 'dark' ? 0.22 : 0.1,
          ),
          '&:hover': {
            backgroundColor: withAlpha(
              theme.palette.primary.main,
              theme.palette.mode === 'dark' ? 0.3 : 0.16,
            ),
          },
        }),
  });

  // The active item in the mobile drawer gets the same soft-teal pill plus a
  // brand accent bar down its leading edge — a common modern "current section"
  // cue in vertical nav lists.
  const drawerActiveSx = {
    borderRadius: 1.5,
    '&.Mui-selected': {
      backgroundColor: withAlpha(mode === 'dark' ? '#3F9BA3' : '#07504D', 0.1),
      borderLeft: '3px solid',
      borderColor: 'primary.main',
      '&:hover': {
        backgroundColor: withAlpha(mode === 'dark' ? '#3F9BA3' : '#07504D', 0.16),
      },
    },
  };

  // The "Become a Vendor" CTA doubles as a nav entry to `/apply`, so it lights up
  // like the primary-nav items when the vendor-application flow is open.
  const applyActive = isActiveHref(pathname, '/apply');

  return (
    <AppBar
      position={isHome ? 'fixed' : 'sticky'}
      elevation={0}
      // `color="transparent"` makes the `sx` background authoritative: in CSS-variables
      // mode the default AppBar paints its own `var(--AppBar-background)` (plus a dark-mode
      // Paper overlay), which would otherwise override the solid surface we set below.
      color="transparent"
      sx={{
        transition: 'background-color .3s ease, color .3s ease, border-color .3s ease',
        backdropFilter: transparent ? 'none' : 'blur(8px)',
        backgroundColor: transparent ? 'transparent' : 'background.default',
        backgroundImage: 'none',
        color: transparent ? 'common.white' : 'text.primary',
        borderBottom: 1,
        borderColor: transparent ? 'transparent' : 'divider',
        // Dark mode pairs a pure-black NavTopBar with a lighter "light black" nav
        // row (elevated paper surface) for a two-tier header. Light mode keeps the
        // standard off-white surface above. Selector resolves CSS vars at paint time.
        ...(transparent
          ? null
          : { '[data-mui-color-scheme="dark"] &': { backgroundColor: 'background.paper' } }),
      }}
    >
      {/* Utility bar — discovery search (left) + contact & socials (right). Sits
          above the main nav row and shares the navbar's transparent/solid surface. */}
      <NavTopBar transparent={transparent} />

      <Container>
        <Toolbar disableGutters sx={{ gap: 2 }}>
          <Box
            component={NextLink}
            href="/"
            aria-label={SITE.name}
            sx={{ display: 'inline-flex', alignItems: 'center', mr: 2 }}
          >
            <Image
              src={logoSrc}
              alt={SITE.name}
              width={626}
              height={399}
              priority
              style={{ height: 40, width: 'auto' }}
            />
          </Box>

          <Stack
            direction="row"
            spacing={0.5}
            sx={{ display: { xs: 'none', lg: 'flex' }, flex: 1 }}
          >
            {PRIMARY_NAV.map((item) => {
              const active = isActiveHref(pathname, item.href);
              return (
                <Button
                  key={item.href}
                  component={NextLink}
                  href={item.href}
                  color="inherit"
                  aria-current={active ? 'page' : undefined}
                  sx={[{ flexShrink: 0, whiteSpace: 'nowrap' }, active && activeNavSx]}
                >
                  {item.label}
                </Button>
              );
            })}
          </Stack>

          <Stack
            direction="row"
            spacing={1.0}
            sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center' }}
          >
            <Button
              component={NextLink}
              href="/apply"
              color="inherit"
              aria-current={applyActive ? 'page' : undefined}
              sx={[{ flexShrink: 0, whiteSpace: 'nowrap' }, applyActive && activeNavSx]}
            >
              Become a Vendor
            </Button>
            <ThemeToggle />
            <Button
              component={NextLink}
              href="/sign-in"
              variant="outlined"
              color={transparent ? 'inherit' : 'primary'}
              sx={{
                flexShrink: 0,
                whiteSpace: 'nowrap',
                ...(transparent ? { borderColor: withAlpha(common.white, 0.6) } : {}),
              }}
            >
              Sign in
            </Button>
            <PrimaryButton
              component={NextLink}
              href="/sign-up"
              sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
            >
              Get started
            </PrimaryButton>
          </Stack>

          <Box sx={{ flex: 1, display: { lg: 'none' } }} />
          <ThemeToggle sx={{ display: { lg: 'none' } }} />
          <IconButton
            color="inherit"
            sx={{ display: { lg: 'none' } }}
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </Container>

      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 280 }} role="presentation" onClick={() => setOpen(false)}>
          <List>
            {PRIMARY_NAV.map((item) => {
              const active = isActiveHref(pathname, item.href);
              return (
                <ListItemButton
                  key={item.href}
                  component={NextLink}
                  href={item.href}
                  selected={active}
                  aria-current={active ? 'page' : undefined}
                  sx={active ? drawerActiveSx : undefined}
                >
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: active ? 700 : undefined,
                      color: active ? 'primary.main' : undefined,
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
          <Divider />
          <List>
            <ListItemButton
              component={NextLink}
              href="/apply"
              selected={applyActive}
              aria-current={applyActive ? 'page' : undefined}
              sx={applyActive ? drawerActiveSx : undefined}
            >
              <ListItemText
                primary="Become a Vendor"
                primaryTypographyProps={{
                  fontWeight: applyActive ? 700 : undefined,
                  color: applyActive ? 'primary.main' : undefined,
                }}
              />
            </ListItemButton>
            <ListItemButton component={NextLink} href="/sign-in">
              <ListItemText primary="Sign in" />
            </ListItemButton>
            <ListItemButton component={NextLink} href="/sign-up">
              <ListItemText primary="Get started" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
}
