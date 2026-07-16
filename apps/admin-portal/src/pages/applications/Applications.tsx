import { useMemo } from 'react';
import { DataTable, Alert } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import StatusTabs from '@/components/ui/StatusTabs';
import type { IntakeListModel } from '@/lib/types';
import { useApplications } from './hooks/useApplications';
import { getColumns } from './schema';
import { getEmptyMessage } from './schema/tabs';

export default function Applications() {
  const {
    viewApplication,
    rows,
    total,
    isLoading,
    isFetching,
    error,
    table,
    tabs,
    countsLoading,
    status,
    onStatusChange,
  } = useApplications();

  const columns = useMemo(
    () => getColumns({ onView: (a: IntakeListModel) => viewApplication(a.id) }),
    [viewApplication],
  );

  return (
    <>
      <PageTitle
        title="Vendor applications"
        subtitle="Review, run due diligence, and approve or reject."
      />
      <StatusTabs
        options={tabs}
        value={status}
        onChange={onStatusChange}
        loadingCounts={countsLoading}
        ariaLabel="Filter applications by status"
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to load applications.'}
        </Alert>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(a) => a.id}
        rowCount={total}
        loading={isLoading || isFetching}
        onRowClick={(a) => viewApplication(a.id)}
        emptyMessage={getEmptyMessage(status)}
        {...table.controls}
      />
    </>
  );
}
