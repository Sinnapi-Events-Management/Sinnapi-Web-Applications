import { Grid, Stack } from '@sinnapi/ui';
import { profileSideColumnSx } from '@sinnapi/ui/profile';
import { WhatsAppUpdatesSwitch } from '@sinnapi/ui/phone';
import type { ProfileModel } from '@/lib/types';
import { useProfileDetails } from '../../hooks/useProfileDetails';
import { useWhatsAppPreference } from '../../hooks/useWhatsAppPreference';
import type { ProfileFormValues } from '../../schema';
import ProfileIdentityCard from './ProfileIdentityCard';
import AccountFactsSection from './AccountFactsSection';
import ProfileDetailsForm from './ProfileDetailsForm';

type Props = {
  profile: ProfileModel;
  displayName: string;
  values: ProfileFormValues;
  onDone: (message: string) => void;
};

/**
 * The Profile section's layout: identity and account facts in a side column, the
 * editable form in the main one.
 *
 * On narrow screens the two columns stack, which puts the photo first — the right
 * order, since the picture is the thing most people come here to change.
 *
 * On desktop the side column sticks while the form scrolls (see
 * `profileSideColumnSx`), so the photo the user just changed stays in view rather
 * than sliding off the top as they work down the fields.
 */
export default function ProfileSection({ profile, displayName, values, onDone }: Props) {
  const { busy, error, save } = useProfileDetails(profile.id, onDone);
  const whatsapp = useWhatsAppPreference(profile.id, onDone);

  return (
    <Grid container spacing={3} alignItems="flex-start">
      <Grid item xs={12} md={4}>
        <Stack spacing={3} sx={profileSideColumnSx}>
          <ProfileIdentityCard
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
        <ProfileDetailsForm
          values={values}
          email={profile.email}
          busy={busy}
          error={error}
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
