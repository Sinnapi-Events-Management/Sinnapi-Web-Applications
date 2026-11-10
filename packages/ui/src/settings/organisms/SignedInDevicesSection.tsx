'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import DevicesIcon from '@mui/icons-material/DevicesOutlined';
import PhoneIcon from '@mui/icons-material/PhoneAndroidOutlined';
import ComputerIcon from '@mui/icons-material/ComputerOutlined';
import TabletIcon from '@mui/icons-material/TabletAndroidOutlined';
import { SectionCard } from '../../organisms/SectionCard';
import { SettingsRow } from '../molecules/SettingsRow';
import { SettingsRowGroup } from '../molecules/SettingsRowGroup';
import { errorMessage } from '../hooks/useAsyncAction';
import type {
  ListSessionsHandler,
  RevokeOtherSessionsHandler,
  RevokeSessionHandler,
  SignedInSession,
} from '../types';

export type SignedInDevicesSectionProps = {
  onList: ListSessionsHandler;
  onRevoke: RevokeSessionHandler;
  onRevokeOthers: RevokeOtherSessionsHandler;
  /** The portal's date-time formatter, so this reads like the rest of the app. */
  formatDateTime: (iso: string) => string;
};

const PORTAL_LABEL: Record<NonNullable<SignedInSession['portal']>, string> = {
  client: 'Sinnapi app',
  vendor: 'Vendor portal',
  admin: 'Admin console',
};

function deviceTitle(s: SignedInSession): string {
  const parts = [s.browser, s.os].filter(Boolean);
  return parts.length ? parts.join(' on ') : 'Unknown device';
}

function DeviceIcon({ device }: { device: string | null }) {
  const d = (device ?? '').toLowerCase();
  if (d.includes('mobile') || d.includes('phone')) return <PhoneIcon fontSize="small" />;
  if (d.includes('tablet')) return <TabletIcon fontSize="small" />;
  return <ComputerIcon fontSize="small" />;
}

/**
 * "Where you're signed in" — every device holding this account, with a way to
 * sign each one out. Modelled on the list Facebook and WhatsApp keep, because
 * that is the one people here already know how to read.
 *
 * It is the other half of long sessions: staying signed in for weeks is only
 * safe if a lost phone can be signed out from the laptop (or the other way
 * round) in two taps, without calling support.
 */
export function SignedInDevicesSection({
  onList,
  onRevoke,
  onRevokeOthers,
  formatDateTime,
}: SignedInDevicesSectionProps) {
  const [sessions, setSessions] = useState<SignedInSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setSessions(await onList());
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }, [onList]);

  useEffect(() => {
    void load();
  }, [load]);

  const revoke = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await onRevoke(id);
      setSessions((prev) => prev?.filter((s) => s.id !== id) ?? prev);
      setToast('That device has been signed out.');
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusyId(null);
    }
  };

  const revokeOthers = async () => {
    setBusyId('others');
    setError(null);
    try {
      const count = await onRevokeOthers();
      setSessions((prev) => prev?.filter((s) => s.isCurrent) ?? prev);
      setToast(
        count === 1 ? 'Signed out of 1 other device.' : `Signed out of ${count} other devices.`,
      );
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusyId(null);
    }
  };

  const others = sessions?.filter((s) => !s.isCurrent) ?? [];

  return (
    <>
      <SectionCard title="Where you're signed in" icon={<DevicesIcon />} accent="secondary">
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            You stay signed in on each device until you sign out, or until it goes 60 days without
            being used. If you see a device you don&apos;t recognise, sign it out and change your
            password.
          </Typography>

          {error && <Alert severity="error">{error}</Alert>}

          {sessions === null && !error && (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          )}

          {sessions && (
            <SettingsRowGroup>
              {sessions.map((s) => (
                <SettingsRow
                  key={s.id}
                  title={deviceTitle(s)}
                  description={
                    <Stack component="span" spacing={0.5}>
                      <Stack component="span" direction="row" spacing={1} alignItems="center">
                        <DeviceIcon device={s.device} />
                        <span>
                          {[s.portal ? PORTAL_LABEL[s.portal] : null, s.country]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </Stack>
                      <span>
                        {s.isCurrent ? 'Active now' : `Last used ${formatDateTime(s.lastActiveAt)}`}
                        {' · '}Signed in {formatDateTime(s.signedInAt)}
                        {!s.remember && ' · Not kept signed in'}
                      </span>
                    </Stack>
                  }
                  action={
                    s.isCurrent ? (
                      <Chip label="This device" color="success" size="small" variant="outlined" />
                    ) : (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        disabled={busyId !== null}
                        onClick={() => void revoke(s.id)}
                      >
                        {busyId === s.id ? 'Signing out…' : 'Sign out'}
                      </Button>
                    )
                  }
                />
              ))}
            </SettingsRowGroup>
          )}

          {others.length > 0 && (
            <Box>
              <Button
                variant="text"
                color="error"
                disabled={busyId !== null}
                onClick={() => void revokeOthers()}
              >
                {busyId === 'others' ? 'Signing out…' : 'Sign out of all other devices'}
              </Button>
            </Box>
          )}
        </Stack>
      </SectionCard>

      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </>
  );
}
