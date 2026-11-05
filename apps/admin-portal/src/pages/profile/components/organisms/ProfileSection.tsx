import { Grid, Stack } from '@sinnapi/ui';
import { WhatsAppUpdatesSwitch } from '@sinnapi/ui/phone';
import type { ProfileModel } from '@/lib/types';
import { useProfileDetails } from '../../hooks/useProfileDetails';
import { useWhatsAppPreference } from '../../hooks/useWhatsAppPreference';
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
  const whatsapp = useWhatsAppPreference(profile.id, onDone);

  return (
    <Grid container spacing={3} alignItems="flex-start">
      <Grid item xs={12} md={4}>
        <Stack spacing={3}>
          <ProfileIdentityCard
            userId={profile.id}
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
        <ProfileDetailsForm
          values={values}
          email={email}
          busy={busy}
          err={err}
          onSave={save}
          whatsapp={
            <WhatsAppUpdatesSwitch
              phoneE164={profile.phone_e164}
              optedOut={Boolean(profile.whatsapp_opt_out_at)}
              busy={whatsapp.busy}
              error={whatsapp.error}
              onChange={whatsapp.setEnabled}
            />
          }
        />
      </Grid>
    </Grid>
  );
}
