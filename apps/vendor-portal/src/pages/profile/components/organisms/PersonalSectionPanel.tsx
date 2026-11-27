import type { Control } from 'react-hook-form';
import { WhatsAppUpdatesSwitch } from '@sinnapi/ui/phone';
import type { ProfileModel } from '@/lib/types';
import type { AccountFormValues, PersonalSectionKey } from '../../schema';
import { PERSONAL_SECTION_META } from '../../schema/sectionMeta';
import SectionPanel from '../molecules/SectionPanel';
import AccountIdentityFields from '../molecules/AccountIdentityFields';
import AccountFactsSection from './AccountFactsSection';
import PersonalPhotoPanel from './PersonalPhotoPanel';
import { useWhatsAppPreference } from '../../hooks/useWhatsAppPreference';

type Props = {
  section: PersonalSectionKey;
  profile: ProfileModel;
  displayName: string;
  control: Control<AccountFormValues>;
  disabled: boolean;
  onDone: (message: string) => void;
};

/**
 * The open Personal section. Account renders the shared facts card as-is — it
 * already carries its own heading and the link to Settings.
 */
export default function PersonalSectionPanel({
  section,
  profile,
  displayName,
  control,
  disabled,
  onDone,
}: Props) {
  // Called before the early return so the hook order never changes between sections.
  const whatsapp = useWhatsAppPreference(profile.id, onDone);
  if (section === 'account') return <AccountFactsSection profile={profile} />;

  return (
    <SectionPanel meta={PERSONAL_SECTION_META[section]}>
      {section === 'details' ? (
        <AccountIdentityFields
          control={control}
          email={profile.email}
          disabled={disabled}
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
      ) : (
        <PersonalPhotoPanel
          profileId={profile.id}
          name={displayName}
          avatarUrl={profile.avatar_url}
          onDone={onDone}
        />
      )}
    </SectionPanel>
  );
}
