import { Box } from '@sinnapi/ui';
import { StickySaveBar } from '@sinnapi/ui/forms';
import {
  ProfileSummaryHeader,
  ProfileWorkspace,
  type ProfileSectionItem,
} from '@sinnapi/ui/profile';
import type { ProfileModel } from '@/lib/types';
import { usePersonalWorkspace } from '../../hooks/usePersonalWorkspace';
import { PERSONAL_SECTIONS, type PersonalSectionKey } from '../../schema';
import { PERSONAL_SECTION_META } from '../../schema/sectionMeta';
import PersonalSectionPanel from './PersonalSectionPanel';

type Props = {
  profile: ProfileModel;
  onDone: (message: string) => void;
};

/** The Personal tab: who you are, section menu, one panel, save bar. */
export default function PersonalWorkspace({ profile, onDone }: Props) {
  const ws = usePersonalWorkspace(profile, onDone);
  const displayName = profile.full_name?.trim() || profile.email || 'Your account';

  const items: ProfileSectionItem<PersonalSectionKey>[] = PERSONAL_SECTIONS.map((key) => ({
    value: key,
    label: PERSONAL_SECTION_META[key].label,
    icon: PERSONAL_SECTION_META[key].icon,
    state: ws.stateOf(key),
  }));

  return (
    <>
      <ProfileSummaryHeader
        src={profile.avatar_url}
        name={displayName}
        subtitle={profile.email}
        onPictureClick={() => ws.setSection('photo')}
        pictureLabel="Change profile photo"
      />

      <Box
        component="form"
        noValidate
        onSubmit={(event: React.FormEvent) => {
          event.preventDefault();
          ws.saveBar.onSave();
        }}
      >
        <ProfileWorkspace
          items={items}
          value={ws.section}
          onChange={ws.setSection}
          ariaLabel="Personal profile sections"
          idPrefix="personal"
          footer={<StickySaveBar {...ws.saveBar} />}
        >
          <PersonalSectionPanel
            section={ws.section}
            profile={profile}
            displayName={displayName}
            control={ws.control}
            disabled={ws.busy}
            onDone={onDone}
          />
        </ProfileWorkspace>
      </Box>
    </>
  );
}
