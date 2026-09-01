import { Alert, Grid, QueryState, Stack } from '@sinnapi/ui';
import { profileSideColumnSx } from '@sinnapi/ui/profile';
import { useProfile as useAccountQuery } from '@/hooks/queries';
import PersonalIdentityCard from './PersonalIdentityCard';
import AccountDetailsForm from './AccountDetailsForm';
import AccountFactsSection from './AccountFactsSection';

type Props = {
  onDone: (message: string) => void;
};

/**
 * The Personal tab: photo and account facts in a side column, the editable details
 * in the main one.
 *
 * Reads the profile itself rather than taking it from the page, because the page
 * shows one tab at a time — hoisting the read would fetch a vendor's personal
 * details every time they opened their business listing.
 */
export default function PersonalSection({ onDone }: Props) {
  const { data: profile, isLoading, error } = useAccountQuery();

  const displayName = profile?.full_name?.trim() || profile?.email || 'Your account';

  return (
    <QueryState isLoading={isLoading} error={error}>
      {profile ? (
        <Grid container spacing={3} alignItems="flex-start">
          <Grid item xs={12} md={4}>
            <Stack spacing={3} sx={profileSideColumnSx}>
              <PersonalIdentityCard
                profileId={profile.id}
                name={displayName}
                email={profile.email}
                avatarUrl={profile.avatar_url}
                onDone={onDone}
              />
              <AccountFactsSection profile={profile} />
            </Stack>
          </Grid>

          <Grid item xs={12} md={8}>
            <AccountDetailsForm profile={profile} onDone={onDone} />
          </Grid>
        </Grid>
      ) : (
        <Alert severity="warning">
          We couldn&apos;t load your account. Refresh the page, or sign out and back in.
        </Alert>
      )}
    </QueryState>
  );
}
