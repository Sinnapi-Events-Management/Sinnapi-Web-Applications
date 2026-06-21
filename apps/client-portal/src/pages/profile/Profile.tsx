import { Card, CardContent, Typography } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import QueryState from '@/components/ui/QueryState';
import ProfileForm from '@/components/profile/ProfileForm';
import { useProfile } from './hooks/useProfile';

export default function Profile() {
  const { profile, isLoading, error } = useProfile();
  return (
    <>
      <PageTitle title="Profile" subtitle="Manage your personal details." />
      <QueryState isLoading={isLoading} error={error}>
        {profile && (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Signed in as <strong>{profile.email}</strong>
              </Typography>
              <ProfileForm profile={profile} />
            </CardContent>
          </Card>
        )}
      </QueryState>
    </>
  );
}
