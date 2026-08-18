'use client';
import { useState } from 'react';
import { Button, Snackbar, Stack, Typography } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import LockResetIcon from '@mui/icons-material/LockReset';
import { InfoRow } from '../../molecules/InfoRow';
import { SectionCard } from '../../organisms/SectionCard';
import { SettingsRow } from '../molecules/SettingsRow';
import { SettingsRowGroup } from '../molecules/SettingsRowGroup';
import { useDisclosure } from '../hooks/useDisclosure';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import type { ChangePasswordHandler } from '../types';

export type SecuritySectionProps = {
  /** The signed-in address, shown read-only — it is the account's identity. */
  email?: string | null;
  /** The portal's `PASSWORD_MIN_LENGTH`. */
  minLength: number;
  onChangePassword: ChangePasswordHandler;
};

/**
 * The security card: what this account signs in as, and the one credential the
 * user can change themselves.
 *
 * There is no two-factor control here on purpose. `profiles.mfa_enabled` exists
 * in the schema, but nothing in any portal enrols a factor, verifies a
 * challenge or recovers an account that loses one — so the button this replaces
 * could only ever have been decorative. It comes back when the flow behind it
 * does, not before: a security toggle that does nothing is worse than no toggle,
 * because a user who believes they enabled 2FA behaves as though they had.
 */
export function SecuritySection({ email, minLength, onChangePassword }: SecuritySectionProps) {
  const dialog = useDisclosure();
  const [changed, setChanged] = useState(false);

  return (
    <>
      <SectionCard title="Security" icon={<SecurityIcon />} accent="secondary">
        <Stack spacing={2.5}>
          <InfoRow label="Signed in as" value={email ?? undefined} />

          <SettingsRowGroup>
            <SettingsRow
              title="Password"
              description="Change the password you use to sign in. You will need your current one to confirm it is you."
              action={
                <Button variant="outlined" startIcon={<LockResetIcon />} onClick={dialog.show}>
                  Change password
                </Button>
              }
            />
          </SettingsRowGroup>

          <Typography variant="caption" color="text.secondary">
            Your email address is the account identity and cannot be changed here — contact support
            if it needs to move.
          </Typography>
        </Stack>
      </SectionCard>

      <ChangePasswordDialog
        open={dialog.open}
        onClose={dialog.hide}
        onChanged={() => setChanged(true)}
        onSubmit={onChangePassword}
        minLength={minLength}
      />

      <Snackbar
        open={changed}
        autoHideDuration={4000}
        onClose={() => setChanged(false)}
        message="Password updated"
      />
    </>
  );
}
