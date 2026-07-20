import { useNavigate, useParams } from 'react-router-dom';
import { useClient, useClientKpis } from '@/hooks/queries';
import { useClientStatus } from '@/pages/clients/hooks/useClientStatus';
import { useClientDelete } from '@/pages/clients/hooks/useClientDelete';
import { useClientPasswordReset } from '@/pages/clients/hooks/useClientPasswordReset';

/**
 * Detail view for a single client: profile + KPI counts, with the lifecycle
 * flows (block/activate, remove, password reset) reused from the Clients list so
 * behaviour stays identical in both places. Related collections (bookings,
 * events, quotations, vendors, chat) are loaded lazily by each tab.
 */
export function useClientDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const { data: client, isLoading, error } = useClient(id);
  const { data: kpis } = useClientKpis(id);

  const status = useClientStatus();
  const remove = useClientDelete();
  const passwordReset = useClientPasswordReset();

  return { id, client, kpis, isLoading, error, status, remove, passwordReset, navigate };
}
