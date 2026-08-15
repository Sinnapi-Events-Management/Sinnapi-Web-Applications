'use client';
import { Button } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Link as RouterLink } from 'react-router-dom';

export type PortalMenuFooterLinkProps = {
  to: string;
  label: string;
  onNavigate: () => void;
};

/**
 * The panel's escape hatch to the full page.
 *
 * A real link — not a button that calls `navigate` — so it opens in a new tab
 * on a middle click or a modifier click, which is exactly what someone does
 * when they want the inbox without losing the page they are on.
 */
export function PortalMenuFooterLink({ to, label, onNavigate }: PortalMenuFooterLinkProps) {
  return (
    <Button
      component={RouterLink}
      to={to}
      onClick={onNavigate}
      fullWidth
      endIcon={<ArrowForwardIcon />}
      sx={{ justifyContent: 'center', fontWeight: 600 }}
    >
      {label}
    </Button>
  );
}
