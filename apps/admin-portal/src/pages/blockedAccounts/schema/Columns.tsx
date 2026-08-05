import { Chip, type DataTableColumn } from '@sinnapi/ui';
import { titleize } from '@/lib/config';
import type { BlockedAccountModel } from '@/lib/types';
import type { BlockedActionKind } from '../hooks/useBlockedActions';
import IdentityCell from '../components/molecules/IdentityCell';
import BlockStateCell from '../components/molecules/BlockStateCell';
import AttemptsCell from '../components/molecules/AttemptsCell';
import DeviceCell from '../components/molecules/DeviceCell';
import OriginCell from '../components/molecules/OriginCell';
import BlockedRowActions from '../components/molecules/BlockedRowActions';
import { rowKey } from './presenter';

type ColumnHandlers = {
  onAction: (row: BlockedAccountModel, kind: BlockedActionKind) => void;
  isRevealed: (key: string) => boolean;
  onReveal: (key: string, subject: string | null) => void;
};

/**
 * Column definitions only — every cell delegates to a molecule, so this file
 * stays a layout declaration rather than a place rendering logic accumulates.
 *
 * Nothing is `sortable`: the RPC fixes the order (locked first, most recent
 * first) because that ordering is the page's priority signal, and letting it be
 * re-sorted by email would bury the rows that expire.
 */
export const getColumns = ({
  onAction,
  isRevealed,
  onReveal,
}: ColumnHandlers): DataTableColumn<BlockedAccountModel>[] => [
  {
    field: 'email',
    headerName: 'Account',
    render: (row) => <IdentityCell row={row} />,
  },
  {
    field: 'kind',
    headerName: 'Block',
    render: (row) => <BlockStateCell row={row} />,
  },
  {
    field: 'portal',
    headerName: 'Portal',
    render: (row) =>
      row.portal ? (
        <Chip size="small" variant="outlined" label={titleize(row.portal)} />
      ) : (
        // A suspension is global — it is not scoped to one portal, and showing
        // a portal here would imply the account works in the others.
        <Chip size="small" variant="outlined" label="All" color="default" />
      ),
  },
  {
    field: 'attempt_count',
    headerName: 'Attempts',
    align: 'right',
    render: (row) => <AttemptsCell row={row} />,
  },
  {
    field: 'last_user_agent',
    headerName: 'Device',
    render: (row) => <DeviceCell row={row} />,
  },
  {
    field: 'last_country',
    headerName: 'Origin',
    render: (row) => {
      const key = rowKey(row);
      return (
        <OriginCell
          row={row}
          revealed={isRevealed(key)}
          onReveal={() => onReveal(key, row.email)}
        />
      );
    },
  },
  {
    field: 'actions',
    headerName: 'Actions',
    align: 'right',
    render: (row) => <BlockedRowActions row={row} onAction={onAction} />,
  },
];
