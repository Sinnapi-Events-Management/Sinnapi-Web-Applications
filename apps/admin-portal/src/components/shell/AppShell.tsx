import { useState } from "react";
import { Link as RouterLink, NavLink, useLocation, useNavigate, Outlet } from "react-router-dom";
import {
  AppBar, Box, Drawer, Toolbar, List, ListItemButton, ListItemIcon, ListItemText, Typography,
  IconButton, Divider, Avatar, Menu, MenuItem, Badge, Tooltip, Chip, ListSubheader,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/Notifications";
import LogoutIcon from "@mui/icons-material/Logout";
import { NAV_SECTIONS, APP } from "@/lib/config";
import { useAuth } from "@/auth/AuthProvider";
import { useAdmin } from "@/admin/AdminProvider";
import { useProfile, useUnreadCount } from "@/hooks/queries";

const DRAWER_WIDTH = 264;

export default function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { has, roles } = useAdmin();
  const { data: profile } = useProfile();
  const { data: unread = 0 } = useUnreadCount();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuEl, setMenuEl] = useState<null | HTMLElement>(null);

  const name = profile?.full_name ?? user?.email ?? "Admin";

  async function handleSignOut() { await signOut(); navigate("/sign-in", { replace: true }); }

  const nav = (
    <Box sx={{ px: 1.25, py: 2 }}>
      <Box sx={{ px: 1.25, mb: 2, display: "flex", alignItems: "baseline", gap: 1 }}>
        <Typography component={RouterLink} to="/dashboard" variant="h5"
          sx={{ fontFamily: '"Fraunces", serif', fontWeight: 600, color: "primary.main", textDecoration: "none" }}>
          {APP.name}
        </Typography>
        <Chip size="small" label="Admin" color="primary" />
      </Box>
      {NAV_SECTIONS.map((section) => {
        const items = section.items.filter((it) => !it.perm || has(it.perm));
        if (items.length === 0) return null;
        return (
          <List key={section.title} dense
            subheader={<ListSubheader disableSticky sx={{ bgcolor: "transparent", lineHeight: "32px" }}>{section.title}</ListSubheader>}>
            {items.map(({ label, to, icon: Icon }) => {
              const active = pathname === to || pathname.startsWith(`${to}/`);
              return (
                <ListItemButton key={to} component={NavLink} to={to} selected={active} onClick={() => setMobileOpen(false)} sx={{ mb: 0.25 }}>
                  <ListItemIcon sx={{ minWidth: 36, color: active ? "primary.main" : undefined }}><Icon fontSize="small" /></ListItemIcon>
                  <ListItemText primaryTypographyProps={{ variant: "body2" }} primary={label} />
                  {to === "/notifications" && unread > 0 && <Badge color="error" badgeContent={unread} />}
                </ListItemButton>
              );
            })}
          </List>
        );
      })}
    </Box>
  );

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
            <Avatar src={profile?.avatar_url ?? undefined} sx={{ width: 32, height: 32 }}>{name.charAt(0)}</Avatar>
          </IconButton>
          <Menu anchorEl={menuEl} open={!!menuEl} onClose={() => setMenuEl(null)}>
            <MenuItem disabled sx={{ opacity: "1 !important" }}>
              <Box>
                <Typography variant="subtitle2">{name}</Typography>
                <Typography variant="caption" color="text.secondary">{roles.join(", ") || "admin"}</Typography>
              </Box>
            </MenuItem>
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
        <Box sx={{ p: { xs: 2, md: 4 } }}><Outlet /></Box>
      </Box>
    </Box>
  );
}
