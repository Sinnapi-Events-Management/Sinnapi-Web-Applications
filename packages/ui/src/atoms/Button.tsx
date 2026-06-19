'use client';
// Direct re-export preserves MUI's polymorphic `component` prop typing
// (e.g. <Button component={Link} to="/…">). Shared defaults live in the theme.
export { Button, type ButtonProps } from '@mui/material';
