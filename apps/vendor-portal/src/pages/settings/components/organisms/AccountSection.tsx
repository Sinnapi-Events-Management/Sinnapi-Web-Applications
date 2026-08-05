import { Card, CardContent, Typography, Divider, Box } from '@sinnapi/ui';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import QueryState from '@/components/ui/QueryState';
import { useSettings } from '../../hooks/useSettings';
import AccountForm from '../molecules/AccountForm';

/** The account card: the profile read, with the edit form once it resolves. */
export default function AccountSection() {
  const { profile, isLoading, error } = useSettings();

  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <AccountCircleIcon color="primary" />
          <Typography variant="h6">Account</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <QueryState isLoading={isLoading} error={error}>
          {profile && <AccountForm profile={profile} />}
        </QueryState>
      </CardContent>
    </Card>
  );
}
