import { useState } from 'react';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText, CircularProgress } from '@sinnapi/ui';
import AddCommentIcon from '@mui/icons-material/AddComment';
import StorefrontIcon from '@mui/icons-material/Storefront';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { FEATURES } from '@sinnapi/utils/constants';

type Props = {
  onMessageVendor: () => void;
  onContactSupport: () => void;
  busy?: boolean;
  /** Compact icon-only rendering for the toolbar's tight column. */
  compact?: boolean;
};

/**
 * The "new conversation" affordance.
 *
 * This is the control the client inbox never had: the old page told people to
 * "message a vendor from their profile" and then offered no way to do it,
 * which left the Sinnapi team unreachable entirely. Both destinations are named
 * here because they are genuinely different errands — marketplace messaging is
 * shown only while enabled, while support stays available independently.
 */
export default function StartConversationMenu({
  onMessageVendor,
  onContactSupport,
  busy,
  compact = false,
}: Props) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  let buttonLabel = 'Contact support';
  if (FEATURES.clientVendorMessaging) buttonLabel = compact ? 'New' : 'New message';

  function pick(action: () => void) {
    setAnchor(null);
    action();
  }

  return (
    <>
      <Button
        variant="contained"
        color="secondary"
        onClick={(e) =>
          FEATURES.clientVendorMessaging ? setAnchor(e.currentTarget) : onContactSupport()
        }
        disabled={busy}
        startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <AddCommentIcon />}
        sx={{ whiteSpace: 'nowrap', minWidth: 0 }}
        aria-label={
          FEATURES.clientVendorMessaging ? 'Start a new conversation' : 'Contact Sinnapi support'
        }
      >
        {buttonLabel}
      </Button>

      <Menu
        anchorEl={anchor}
        open={FEATURES.clientVendorMessaging && !!anchor}
        onClose={() => setAnchor(null)}
      >
        {FEATURES.clientVendorMessaging && (
          <MenuItem onClick={() => pick(onMessageVendor)}>
            <ListItemIcon>
              <StorefrontIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Message a vendor"
              secondary="Someone you have a booking or quote with"
            />
          </MenuItem>
        )}
        <MenuItem onClick={() => pick(onContactSupport)}>
          <ListItemIcon>
            <SupportAgentIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Contact Sinnapi"
            secondary="Questions about payments or bookings"
          />
        </MenuItem>
      </Menu>
    </>
  );
}
