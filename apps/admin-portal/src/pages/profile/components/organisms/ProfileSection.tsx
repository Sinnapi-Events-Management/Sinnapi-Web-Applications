import { Grid, Stack } from '@sinnapi/ui';
import type { ProfileModel } from '@/lib/types';
import { useProfileDetails } from '../../hooks/useProfileDetails';
import type { ProfileFormValues } from '../../schema';
import ProfileIdentityCard from './ProfileIdentityCard';
import AccountSummaryCard from './AccountSummaryCard';
import ProfileDetailsForm from './ProfileDetailsForm';

type Props = {
  profile: ProfileModel;
  displayName: string;
  email: string | null;
  roles: string[];
  values: ProfileFormValues;
  onDone: (message: string) => void;
};

/**
 * The Profile section's layout: identity + account facts in a side column,
 * the editable form in the main one.
 *
 * On narrow screens the two columns stack, which puts the avatar first — the
 * right order, since the photo is the thing most people come here to change.
 */
export default function ProfileSection({
  profile,
  displayName,
  email,
  roles,
  values,
  onDone,
}: Props) {
  const { busy, err, save } = useProfileDetails(onDone);

  return (
    <Grid container spacing={3} alignItems="flex-start">
      <Grid item xs={12} md={4}>
        <Stack spacing={3}>
          <ProfileIdentityCard
            name={displayName}
            email={email}
            avatarUrl={profile.avatar_url}
            roles={roles}
            status={profile.status}
            onDone={onDone}
          />
          <AccountSummaryCard profile={profile} />
        </Stack>
      </Grid>

      <Grid item xs={12} md={8}>
        <ProfileDetailsForm values={values} email={email} busy={busy} err={err} onSave={save} />
      </Grid>
    </Grid>
  );
}
