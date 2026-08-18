import type { DataTableColumn } from '@sinnapi/ui';
import { formatDate } from '@/lib/config';
import type { VendorAccountModel } from '@/lib/types';
import VendorIdentityCell from '../components/molecules/VendorIdentityCell';
import ListingCell from '../components/molecules/ListingCell';
import AccountStateCell from '../components/molecules/AccountStateCell';
import AccessCell from '../components/molecules/AccessCell';
import VendorAccountRowActions from '../components/molecules/VendorAccountRowActions';
import type { LifecycleAction } from './actions';

type ColumnHandlers = {
  onViewListing: (row: VendorAccountModel) => void;
  onResendCredentials: (row: VendorAccountModel) => void;
  onResetPassword: (row: VendorAccountModel) => void;
  onLifecycleAction: (row: VendorAccountModel, action: LifecycleAction) => void;
};

/**
 * Column order follows the questions an operator arrives with: who is this,
 * what do they sell, can they get in, and are they in good standing. Each cell
 * is its own molecule so this file stays a layout decision and nothing else.
 *
 * `sortable` is set only where `search_vendor_accounts` whitelists the field —
 * a header that sorts by something the RPC silently ignores is worse than a
 * header that does not sort.
 */
export const getColumns = ({
  onViewListing,
  onResendCredentials,
  onResetPassword,
  onLifecycleAction,
}: ColumnHandlers): DataTableColumn<VendorAccountModel>[] => [
  {
    field: 'full_name',
    headerName: 'Vendor',
    sortable: true,
    render: (row) => <VendorIdentityCell row={row} />,
  },
  {
    field: 'business_name',
    headerName: 'Listing',
    sortable: true,
    render: (row) => <ListingCell row={row} />,
  },
  {
    field: 'account_status',
    headerName: 'Account',
    sortable: true,
    render: (row) => <AccountStateCell row={row} />,
  },
  {
    field: 'last_login_at',
    headerName: 'Last sign-in',
    sortable: true,
    render: (row) => <AccessCell row={row} />,
  },
  {
    field: 'created_at',
    headerName: 'Joined',
    sortable: true,
    render: (row) => formatDate(row.created_at),
  },
  {
    field: 'actions',
    headerName: 'Actions',
    align: 'right',
    render: (row) => (
      <VendorAccountRowActions
        row={row}
        onViewListing={onViewListing}
        onResendCredentials={onResendCredentials}
        onResetPassword={onResetPassword}
        onLifecycleAction={onLifecycleAction}
      />
    ),
  },
];
