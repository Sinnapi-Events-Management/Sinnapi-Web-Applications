import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Tracks which rows have had their full IP revealed, and records each reveal.
 *
 * The masked address is the default because an admin scanning this table for an
 * unrelated reason has no need for anyone's full IP — that is the minimisation
 * argument, and a table that shows everything by default cannot make it.
 * Revealing is therefore a deliberate act, and because it is itself processing
 * personal data it is written to the audit log naming the admin who did it.
 *
 * Reveal state is per-row and lives only for the life of the page: navigating
 * away re-masks everything, so a screen left open does not become a permanent
 * unmasked view.
 *
 * The log write is fire-and-forget. Blocking the reveal on it would trade a
 * useful action for a network round trip, and a failed audit write is not a
 * reason to deny an admin data they are permitted to see — it is a reason to
 * shout in the console, which it does.
 */
export function useIpReveal() {
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());

  const reveal = useCallback((rowKey: string, subject: string | null) => {
    setRevealed((prev) => {
      if (prev.has(rowKey)) return prev;
      const next = new Set(prev);
      next.add(rowKey);
      return next;
    });

    void supabase
      .rpc('log_security_access', { p_action: 'reveal_ip_address', p_subject: subject })
      .then(({ error }) => {
        if (error) console.error('Failed to log IP reveal:', error.message);
      });
  }, []);

  const isRevealed = useCallback((rowKey: string) => revealed.has(rowKey), [revealed]);

  return { isRevealed, reveal };
}
