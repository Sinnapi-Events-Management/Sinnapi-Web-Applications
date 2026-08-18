'use client';
import { useCallback, useMemo, useState } from 'react';
import type { ToastMessage, ToastSeverity } from './types';

export type ToastApi = {
  /** The outcome currently being announced, handed straight to `<Toast />`. */
  toast: ToastMessage | null;
  show: (message: string, severity?: ToastSeverity) => void;
  success: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
  error: (message: string) => void;
  dismiss: () => void;
};

/**
 * The state half of a toast, so a flow hook never keeps its own string.
 *
 * The four writers are stable across renders on purpose: the flows that raise
 * toasts are themselves memoised (`sendNow`, `cancel`, `sendTest`), and a
 * setter that changed identity on every render would quietly bust every
 * `useCallback` that depends on it. Destructure the writers into a dependency
 * array; read `toast` where you render.
 */
export function useToast(): ToastApi {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const show = useCallback((message: string, severity: ToastSeverity = 'success') => {
    setToast({ message, severity });
  }, []);

  const success = useCallback((message: string) => show(message, 'success'), [show]);
  const info = useCallback((message: string) => show(message, 'info'), [show]);
  const warning = useCallback((message: string) => show(message, 'warning'), [show]);
  const error = useCallback((message: string) => show(message, 'error'), [show]);
  const dismiss = useCallback(() => setToast(null), []);

  return useMemo(
    () => ({ toast, show, success, info, warning, error, dismiss }),
    [toast, show, success, info, warning, error, dismiss],
  );
}
