import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PhoneNumberPrompt, usePhoneNumberPrompt } from '@sinnapi/ui/phone';
import { useAuth } from '@/auth/AuthProvider';
import { useProfile } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';

/**
 * Asks a signed-in person to add or fix their phone number, so WhatsApp updates
 * can reach them. Shown when the saved number is missing or has no country
 * code; "Later" lasts until the next sign-in (see `usePhoneNumberPrompt`).
 *
 * Mounted once, in the shell, so it appears whichever page they land on.
 */
export default function PhonePromptHost() {
  const { user } = useAuth();
  const { data: profile, isSuccess } = useProfile();
  const qc = useQueryClient();

  const { open, dismiss } = usePhoneNumberPrompt({
    userId: profile?.id,
    sessionKey: user?.last_sign_in_at,
    loaded: isSuccess && Boolean(profile),
    phoneE164: profile?.phone_e164,
  });

  const save = useCallback(
    async (phone: string) => {
      if (!profile) return 'Your session has expired. Sign in again.';
      const { error } = await supabase.from('profiles').update({ phone }).eq('id', profile.id);
      if (error) return error.message;
      await qc.invalidateQueries({ queryKey: ['profile'] });
      return null;
    },
    [profile, qc],
  );

  return (
    <PhoneNumberPrompt open={open} currentPhone={profile?.phone} onSave={save} onLater={dismiss} />
  );
}
