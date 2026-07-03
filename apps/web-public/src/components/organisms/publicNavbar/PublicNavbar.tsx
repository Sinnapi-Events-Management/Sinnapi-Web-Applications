'use client';
import { useState } from 'react';
import NextLink from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  AppBar,
  Toolbar,
  Container,
  Box,
  Button,
  PrimaryButton,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Divider,
  ThemeToggle,
  useColorScheme,
  useScrollTrigger,
} from '@sinnapi/ui';
import { Menu as MenuIcon } from '@sinnapi/ui/icons';
import { common, withAlpha } from '@sinnapi/ui/tokens';
import { PRIMARY_NAV, SITE } from '@/lib/config/site';
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
            {PRIMARY_NAV.map((item) => (
              <Button
                key={item.href}
                component={NextLink}
                href={item.href}
                color="inherit"
                sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                {item.label}
              </Button>
            ))}
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
              sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
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
            {PRIMARY_NAV.map((item) => (
              <ListItemButton key={item.href} component={NextLink} href={item.href}>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
          <Divider />
          <List>
            <ListItemButton component={NextLink} href="/apply">
              <ListItemText primary="Become a Vendor" />
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
