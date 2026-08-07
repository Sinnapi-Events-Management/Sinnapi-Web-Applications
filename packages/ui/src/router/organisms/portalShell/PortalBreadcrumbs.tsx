'use client';
import { Breadcrumbs, Link, Typography, useMediaQuery } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link as RouterLink } from 'react-router-dom';
import type { PortalCrumb } from './types';

export interface PortalBreadcrumbsProps {
  crumbs: PortalCrumb[];
}

/**
 * The route trail in the top bar. The final crumb is the page title and never
 * links; ancestors do when they correspond to a real route.
 *
 * On phones the trail is trimmed to the last two crumbs rather than wrapped or
 * ellipsised — the parent and the current page are what's worth the width.
 */
export function PortalBreadcrumbs({ crumbs }: PortalBreadcrumbsProps) {
  const compact = useMediaQuery((t: Theme) => t.breakpoints.down('sm'));
  const visible = compact ? crumbs.slice(-2) : crumbs;

  return (
    <Breadcrumbs
      aria-label="breadcrumb"
      separator={<NavigateNextIcon fontSize="small" />}
      sx={{ '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' }, minWidth: 0 }}
    >
      {/* Keyed by position: a section and a nav item can legitimately share a
          label ("Inbox"), which would collide on a label-derived key. */}
      {visible.map((crumb, index) => {
        const isLast = index === visible.length - 1;
        if (isLast) {
          return (
            <Typography
              key={index}
              variant="subtitle1"
              color="text.primary"
              fontWeight={700}
              noWrap
            >
              {crumb.label}
            </Typography>
          );
        }
        return crumb.to ? (
          <Link
            key={index}
            component={RouterLink}
            to={crumb.to}
            variant="body2"
            color="text.secondary"
            underline="hover"
            noWrap
          >
            {crumb.label}
          </Link>
        ) : (
          <Typography key={index} variant="body2" color="text.secondary" noWrap>
            {crumb.label}
          </Typography>
        );
      })}
    </Breadcrumbs>
  );
}
