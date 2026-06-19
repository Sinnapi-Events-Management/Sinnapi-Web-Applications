import { Box, Typography } from '@sinnapi/ui';
import LockIcon from '@mui/icons-material/Lock';
import { useAdmin } from './AdminProvider';

// Per-route permission guard. `perm` undefined = any admin may view.
export default function RequirePerm({
  perm,
  children,
}: {
  perm?: string;
  children: React.ReactNode;
}) {
  const { has } = useAdmin();
  if (perm && !has(perm)) {
    return (
      <Box sx={{ textAlign: 'center', py: 10, color: 'text.secondary' }}>
        <LockIcon sx={{ fontSize: 44, color: 'grey.400' }} />
        <Typography variant="h5" sx={{ mt: 2, color: 'text.primary' }}>
          Not authorized
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          You don't have permission to view this section.
        </Typography>
      </Box>
    );
  }
  return <>{children}</>;
}
