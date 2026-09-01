import { useState, type MouseEvent } from 'react';
import { IconButton, Menu, MenuItem, Tooltip } from '@sinnapi/ui';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import BlockIcon from '@mui/icons-material/Block';
import RestoreIcon from '@mui/icons-material/Restore';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import type { AdminOfferModel } from '@/lib/types';

type Props = {
  offer: AdminOfferModel;
  busy: boolean;
  onSuspend: (offer: AdminOfferModel) => void;
  onRestore: (offer: AdminOfferModel) => void;
  onToggleFeatured: (offer: AdminOfferModel) => void;
  /** Omitted where the operator is already on that vendor's page. */
  onOpenVendor?: (offer: AdminOfferModel) => void;
};

/**
 * What an operator can do to one offer.
 *
 * SUSPEND, RESTORE, FEATURE, AND NOTHING THAT EDITS
 * There is no "edit" here and there will not be. An offer is a vendor's
 * commercial claim; this console's job is to refuse to carry a bad one, not to
 * rewrite what a vendor is selling — the same line `admin_unpublish_quote_package`
 * drew on packages, for the same reason.
 *
 * The menu never shows a control that would do nothing: a live offer offers
 * Withdraw, a withdrawn one offers Restore, and featuring is offered only on a
 * live campaign because `admin_set_promotion_featured` refuses anything else —
 * a menu item that reliably raises is worse than no menu item.
 *
 * Featuring is disabled for an offer with no campaign behind it. Placement is a
 * property of a `promotions` row, and a standalone code has none — the tooltip
 * says so rather than the item silently doing nothing.
 *
 * "Open vendor" is dropped entirely when the caller passes no handler, which is
 * what the vendor detail page does: a menu item that navigates to the page it
 * was opened on is a control that appears to be broken.
 */
export default function OfferActionsMenu({
  offer,
  busy,
  onSuspend,
  onRestore,
  onToggleFeatured,
  onOpenVendor,
}: Props) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  const open = (event: MouseEvent<HTMLElement>) => {
    // The row is clickable; the menu button must not also trigger it.
    event.stopPropagation();
    setAnchor(event.currentTarget);
  };
  const close = () => setAnchor(null);
  const pick = (action: () => void) => (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    close();
    action();
  };

  const suspended = offer.admin_suspended_at != null;
  const canFeature = offer.promotion_id != null && offer.status === 'live';

  return (
    <>
      <IconButton
        aria-label={`Actions for ${offer.title}`}
        size="small"
        onClick={open}
        disabled={busy}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        {suspended ? (
          <MenuItem onClick={pick(() => onRestore(offer))}>
            <RestoreIcon fontSize="small" sx={{ mr: 1.5 }} />
            Restore
          </MenuItem>
        ) : (
          <MenuItem onClick={pick(() => onSuspend(offer))} sx={{ color: 'error.main' }}>
            <BlockIcon fontSize="small" sx={{ mr: 1.5 }} />
            Withdraw…
          </MenuItem>
        )}

        <Tooltip
          title={
            offer.promotion_id == null
              ? 'Only a campaign can be featured. This code stands on its own.'
              : offer.status !== 'live'
                ? 'Only a live campaign can be featured.'
                : ''
          }
        >
          {/* A span, because MUI will not show a tooltip on a disabled child. */}
          <span>
            <MenuItem disabled={!canFeature} onClick={pick(() => onToggleFeatured(offer))}>
              {offer.is_featured ? (
                <StarIcon fontSize="small" sx={{ mr: 1.5, color: 'warning.main' }} />
              ) : (
                <StarBorderIcon fontSize="small" sx={{ mr: 1.5 }} />
              )}
              {offer.is_featured ? 'Remove from featured' : 'Feature on /offers'}
            </MenuItem>
          </span>
        </Tooltip>

        {onOpenVendor && (
          <MenuItem onClick={pick(() => onOpenVendor(offer))}>
            <StorefrontOutlinedIcon fontSize="small" sx={{ mr: 1.5 }} />
            Open vendor
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
