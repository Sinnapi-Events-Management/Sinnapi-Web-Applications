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
 * The trail is trimmed by width rather than wrapped: a phone shares the bar
 * with five controls and has room for the page title alone, a tablet for the
 * parent as well, and only a desktop gets the full trail. Whatever survives the
 * trim still has to fit, so the list is built to shrink — ancestors give up
 * their width first and the page title ellipsises last.
 */
export function PortalBreadcrumbs({ crumbs }: PortalBreadcrumbsProps) {
  const phone = useMediaQuery((t: Theme) => t.breakpoints.down('sm'));
  const tablet = useMediaQuery((t: Theme) => t.breakpoints.down('md'));
  const visible = crumbs.slice(phone ? -1 : tablet ? -2 : 0);

  return (
    <Breadcrumbs
      aria-label="breadcrumb"
      separator={<NavigateNextIcon fontSize="small" />}
      sx={{
        minWidth: 0,
        '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' },
        // Each crumb sits in an `li`, whose default `min-width: auto` refuses to
        // shrink below its text — the `noWrap` on the crumb itself never gets to
        // ellipsise and the trail overflows the bar instead. Zeroing it hands the
        // decision back to flexbox, and the weights spend the shortfall on
        // ancestors before the page title.
        '& .MuiBreadcrumbs-li': { minWidth: 0, flexShrink: 4 },
        '& .MuiBreadcrumbs-li:last-of-type': { flexShrink: 1 },
        // `noWrap` only ellipsises a block box, and a crumb rendered as a link
        // is inline — it would clip mid-glyph with no ellipsis.
        '& .MuiBreadcrumbs-li > *': { display: 'block', minWidth: 0 },
        '& .MuiBreadcrumbs-separator': { mx: 0.5, flexShrink: 0 },
      }}
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
