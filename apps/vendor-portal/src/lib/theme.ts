import { createTheme, type ThemeOptions } from "@mui/material/styles";

// Sinnapi design tokens (Step 4) — Amethyst primary + Gold secondary.
const shared: ThemeOptions = {
  shape: { borderRadius: 8 },
  breakpoints: { values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 } },
  typography: {
    fontFamily: '"Inter", Helvetica, Arial, sans-serif',
    h1: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 600, fontSize: "2.4rem", lineHeight: 1.15 },
    h2: { fontWeight: 700, fontSize: "2rem", lineHeight: 1.2 },
    h3: { fontWeight: 700, fontSize: "1.5rem", lineHeight: 1.25 },
    h4: { fontWeight: 600, fontSize: "1.25rem" },
    h5: { fontWeight: 600, fontSize: "1.125rem" },
    h6: { fontWeight: 600, fontSize: "1rem" },
    button: { fontWeight: 600, textTransform: "none", letterSpacing: "0.3px" },
    overline: { fontWeight: 600, letterSpacing: "1px" },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 8, minHeight: 42 } } },
    MuiCard: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 999 } } },
    MuiTextField: { defaultProps: { variant: "outlined", fullWidth: true, size: "small" } },
    MuiListItemButton: { styleOverrides: { root: { borderRadius: 8 } } },
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
