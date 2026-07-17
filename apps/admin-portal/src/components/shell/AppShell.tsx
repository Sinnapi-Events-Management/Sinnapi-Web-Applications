import { useMemo, useState } from 'react';
import { Link as RouterLink, NavLink, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  AppBar,
  Box,
  Drawer,
  Toolbar,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Tooltip,
  Chip,
  Collapse,
  Breadcrumbs,
  ThemeToggle,
  useColorScheme,
} from '@sinnapi/ui';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { NAV_SECTIONS, APP, type NavItem } from '@/lib/config';
import { useAuth } from '@/auth/AuthProvider';
import SessionTimeoutDialog from '@/auth/SessionTimeoutDialog';
import { useAdmin } from '@/admin/AdminProvider';
import { useProfile, useUnreadCount } from '@/hooks/queries';
import logo from '@/assets/logo.png';
import logoLight from '@/assets/logo-light.png';
import logoIcon from '@/assets/logo-icon.ico';

const DRAWER_WIDTH = 264;
const RAIL_WIDTH = 72;
const COLLAPSED_KEY = 'sinnapi.admin.nav.collapsed';
const GROUPS_KEY = 'sinnapi.admin.nav.groups';

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / privacy-mode failures */
  }
}

export default function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { has, roles } = useAdmin();
  const { data: profile } = useProfile();
  const { data: unread = 0 } = useUnreadCount();
  const { mode } = useColorScheme();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuEl, setMenuEl] = useState<null | HTMLElement>(null);
  const [collapsed, setCollapsed] = useState<boolean>(() => readStored(COLLAPSED_KEY, false));
  // Only groups the user manually toggled are stored; everything else falls back
  // to "open if it contains the active route" (see `isGroupOpen`).
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    readStored<Record<string, boolean>>(GROUPS_KEY, {}),
  );

  const name = profile?.full_name ?? user?.email ?? 'Admin';
  const brandLogo = mode === 'dark' ? logoLight : logo;
  const desktopWidth = collapsed ? RAIL_WIDTH : DRAWER_WIDTH;

  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);

  // Flattened, section-aware list used both for the AppBar breadcrumb and to
  // resolve which group owns the current route. Longest match wins so e.g.
  // `/notification-templates` never resolves to `/notifications`.
  const activeItem = useMemo(() => {
    const flat = NAV_SECTIONS.flatMap((s) => s.items.map((it) => ({ ...it, section: s.title })));
    return flat.filter((it) => isActive(it.to)).sort((a, b) => b.to.length - a.to.length)[0];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  const activeGroup = activeItem?.section;

  const isGroupOpen = (title: string) => openGroups[title] ?? title === activeGroup;

  function toggleGroup(title: string) {
    setOpenGroups((prev) => {
      const next = { ...prev, [title]: !(prev[title] ?? title === activeGroup) };
      writeStored(GROUPS_KEY, next);
      return next;
    });
  }

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      writeStored(COLLAPSED_KEY, next);
      return next;
    });
  }

  async function handleSignOut() {
    await signOut();
    navigate('/sign-in', { replace: true });
  }

  const widthTransition = (t: import('@sinnapi/ui').Theme) =>
    t.transitions.create(['width', 'margin'], {
      easing: t.transitions.easing.sharp,
      duration: t.transitions.duration.enteringScreen,
    });

  function ExpandedItem({ item }: { item: NavItem }) {
    const active = isActive(item.to);
    const Icon = item.icon;
    return (
      <ListItemButton
        component={NavLink}
        to={item.to}
        selected={active}
        onClick={() => setMobileOpen(false)}
        sx={{ borderRadius: 1.5, mb: 0.25, pl: 2 }}
      >
        <ListItemIcon sx={{ minWidth: 36, color: active ? 'primary.main' : 'text.secondary' }}>
          <Icon fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary={item.label}
          primaryTypographyProps={{ variant: 'body2', fontWeight: active ? 600 : 500 }}
        />
        {item.to === '/notifications' && unread > 0 && (
          <Badge color="error" badgeContent={unread} sx={{ mr: 1.5 }} />
        )}
      </ListItemButton>
    );
  }

  function MiniItem({ item }: { item: NavItem }) {
    const active = isActive(item.to);
    const Icon = item.icon;
    const showBadge = item.to === '/notifications' && unread > 0;
    return (
      <Tooltip title={item.label} placement="right" arrow>
        <ListItemButton
          component={NavLink}
          to={item.to}
          selected={active}
          sx={{ borderRadius: 1.5, mx: 1, my: 0.25, minHeight: 44, justifyContent: 'center' }}
        >
          <ListItemIcon
            sx={{
              minWidth: 0,
              justifyContent: 'center',
              color: active ? 'primary.main' : 'text.secondary',
            }}
          >
            <Badge color="error" variant="dot" invisible={!showBadge}>
              <Icon fontSize="small" />
            </Badge>
          </ListItemIcon>
        </ListItemButton>
      </Tooltip>
    );
  }

  const renderNav = (mini: boolean) => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
      {/* Brand header */}
      {mini ? (
        <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Box component={RouterLink} to="/dashboard" sx={{ display: 'flex' }}>
            <Box component="img" src={logoIcon} alt={APP.name} sx={{ width: 32, height: 32 }} />
          </Box>
          <Tooltip title="Expand menu" placement="right" arrow>
            <IconButton size="small" onClick={toggleCollapsed} aria-label="Expand navigation">
              <ChevronRightIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ) : (
        <Box
          sx={{
            px: 2,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Box
            component={RouterLink}
            to="/dashboard"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              textDecoration: 'none',
              minWidth: 0,
            }}
          >
            <Box
              component="img"
              src={brandLogo}
              alt={APP.name}
              sx={{ height: 40, width: 'auto', maxWidth: 132, objectFit: 'contain' }}
            />
            <Chip size="small" label={APP.tagline} color="secondary" />
          </Box>
          <Tooltip title="Collapse menu">
            <IconButton
              size="small"
              onClick={toggleCollapsed}
              aria-label="Collapse navigation"
              sx={{ display: { xs: 'none', md: 'inline-flex' }, flexShrink: 0 }}
            >
              <ChevronLeftIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Scrollable nav */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', pb: 2 }}>
        {NAV_SECTIONS.map((section, index) => {
          const items = section.items.filter((it) => !it.perm || has(it.perm));
          if (items.length === 0) return null;

          if (mini) {
            return (
              <Box key={section.title}>
                {index > 0 && <Divider sx={{ my: 0.5, mx: 1.5 }} />}
                <List dense disablePadding>
                  {items.map((item) => (
                    <MiniItem key={item.to} item={item} />
                  ))}
                </List>
              </Box>
            );
          }

          const open = isGroupOpen(section.title);
          return (
            <List key={section.title} dense disablePadding sx={{ px: 1.25 }}>
              <ListItemButton
                onClick={() => toggleGroup(section.title)}
                sx={{ borderRadius: 1.5, py: 0.5, mt: 0.5 }}
                aria-expanded={open}
              >
                <ListItemText
                  primary={section.title}
                  primaryTypographyProps={{
                    variant: 'overline',
                    color: 'text.secondary',
                    sx: { fontWeight: 700 },
                  }}
                />
                {open ? (
                  <ExpandLessIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                ) : (
                  <ExpandMoreIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                )}
              </ListItemButton>
              <Collapse in={open} timeout="auto" unmountOnExit>
                <Box sx={{ mb: 0.5 }}>
                  {items.map((item) => (
                    <ExpandedItem key={item.to} item={item} />
                  ))}
                </Box>
              </Collapse>
            </List>
          );
        })}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh', bgcolor: 'background.default' }}>
      <SessionTimeoutDialog />
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: (t) => {
            // Sit the bar on the white `paper` surface so it lifts off the warm
            // `secondary.lightest` content canvas (chrome reads as one crisp
            // layer with the white sidebar + cards). CssVarsProvider exposes
            // `vars` at runtime (channel tokens for alpha), but the base Theme
            // type doesn't declare it.
            const vars = (t as { vars?: { palette: { background: { paperChannel: string } } } })
              .vars;
            return vars
              ? `rgba(${vars.palette.background.paperChannel} / 0.8)`
              : t.palette.background.paper;
          },
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          width: { md: `calc(100% - ${desktopWidth}px)` },
          ml: { md: `${desktopWidth}px` },
          transition: widthTransition,
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <IconButton
            edge="start"
            sx={{ mr: 0.5, display: { md: 'none' } }}
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ minWidth: 0 }}>
            <Breadcrumbs
              aria-label="breadcrumb"
              sx={{ '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' } }}
            >
              {activeItem?.section && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  noWrap
                  sx={{ display: { xs: 'none', sm: 'block' } }}
                >
                  {activeItem.section}
                </Typography>
              )}
              <Typography variant="subtitle1" color="text.primary" fontWeight={700} noWrap>
                {activeItem?.label ?? 'Dashboard'}
              </Typography>
            </Breadcrumbs>
          </Box>

          <Box sx={{ flex: 1 }} />

          <ThemeToggle />
          <Tooltip title="Notifications">
            <IconButton component={RouterLink} to="/notifications" aria-label="Notifications">
              <Badge color="error" badgeContent={unread}>
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1.25 }} />
          <IconButton
            onClick={(e) => setMenuEl(e.currentTarget)}
            sx={{ p: 0.5 }}
            aria-label="Account menu"
          >
            <Avatar src={profile?.avatar_url ?? undefined} sx={{ width: 34, height: 34 }}>
              {name.charAt(0)}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={menuEl}
            open={!!menuEl}
            onClose={() => setMenuEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem disabled sx={{ opacity: '1 !important' }}>
              <Box>
                <Typography variant="subtitle2">{name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {roles.join(', ') || 'admin'}
                </Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleSignOut}>
              <LogoutIcon fontSize="small" sx={{ mr: 1 }} /> Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: desktopWidth }, flexShrink: { md: 0 }, transition: widthTransition }}
      >
        {/* Mobile: always full, expanded nav */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
          }}
        >
          {renderNav(false)}
        </Drawer>
        {/* Desktop: permanent, collapsible to a mini rail */}
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: desktopWidth,
              borderRight: 1,
              borderColor: 'divider',
              overflowX: 'hidden',
              transition: widthTransition,
            },
          }}
        >
          {renderNav(collapsed)}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${desktopWidth}px)` },
          transition: widthTransition,
        }}
      >
        <Toolbar />
        <Box sx={{ p: { xs: 2, md: 4 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
