import { Link as RouterLink } from 'react-router-dom';
import { Typography, Button, Paper } from '@sinnapi/ui';
import InboxIcon from '@mui/icons-material/Inbox';

export default function EmptyState({
  title = 'Nothing here yet',
  description,
  ctaLabel,
  ctaHref,
}: {
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <Paper variant="outlined" sx={{ textAlign: 'center', py: 8, px: 2, color: 'text.secondary' }}>
      <InboxIcon sx={{ fontSize: 44, color: 'grey.400' }} />
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
