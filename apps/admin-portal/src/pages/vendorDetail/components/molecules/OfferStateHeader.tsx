import { Stack } from '@sinnapi/ui';
import StarIcon from '@mui/icons-material/Star';
import { OfferLifecycleChip, deriveOfferLifecycle, type OfferLifecycle } from '@sinnapi/ui/offers';
import OfferActionsMenu from '@/components/offers/molecules/OfferActionsMenu';
import type { AdminOfferModel } from '@/lib/types';

type Props = {
  offer: AdminOfferModel;
  busy: boolean;
  onSuspend: (offer: AdminOfferModel) => void;
  onRestore: (offer: AdminOfferModel) => void;
  onToggleFeatured: (offer: AdminOfferModel) => void;
};

/**
 * The state of an offer and the menu over it, in the card's header slot.
 *
 * The same chip and the same menu the console's table renders, so an operator
 * moving between the two screens is not learning a second vocabulary for one
 * campaign — which is the whole argument for `OfferLifecycleChip` existing in
 * the shared kit at all.
 *
 * `status` comes from the server, which derived it; `deriveOfferLifecycle` is
 * the fallback for a value this build does not recognise, so a state added in
 * SQL renders as something rather than as an empty header.
 */
export default function OfferStateHeader({
  offer,
  busy,
  onSuspend,
  onRestore,
  onToggleFeatured,
}: Props) {
  const status =
    (offer.status as OfferLifecycle) ??
    deriveOfferLifecycle({
      admin_suspended_at: offer.admin_suspended_at,
      starts_at: offer.starts_at,
      ends_at: offer.ends_at,
    });

  return (
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
      <OfferLifecycleChip status={status} reason={offer.admin_suspended_reason} />
      {offer.is_featured && (
        <StarIcon
          titleAccess="Featured on the public offers page"
          sx={{ fontSize: 18, color: 'warning.main' }}
        />
      )}
      <OfferActionsMenu
        offer={offer}
        busy={busy}
        onSuspend={onSuspend}
        onRestore={onRestore}
        onToggleFeatured={onToggleFeatured}
      />
    </Stack>
  );
}
