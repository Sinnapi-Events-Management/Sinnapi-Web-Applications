import { Alert, Box, Button, Divider, Stack } from '@sinnapi/ui';
import LockIcon from '@mui/icons-material/LockOutlined';
import SectionCard from '@/components/ui/SectionCard';
import { usePasswordForm } from '../../hooks/usePasswordForm';
import type { PasswordFormValues } from '../../schema';
import PasswordField from '../molecules/PasswordField';
import PasswordStrength from '../molecules/PasswordStrength';

type Props = {
  busy: boolean;
  err: string | null;
  onSubmit: (values: PasswordFormValues) => Promise<boolean>;
};

/**
 * Current → new → confirm, in that order, with the rules visible while the new
 * password is being typed.
 *
 * The current-password field is not a formality: it is re-checked against the
 * account before anything is written (see `usePasswordChange`), so an unattended
 * session isn't enough to take the account over.
 */
export default function PasswordChangeForm({ busy, err, onSubmit }: Props) {
  const { control, visible, toggleVisible, password, score, canSubmit, submit } =
    usePasswordForm(onSubmit);

  return (
    <SectionCard
      title="Change password"
      subtitle="You'll stay signed in on this device"
      icon={<LockIcon />}
      accent="secondary"
    >
      <Box component="form" onSubmit={submit} noValidate>
        {err && (
          <Alert severity="error" sx={{ mb: 2.5 }}>
            {err}
          </Alert>
        )}

        <Stack spacing={2.5}>
          <PasswordField
            name="current_password"
            control={control}
            label="Current password"
            autoComplete="current-password"
            visible={visible}
            onToggleVisible={toggleVisible}
            disabled={busy}
          />

          <Divider />

          <Box>
            <PasswordField
              name="password"
              control={control}
              label="New password"
              autoComplete="new-password"
              visible={visible}
              onToggleVisible={toggleVisible}
              disabled={busy}
            />
            <Box sx={{ mt: 1.5 }}>
              <PasswordStrength value={password} score={score} />
            </Box>
          </Box>

          <PasswordField
            name="confirm_password"
            control={control}
            label="Confirm new password"
            autoComplete="new-password"
            visible={visible}
            onToggleVisible={toggleVisible}
            disabled={busy}
          />
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Stack direction="row" justifyContent="flex-end">
          <Button
            type="submit"
            variant="contained"
            disabled={busy || !canSubmit}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {busy ? 'Updating…' : 'Update password'}
          </Button>
        </Stack>
      </Box>
    </SectionCard>
  );
}
