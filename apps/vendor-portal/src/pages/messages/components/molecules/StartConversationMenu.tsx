import { useState } from 'react';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText, CircularProgress } from '@sinnapi/ui';
import AddCommentIcon from '@mui/icons-material/AddComment';
import PersonIcon from '@mui/icons-material/Person';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { FEATURES } from '@sinnapi/utils/constants';

type Props = {
  onMessageClient: () => void;
  onContactSupport: () => void;
  busy?: boolean;
  compact?: boolean;
};

/**
 * The "new conversation" affordance.
 *
 * Both destinations are new to this portal. A vendor previously could only ever
 * reply — `get_or_create_client_vendor_conversation` resolves the caller as the
 * client, so nothing a vendor did could open a thread — and Sinnapi was not
 * reachable from the product at all.
 */
export default function StartConversationMenu({
  onMessageClient,
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
          <MenuItem onClick={() => pick(onMessageClient)}>
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Message a client"
              secondary="Someone with a booking or quote from you"
            />
          </MenuItem>
        )}
        <MenuItem onClick={() => pick(onContactSupport)}>
          <ListItemIcon>
            <SupportAgentIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Contact Sinnapi" secondary="Payouts, listings or account help" />
        </MenuItem>
      </Menu>
    </>
  );
}
