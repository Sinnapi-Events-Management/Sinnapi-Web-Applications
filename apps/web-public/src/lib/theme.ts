"use client";
import { createTheme, type ThemeOptions } from "@mui/material/styles";

// Sinnapi design tokens (Step 4) — Amethyst primary + Gold secondary.
const shared: ThemeOptions = {
  shape: { borderRadius: 8 },
  breakpoints: { values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 } },
  typography: {
    fontFamily: "var(--font-inter), Helvetica, Arial, sans-serif",
    h1: { fontFamily: "var(--font-fraunces), Georgia, serif", fontWeight: 600, fontSize: "2.8rem", lineHeight: 1.15, letterSpacing: "-0.25px" },
    h2: { fontWeight: 700, fontSize: "2.25rem", lineHeight: 1.2, letterSpacing: "-0.25px" },
    h3: { fontWeight: 700, fontSize: "1.75rem", lineHeight: 1.25 },
    h4: { fontWeight: 600, fontSize: "1.375rem", lineHeight: 1.3 },
    h5: { fontWeight: 600, fontSize: "1.125rem", lineHeight: 1.35 },
    h6: { fontWeight: 600, fontSize: "1rem", lineHeight: 1.4, letterSpacing: "0.15px" },
    button: { fontWeight: 600, textTransform: "none", letterSpacing: "0.3px" },
    overline: { fontWeight: 600, letterSpacing: "1px" },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 8, minHeight: 44, paddingInline: 20 } },
    },
    MuiCard: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: 12 } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 999 } } },
    MuiTextField: { defaultProps: { variant: "outlined", fullWidth: true } },
    MuiLink: { defaultProps: { underline: "hover" } },
    MuiContainer: { defaultProps: { maxWidth: "lg" } },
  },
};

export const lightTheme = createTheme({
  ...shared,
  palette: {
    mode: "light",
    primary: { light: "#BE80D1", main: "#7A2E97", dark: "#642478", contrastText: "#FFFFFF" },
    secondary: { light: "#F6D064", main: "#B9890F", dark: "#946D0B", contrastText: "#1A1320" },
    success: { light: "#5FB868", main: "#2E7D32", dark: "#1B5E20", contrastText: "#FFFFFF" },
    warning: { light: "#FFB547", main: "#ED6C02", dark: "#B53D00", contrastText: "#1A1320" },
    error: { light: "#EF5350", main: "#D32F2F", dark: "#9A1B1B", contrastText: "#FFFFFF" },
    info: { light: "#4FC3F7", main: "#0288D1", dark: "#01579B", contrastText: "#FFFFFF" },
    background: { default: "#FAF9FB", paper: "#FFFFFF" },
    text: { primary: "#1A1320", secondary: "#5C5468", disabled: "#A8A0B5" },
    divider: "rgba(26,19,32,0.12)",
  },
});

export const darkTheme = createTheme({
  ...shared,
  palette: {
    mode: "dark",
    primary: { light: "#D4ABE0", main: "#BE80D1", dark: "#8E3CAE", contrastText: "#1A1320" },
    secondary: { light: "#FADF92", main: "#F6D064", dark: "#D4A017", contrastText: "#1A1320" },
    success: { main: "#5FB868" }, warning: { main: "#FFB547" }, error: { main: "#EF5350" }, info: { main: "#4FC3F7" },
    background: { default: "#100B16", paper: "#1A1320" },
    text: { primary: "#F2F0F4", secondary: "#A8A0B5", disabled: "#5C5468" },
    divider: "rgba(242,240,244,0.12)",
  },
});
