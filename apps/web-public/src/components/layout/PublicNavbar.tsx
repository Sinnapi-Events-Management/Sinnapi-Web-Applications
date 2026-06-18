"use client";
import { useState } from "react";
import NextLink from "next/link";
import {
  AppBar, Toolbar, Container, Box, Button, IconButton, Drawer, List, ListItemButton,
  ListItemText, Typography, Stack, Divider,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { PRIMARY_NAV, SITE } from "@/lib/config/site";

export default function PublicNavbar() {
  const [open, setOpen] = useState(false);
  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: "divider", backdropFilter: "blur(8px)" }}>
      <Container>
        <Toolbar disableGutters sx={{ gap: 2 }}>
          <Typography component={NextLink} href="/" variant="h5"
            sx={{ fontFamily: "var(--font-fraunces)", fontWeight: 600, color: "primary.main", textDecoration: "none", mr: 2 }}>
            {SITE.name}
          </Typography>

          <Stack direction="row" spacing={1} sx={{ display: { xs: "none", md: "flex" }, flex: 1 }}>
            {PRIMARY_NAV.map((item) => (
              <Button key={item.href} component={NextLink} href={item.href} color="inherit">
                {item.label}
              </Button>
            ))}
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ display: { xs: "none", md: "flex" } }}>
            <Button component={NextLink} href="/apply" color="inherit">Become a Vendor</Button>
            <Button component={NextLink} href="/sign-in" variant="outlined" color="primary">Sign in</Button>
            <Button component={NextLink} href="/sign-up" variant="contained" color="primary">Get started</Button>
          </Stack>

          <Box sx={{ flex: 1, display: { md: "none" } }} />
          <IconButton sx={{ display: { md: "none" } }} aria-label="Open menu" onClick={() => setOpen(true)}>
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
            <ListItemButton component={NextLink} href="/apply"><ListItemText primary="Become a Vendor" /></ListItemButton>
            <ListItemButton component={NextLink} href="/sign-in"><ListItemText primary="Sign in" /></ListItemButton>
            <ListItemButton component={NextLink} href="/sign-up"><ListItemText primary="Get started" /></ListItemButton>
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
}
