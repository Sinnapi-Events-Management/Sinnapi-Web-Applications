'use client';
import { Button, Paper, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { LinkProps } from 'react-router-dom';
import InboxIcon from '@mui/icons-material/Inbox';

export type EmptyStateProps = {
  title?: string;
  description?: string;
  /** Both `ctaLabel` and `ctaHref` must be set for the action to render. */
  ctaLabel?: string;
  ctaHref?: LinkProps['to'];
  /**
   * Drop the outlined surface, for when this sits inside one already — most
   * often as a <DataTable /> `emptyMessage`, where the table's own Paper would
   * otherwise be double-bordered. The copy and CTA are unchanged.
   */
  embedded?: boolean;
};

/**
 * Placeholder for an empty collection, with an optional route action. The CTA
 * inherits the theme's default gold `contained` treatment.
 *
 * Lives outside the root barrel because it depends on react-router-dom — import
 * from `@sinnapi/ui/router`. (The Next.js marketing site has its own variant.)
 */
export function EmptyState({
  title = 'Nothing here yet',
  description,
  ctaLabel,
  ctaHref,
  embedded = false,
}: EmptyStateProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        textAlign: 'center',
        py: embedded ? 4 : 8,
        px: 2,
        color: 'text.secondary',
        // Embedded: keep the copy and CTA, shed the surface so the host's
        // border (a DataTable's Paper) isn't doubled up.
        ...(embedded && { border: 'none', bgcolor: 'transparent' }),
      }}
    >
      {/* `text.disabled` rather than a fixed grey, so the glyph stays legible
          against the warm dark canvas instead of vanishing into it. */}
      <InboxIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
      <Typography variant="h5" sx={{ mt: 2, color: 'text.primary' }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" sx={{ mt: 1, maxWidth: 420, mx: 'auto' }}>
          {description}
        </Typography>
      )}
      {ctaLabel && ctaHref && (
        <Button component={RouterLink} to={ctaHref} variant="contained" sx={{ mt: 3 }}>
          {ctaLabel}
        </Button>
      )}
    </Paper>
  );
}
