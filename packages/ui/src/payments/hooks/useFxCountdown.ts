'use client';
import { useEffect, useState } from 'react';
import { secondsUntil } from '../fxFormat';

/**
 * Seconds left on an FX lock, ticking. A null target means no countdown —
 * which is also what stops the interval while the dialog is closed.
 */
export function useFxCountdown(expiresAt: string | null): number {
  const [remaining, setRemaining] = useState(() => secondsUntil(expiresAt));

  useEffect(() => {
    setRemaining(secondsUntil(expiresAt));
    if (!expiresAt) return;
    const id = setInterval(() => setRemaining(secondsUntil(expiresAt)), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return remaining;
}
