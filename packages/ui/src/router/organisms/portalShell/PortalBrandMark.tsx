'use client';
import { Box, Chip, IconButton, Tooltip } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Link as RouterLink } from 'react-router-dom';
import type { PortalBrand } from './types';

export interface PortalBrandMarkProps {
  brand: PortalBrand;
  /** Wordmark for the active colour scheme, resolved by the shell. */
  logoSrc: string;
  homeTo: string;
  /** Render the rail treatment: square mark stacked over an expand button. */
  mini: boolean;
  /** Omitted on mobile, where the drawer is always expanded. */
  onToggleCollapsed?: () => void;
}

/** The sidebar header — Sinnapi logo, portal pill, and the collapse control. */
export function PortalBrandMark({
  brand,
  logoSrc,
  homeTo,
  mini,
  onToggleCollapsed,
}: PortalBrandMarkProps) {
  if (mini) {
    return (
      <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        <Box component={RouterLink} to={homeTo} sx={{ display: 'flex' }} aria-label={brand.name}>
          <Box
            component="img"
            src={brand.iconSrc}
            alt={brand.name}
            sx={{ width: 32, height: 32 }}
          />
        </Box>
        {onToggleCollapsed && (
          <Tooltip title="Expand menu" placement="right" arrow>
            <IconButton size="small" onClick={onToggleCollapsed} aria-label="Expand navigation">
              <ChevronRightIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  }

  return (
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
        to={homeTo}
        sx={{ display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none', minWidth: 0 }}
      >
        <Box
          component="img"
          src={logoSrc}
          alt={brand.name}
          sx={{ height: 40, width: 'auto', maxWidth: 132, objectFit: 'contain' }}
        />
        {brand.tagline && <Chip size="small" label={brand.tagline} color="secondary" />}
      </Box>
      {onToggleCollapsed && (
        <Tooltip title="Collapse menu">
          <IconButton
            size="small"
            onClick={onToggleCollapsed}
            aria-label="Collapse navigation"
            sx={{ display: { xs: 'none', md: 'inline-flex' }, flexShrink: 0 }}
          >
            <ChevronLeftIcon />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
