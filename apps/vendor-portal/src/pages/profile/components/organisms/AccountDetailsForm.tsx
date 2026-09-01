import { Box, Divider, SectionCard } from '@sinnapi/ui';
import { SavedFormActions } from '@sinnapi/ui/forms';
import PersonIcon from '@mui/icons-material/PersonOutline';
import type { ProfileModel } from '@/lib/types';
import { useAccountProfileForm } from '../../hooks/useAccountProfileForm';
import FormErrorAlert from '../atoms/FormErrorAlert';
import AccountIdentityFields from '../molecules/AccountIdentityFields';

type Props = {
  /** The saved account row; the form tracks it so a refetch reaches the fields. */
  profile: ProfileModel;
  onDone: (message: string) => void;
};

/**
 * The vendor's own name and phone.
 *
 * Kept separate from the business form on the other tab on purpose: a sole
 * trader's legal name and their trading name are different facts, and the helper
 * text says which one this is so nobody types their brand here and wonders why the
 * listing didn't change.
 */
export default function AccountDetailsForm({ profile, onDone }: Props) {
  const { control, isDirty, revert, submit, busy, error } = useAccountProfileForm(profile, onDone);

  return (
    <SectionCard
      title="Your details"
      subtitle="The person behind the business"
      icon={<PersonIcon />}
    >
      <Box component="form" onSubmit={submit} noValidate>
        <FormErrorAlert error={error} />

        <AccountIdentityFields control={control} email={profile.email} disabled={busy} />

        <Divider sx={{ my: 3 }} />

        <SavedFormActions busy={busy} isDirty={isDirty} onRevert={revert} />
      </Box>
    </SectionCard>
  );
}
