'use client';
// Direct re-export preserves MUI's polymorphic `component` prop typing
// (e.g. <Button component={Link} to="/…">). Shared defaults live in the theme.
export { Button, type ButtonProps } from '@mui/material';
// Unstyled, fully accessible click target — for surfaces that are buttons in
// behaviour but not in appearance (media tiles, card-sized hit areas).
export { ButtonBase, type ButtonBaseProps } from '@mui/material';
