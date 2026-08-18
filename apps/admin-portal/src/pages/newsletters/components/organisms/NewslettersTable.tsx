import { DataTable, type TableState } from '@sinnapi/ui';
import { CAMPAIGN_COLUMNS } from '../../schema/Columns';
import type { NewsletterCampaignModel } from '@/lib/types';

type Props = {
  rows: NewsletterCampaignModel[];
  total: number;
  loading: boolean;
  emptyMessage: string;
  controls: TableState['controls'];
  onOpen: (id: string) => void;
};

/** The campaign list. Presentational — every piece of state is the hook's. */
export default function NewslettersTable({
  rows,
  total,
  loading,
  emptyMessage,
  controls,
  onOpen,
}: Props) {
  return (
    <DataTable
      columns={CAMPAIGN_COLUMNS}
      rows={rows}
      getRowId={(r) => r.id}
      rowCount={total}
      loading={loading}
      emptyMessage={emptyMessage}
      onRowClick={(r) => onOpen(r.id)}
      minWidth={840}
      {...controls}
    />
  );
}
