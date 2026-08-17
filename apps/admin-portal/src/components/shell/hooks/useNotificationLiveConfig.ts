import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type {
  NotificationRealtimeRow,
  UseNotificationLiveOptions,
} from '@sinnapi/ui/notifications';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthProvider';
import { useAdmin } from '@/admin/AdminProvider';
import { resolveDomain } from '@/pages/notifications/schema';

/**
 * Admin's half of the shared live subscription.
 *
 * The console had no notification liveness of any kind before this: no
 * subscription, no desktop alert, no sound. Its bell moved only when a query
 * happened to refetch, so an escrow exception or a cancelled booking could sit
 * unseen for as long as an operator stayed on one screen — which, on a console,
 * is most of a shift.
 *
 * Routing differs from the other two portals for the reason the bell already
 * documents: admin has section-level routes gated by permission rather than
 * per-record paths, so an operator who cannot open the section is sent to the
 * feed instead of to a page that would bounce them.
 */
export function useNotificationLiveConfig(): UseNotificationLiveOptions {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { has } = useAdmin();

  const onCountsChanged = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['unread'] });
  }, [qc]);

  const onFeedChanged = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['notifications'] });
  }, [qc]);

  const onOpen = useCallback(
    (row: NotificationRealtimeRow) => {
      const { route, perm } = resolveDomain(row.trigger_key);
      const allowed = route && (!perm || has(perm));
      navigate(allowed ? route : '/notifications');
    },
    [has, navigate],
  );

  return {
    client: supabase,
    recipientId: user?.id,
    storagePrefix: 'sinnapi.admin',
    onCountsChanged,
    onFeedChanged,
    onOpen,
  };
}
