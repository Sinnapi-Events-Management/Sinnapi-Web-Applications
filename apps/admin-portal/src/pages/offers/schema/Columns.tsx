import { Stack, Typography, type DataTableColumn } from '@sinnapi/ui';
import { OfferLifecycleChip, deriveOfferLifecycle, type OfferLifecycle } from '@sinnapi/ui/offers';
import StarIcon from '@mui/icons-material/Star';
import { formatDate } from '@/lib/config';
import type { AdminOfferModel } from '@/lib/types';
import OfferClaimCell from '@/components/offers/molecules/OfferClaimCell';
import OfferReachCell from '@/components/offers/molecules/OfferReachCell';
import OfferResultCell from '@/components/offers/molecules/OfferResultCell';
import OfferActionsMenu from '@/components/offers/molecules/OfferActionsMenu';

type Options = {
  busyId: string | null;
  onSuspend: (offer: AdminOfferModel) => void;
  onRestore: (offer: AdminOfferModel) => void;
  onToggleFeatured: (offer: AdminOfferModel) => void;
  onOpenVendor: (offer: AdminOfferModel) => void;
};

/**
 * Columns for the offers console.
 *
 * Ordered by the question an operator asks in sequence: what is being claimed,
 * by whom, how far it reaches, what state it is in, when it ends, what it has
 * returned, and then what to do about it.
 *
 * The claim comes FIRST, ahead of the vendor. Every other admin table in this
 * console leads with who — a booking's reference, a payment's client — because
 * those rows are looked up. This one is scanned: an operator opens it to find
 * the claim that should not be on the site, and the vendor is how they find out
 * whose it is once they have spotted it.
 *
 * A factory rather than a constant because the row actions need the page's
 * handlers, which belong to the hook.
 */
export function offerColumns({
  busyId,
  onSuspend,
  onRestore,
  onToggleFeatured,
  onOpenVendor,
}: Options): DataTableColumn<AdminOfferModel>[] {
  return [
    {
      field: 'title',
      headerName: 'Offer',
      render: (offer) => <OfferClaimCell offer={offer} />,
    },
    {
      field: 'vendor_name',
      headerName: 'Vendor',
      render: (offer) => (
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography variant="body2" noWrap>
            {offer.vendor_name ?? 'Platform-wide'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {offer.vendor_public_id ?? '—'}
          </Typography>
        </Stack>
      ),
    },
    {
      field: 'package_count',
      headerName: 'Reach',
      render: (offer) => <OfferReachCell offer={offer} />,
    },
    {
      field: 'status',
      headerName: 'State',
      render: (offer) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <OfferLifecycleChip
            // The server already derived it; `deriveOfferLifecycle` is the
            // fallback for a status string this build does not know about, so
            // a state added in SQL renders as something rather than as nothing.
            status={
              (offer.status as OfferLifecycle) ??
              deriveOfferLifecycle({
                admin_suspended_at: offer.admin_suspended_at,
                starts_at: offer.starts_at,
                ends_at: offer.ends_at,
              })
            }
            reason={offer.admin_suspended_reason}
          />
          {offer.is_featured && (
            <StarIcon
              titleAccess="Featured on the public offers page"
              sx={{ fontSize: 16, color: 'warning.main' }}
            />
          )}
        </Stack>
      ),
    },
    {
      field: 'ends_at',
      headerName: 'Ends',
      render: (offer) => (
        <Typography variant="body2" color="text.secondary">
          {formatDate(offer.ends_at)}
        </Typography>
      ),
    },
    {
      field: 'redeemed_count',
      headerName: 'Result',
      align: 'right',
      render: (offer) => <OfferResultCell offer={offer} />,
    },
    {
      field: 'actions',
      headerName: '',
      align: 'right',
      render: (offer) => (
        <OfferActionsMenu
          offer={offer}
          busy={busyId === offer.discount_id}
          onSuspend={onSuspend}
          onRestore={onRestore}
          onToggleFeatured={onToggleFeatured}
          onOpenVendor={onOpenVendor}
        />
      ),
    },
  ];
}
