'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { PhoneField } from './PhoneField';
import { phoneProblem } from './phone';

// ---------------------------------------------------------------------------
// When to ask
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'sinnapi.phonePrompt.dismissed';

export type PhonePromptState = {
  /** The signed-in profile id; null while signed out or loading. */
  userId: string | null | undefined;
  /**
   * Identifies THIS sign-in — pass Supabase's `user.last_sign_in_at`. It only
   * changes on a new sign-in (a token refresh keeps it), which is exactly the
   * product rule: "Later" lasts until the next login, then we ask again.
   */
  sessionKey: string | null | undefined;
  /** False until the profile has loaded, so the dialog never flashes. */
  loaded: boolean;
  /** `profiles.phone_e164`: when set there is nothing to ask. */
  phoneE164: string | null | undefined;
  /** Something else is on screen that must not be covered (an onboarding wizard). */
  suppressed?: boolean;
};

function readDismissed(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // storage blocked: ask every time, which is the safe default
  }
}

/**
 * Whether to show the "add your WhatsApp number" prompt, and how to dismiss it.
 *
 * Shown to anyone signed in whose saved number is missing or has no country
 * code. "Later" is remembered per sign-in, in this browser only — a new login
 * asks again, until the number is fixed.
 */
export function usePhoneNumberPrompt({
  userId,
  sessionKey,
  loaded,
  phoneE164,
  suppressed,
}: PhonePromptState) {
  const marker = userId && sessionKey ? `${userId}:${sessionKey}` : null;
  const [dismissed, setDismissed] = useState<string | null>(() => readDismissed());

  // Another tab dismissing it should close it here too.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setDismissed(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const open = Boolean(marker) && loaded && !phoneE164 && !suppressed && dismissed !== marker;

  const dismiss = useCallback(() => {
    if (!marker) return;
    setDismissed(marker);
    try {
      localStorage.setItem(STORAGE_KEY, marker);
    } catch {
      // ignore: it simply asks again next time
    }
  }, [marker]);

  return { open, dismiss };
}

// ---------------------------------------------------------------------------
// The dialog
// ---------------------------------------------------------------------------

export type PhoneNumberPromptProps = {
  open: boolean;
  /** What the profile holds now — a legacy local number, or empty. */
  currentPhone: string | null | undefined;
  /**
   * Save the number (E.164). Resolve with an error message to show, or null on
   * success; the prompt closes by itself once the profile reloads with a valid
   * number.
   */
  onSave: (phone: string) => Promise<string | null>;
  onLater: () => void;
};

/**
 * Asks a signed-in person to add (or fix) their phone number so WhatsApp
 * updates can reach them. Dismissible by design (product decision): "Later"
 * closes it until the next sign-in.
 */
export function PhoneNumberPrompt({ open, currentPhone, onSave, onLater }: PhoneNumberPromptProps) {
  const [phone, setPhone] = useState(currentPhone ?? '');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // A fresh start each time it opens, from whatever the profile holds then.
  useEffect(() => {
    if (!open) return;
    setPhone(currentPhone ?? '');
    setTouched(false);
    setSaveError(null);
  }, [open, currentPhone]);

  const problem = phoneProblem(phone, true);
  const legacy = Boolean(currentPhone?.trim()) && !currentPhone?.trim().startsWith('+');

  const save = async () => {
    setTouched(true);
    if (problem) return;
    setBusy(true);
    setSaveError(null);
    const err = await onSave(phone);
    setBusy(false);
    if (err) setSaveError(err);
  };

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onLater}
      maxWidth="xs"
      fullWidth
      aria-labelledby="phone-prompt-title"
    >
      <DialogTitle id="phone-prompt-title">Get updates on WhatsApp</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            {legacy
              ? `We have ${currentPhone?.trim()} on file, but without a country code, so WhatsApp updates can't reach it. Choose your country and check the number.`
              : 'Sinnapi sends booking, quote and payment updates on WhatsApp. Add your number with its country code so they reach you.'}
          </Typography>
          <PhoneField
            value={phone}
            onChange={setPhone}
            onBlur={() => setTouched(true)}
            required
            autoFocus
            disabled={busy}
            error={touched ? problem : null}
          />
          <Typography variant="caption" color="text.secondary">
            You can turn WhatsApp updates off at any time from your profile, or by replying STOP.
          </Typography>
          {saveError && <Alert severity="error">{saveError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onLater} disabled={busy} color="inherit">
          Later
        </Button>
        <Button onClick={save} disabled={busy} variant="contained">
          {busy ? 'Saving…' : 'Save number'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
