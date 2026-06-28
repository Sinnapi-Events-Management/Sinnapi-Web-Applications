import { Container, Typography, Box } from '@sinnapi/ui';
import { Build as BuildIcon } from '@sinnapi/ui/icons';

// Maintenance page: shown when the platform is undergoing scheduled maintenance.
export default function MaintenanceContainer() {
  return (
    <Container sx={{ py: 14, textAlign: 'center', maxWidth: 560 }}>
      <Box sx={{ color: 'primary.main' }}>
        <BuildIcon sx={{ fontSize: 56 }} />
      </Box>
      <Typography variant="h3" sx={{ mt: 2 }}>
        We’ll be right back
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        Sinnapi is undergoing scheduled maintenance. Please check back shortly.
      </Typography>
    </Container>
  );
}
