import { Alert, Box, Button, Divider, FormField, Stack } from '@sinnapi/ui';
import PersonIcon from '@mui/icons-material/PersonOutline';
import SectionCard from '@/components/ui/SectionCard';
import { useProfileForm } from '../../hooks/useProfileForm';
import type { ProfileFormValues } from '../../schema';
import ControlledField from '../molecules/ControlledField';

type Props = {
  /** Last saved values; must be referentially stable per profile revision. */
  values: ProfileFormValues;
  /** The account identity — shown, never written. */
  email: string | null;
  busy: boolean;
  err: string | null;
  onSave: (values: ProfileFormValues) => Promise<boolean>;
};

/**
 * The editable personal details. The action bar sits at the bottom of the card
 * and only lights up once something has actually changed, so an untouched form
 * can't fire a pointless write.
 */
export default function ProfileDetailsForm({ values, email, busy, err, onSave }: Props) {
  const { control, isDirty, revert, submit } = useProfileForm(values, onSave);

  return (
    <SectionCard
      title="Personal details"
      subtitle="How you appear across the admin portal"
      icon={<PersonIcon />}
    >
      <Box component="form" onSubmit={submit} noValidate>
        {err && (
          <Alert severity="error" sx={{ mb: 2.5 }}>
            {err}
          </Alert>
        )}

        <Stack spacing={2.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <ControlledField
              name="first_name"
              control={control}
              label="First name"
              required
              disabled={busy}
            />
            <ControlledField
              name="middle_name"
              control={control}
              label="Middle name"
              disabled={busy}
            />
          </Stack>

          <ControlledField
            name="last_name"
            control={control}
            label="Last name"
            required
            disabled={busy}
          />

          {/* Rendered outside react-hook-form on purpose: an unregistered field
              can't be submitted by accident, which is a stronger guarantee than
              a disabled input that is still part of the form's values. */}
          <FormField
            label="Email"
            type="email"
            value={email ?? ''}
            fullWidth
            disabled
            helperText="Email is your account identity and can't be changed here. Contact a super admin if it needs updating."
          />

          <ControlledField
            name="phone"
            control={control}
            label="Phone"
            placeholder="+256 700 000000"
            disabled={busy}
            helperText="Used when the team needs to reach you about an escalation."
          />
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Stack
          direction={{ xs: 'column-reverse', sm: 'row' }}
          spacing={1.5}
          justifyContent="flex-end"
        >
          <Button
            onClick={revert}
            disabled={busy || !isDirty}
            fullWidth={false}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Discard changes
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={busy || !isDirty}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {busy ? 'Saving…' : 'Save changes'}
          </Button>
        </Stack>
      </Box>
    </SectionCard>
  );
}
