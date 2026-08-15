'use client';
import { Paper, Typography } from '@mui/material';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import SearchOffIcon from '@mui/icons-material/SearchOff';

export type NotificationEmptyProps = {
  title: string;
  description: string;
  /** A filter emptied the list, rather than the feed being empty. */
  filtered?: boolean;
};

/**
 * Empty placeholder for the feed column.
 *
 * A local component rather than the shared `<EmptyState />`, which lives in
 * `@sinnapi/ui/router` and drags react-router into the module graph — this kit
 * is router-free so the host portal owns every navigation decision. The glyph
 * also differs by cause: an emptied filter and a genuinely quiet inbox are
 * different news, and the same icon for both misreads one of them.
 */
export function NotificationEmpty({ title, description, filtered }: NotificationEmptyProps) {
  const Icon = filtered ? SearchOffIcon : MarkEmailReadIcon;

  return (
    <Paper
      variant="outlined"
      sx={{ textAlign: 'center', py: 6, px: 2, borderRadius: 3, color: 'text.secondary' }}
    >
      <Icon sx={{ fontSize: 44, color: 'text.disabled' }} />
      <Typography variant="h6" sx={{ mt: 1.5, color: 'text.primary' }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.75, maxWidth: 360, mx: 'auto' }}>
        {description}
      </Typography>
    </Paper>
  );
}
