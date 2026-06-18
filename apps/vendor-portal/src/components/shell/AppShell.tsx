import { useState } from "react";
import { Link as RouterLink, NavLink, useLocation, useNavigate, Outlet } from "react-router-dom";
import {
  AppBar, Box, Drawer, Toolbar, List, ListItemButton, ListItemIcon, ListItemText, Typography,
  IconButton, Divider, Avatar, Menu, MenuItem, Badge, Tooltip, Alert, Button, Chip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/Notifications";
import LogoutIcon from "@mui/icons-material/Logout";
import { PORTAL_NAV, ACCOUNT_NAV, APP } from "@/lib/config";
import { useAuth } from "@/auth/AuthProvider";
import { useProfile, useUnreadCount } from "@/hooks/queries";
import { useVendorContext } from "@/vendor/VendorProvider";

const DRAWER_WIDTH = 256;

export default function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { data: profile } = useProfile();
  const { data: unread = 0 } = useUnreadCount();
  const { vendor, subscription, loading } = useVendorContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuEl, setMenuEl] = useState<null | HTMLElement>(null);

  const name = profile?.full_name ?? user?.email ?? "You";
  const email = profile?.email ?? user?.email ?? "";

  async function handleSignOut() { await signOut(); navigate("/sign-in", { replace: true }); }

  const nav = (
    <Box sx={{ px: 1.5, py: 2 }}>
      <Box sx={{ px: 1.5, mb: 2, display: "flex", alignItems: "baseline", gap: 1 }}>
        <Typography component={RouterLink} to="/dashboard" variant="h5"
          sx={{ fontFamily: '"Fraunces", serif', fontWeight: 600, color: "primary.main", textDecoration: "none" }}>
          {APP.name}
        </Typography>
        <Chip size="small" label="Vendor" color="secondary" />
      </Box>
      <List>
        {PORTAL_NAV.map(({ label, to, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(`${to}/`);
          return (
            <ListItemButton key={to} component={NavLink} to={to} selected={active} onClick={() => setMobileOpen(false)} sx={{ mb: 0.25 }}>
              <ListItemIcon sx={{ minWidth: 38, color: active ? "primary.main" : undefined }}><Icon fontSize="small" /></ListItemIcon>
              <ListItemText primaryTypographyProps={{ variant: "body2" }} primary={label} />
              {to === "/notifications" && unread > 0 && <Badge color="error" badgeContent={unread} />}
            </ListItemButton>
          );
        })}
      </List>
      <Divider sx={{ my: 1 }} />
      <List>
        {ACCOUNT_NAV.map(({ label, to, icon: Icon }) => (
          <ListItemButton key={to} component={NavLink} to={to} selected={pathname.startsWith(to)} onClick={() => setMobileOpen(false)} sx={{ mb: 0.25 }}>
            <ListItemIcon sx={{ minWidth: 38 }}><Icon fontSize="small" /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ variant: "body2" }} primary={label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  // Onboarding / subscription banner
  let banner: React.ReactNode = null;
  if (!loading && !vendor) {
    banner = (
      <Alert severity="info" action={<Button color="inherit" size="small" component={RouterLink} to="/onboarding">Continue</Button>}>
        Complete your vendor application to start receiving bookings.
      </Alert>
    );
  } else if (subscription && ["expired", "suspended"].includes(subscription.status)) {
    banner = (
      <Alert severity="warning" action={<Button color="inherit" size="small" component={RouterLink} to="/subscription">Renew</Button>}>
        Your subscription is inactive — your public listing is hidden until you renew.
      </Alert>
    );
  } else if (subscription?.status === "grace") {
    banner = (
      <Alert severity="warning" action={<Button color="inherit" size="small" component={RouterLink} to="/subscription">Choose a plan</Button>}>
        Your trial/billing period has ended. You're in the grace period — choose a plan to stay visible.
      </Alert>
    );
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh", bgcolor: "background.default" }}>
      <AppBar position="fixed" color="inherit" elevation={0}
        sx={{ borderBottom: 1, borderColor: "divider", width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }, ml: { md: `${DRAWER_WIDTH}px` } }}>
        <Toolbar>
          <IconButton edge="start" sx={{ mr: 1, display: { md: "none" } }} onClick={() => setMobileOpen(true)} aria-label="Open navigation"><MenuIcon /></IconButton>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Notifications">
            <IconButton component={RouterLink} to="/notifications" aria-label="Notifications">
              <Badge color="error" badgeContent={unread}><NotificationsIcon /></Badge>
            </IconButton>
          </Tooltip>
          <IconButton onClick={(e) => setMenuEl(e.currentTarget)} sx={{ ml: 1 }} aria-label="Account menu">
            <Avatar src={vendor?.primary_image_url ?? profile?.avatar_url ?? undefined} sx={{ width: 32, height: 32 }}>{name.charAt(0)}</Avatar>
          </IconButton>
          <Menu anchorEl={menuEl} open={!!menuEl} onClose={() => setMenuEl(null)}>
            <MenuItem disabled sx={{ opacity: "1 !important" }}>
              <Box><Typography variant="subtitle2">{vendor?.business_name ?? name}</Typography><Typography variant="caption" color="text.secondary">{email}</Typography></Box>
            </MenuItem>
            <Divider />
            <MenuItem component={RouterLink} to="/profile" onClick={() => setMenuEl(null)}>Business Profile</MenuItem>
            <MenuItem component={RouterLink} to="/subscription" onClick={() => setMenuEl(null)}>Subscription</MenuItem>
            <MenuItem component={RouterLink} to="/settings" onClick={() => setMenuEl(null)}>Settings</MenuItem>
            <Divider />
            <MenuItem onClick={handleSignOut}><LogoutIcon fontSize="small" sx={{ mr: 1 }} /> Sign out</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: "block", md: "none" }, "& .MuiDrawer-paper": { width: DRAWER_WIDTH } }}>{nav}</Drawer>
        <Drawer variant="permanent" open
          sx={{ display: { xs: "none", md: "block" }, "& .MuiDrawer-paper": { width: DRAWER_WIDTH, borderRight: 1, borderColor: "divider" } }}>{nav}</Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` } }}>
        <Toolbar />
        <Box sx={{ p: { xs: 2, md: 4 } }}>
          {banner && <Box sx={{ mb: 3 }}>{banner}</Box>}
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
