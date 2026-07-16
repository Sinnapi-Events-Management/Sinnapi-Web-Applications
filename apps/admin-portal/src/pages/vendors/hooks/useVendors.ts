import { useNavigate } from 'react-router-dom';
import { useVendorsAdmin } from '@/hooks/queries';
import { useTableState } from '@/hooks/useTableState';
import { useVendorStatus } from '@/hooks/useVendorStatus';
import { useVendorEdit } from './useVendorEdit';
import { useVendorDelete } from './useVendorDelete';

// Vendors list: paginated read + navigation. Each row action owns its own flow —
// `useVendorStatus` (active/suspended, shared with the detail page), `useVendorEdit`
// (drawer + write) and `useVendorDelete` (confirm + soft delete) — so this hook
// only composes them and exposes the read.
export function useVendors() {
  const navigate = useNavigate();
  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const { data, isLoading, isFetching, error } = useVendorsAdmin(table.params);
  const status = useVendorStatus();
  const edit = useVendorEdit();
  const remove = useVendorDelete();

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    status,
    edit,
    remove,
    navigate,
    table,
  };
}
