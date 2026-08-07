import { Alert, Button } from '@sinnapi/ui';
import { Link as RouterLink } from 'react-router-dom';

export interface ShellBannerContent {
  severity: 'info' | 'warning';
  message: string;
  actionLabel: string;
  actionTo: string;
}

/** Full-width notice above the page content, with a single route action. */
export default function ShellBanner({
  severity,
  message,
  actionLabel,
  actionTo,
}: ShellBannerContent) {
  return (
    <Alert
      severity={severity}
      action={
        <Button color="inherit" size="small" component={RouterLink} to={actionTo}>
          {actionLabel}
        </Button>
      }
    >
      {message}
    </Alert>
  );
}
