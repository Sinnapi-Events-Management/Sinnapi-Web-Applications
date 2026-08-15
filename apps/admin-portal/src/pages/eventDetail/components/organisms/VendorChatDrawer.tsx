import {
  Alert,
  Avatar,
  Box,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from '@sinnapi/ui';
import CloseIcon from '@mui/icons-material/Close';
import EmbeddedThread from '@/components/messaging/EmbeddedThread';
import type { ChatTarget } from '../../hooks/useVendorChat';

function initials(name: string | null): string {
  if (!name) return 'V';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

type Props = {
  open: boolean;
  target: ChatTarget | null;
  conversationId: string | null;
  loading: boolean;
  error: string | null;
  eventTitle: string;
  onClose: () => void;
};

/**
 * Right-hand drawer holding the event-scoped vendor⇄admin chat. Opening it
 * never leaves the event page, and every message posted here is attached to the
 * conversation the RPC scoped to this event and vendor.
 *
 * The thread itself is `EmbeddedThread`, so this drawer picked up day dividers,
 * timestamps, delivery state, attachments, typing and live delivery when the
 * hand-rolled bubble list it used to hold was removed. The header stays local —
 * it names the vendor *and* the event, which is context no generic thread
 * header carries.
 */
export default function VendorChatDrawer({
  open,
  target,
  conversationId,
  loading,
  error,
  eventTitle,
  onClose,
}: Props) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 420 }, display: 'flex', flexDirection: 'column' },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 2 }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40, fontSize: 16 }}>
          {initials(target?.businessName ?? null)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            {target?.businessName ?? 'Vendor'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            About: {eventTitle}
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close chat">
          <CloseIcon />
        </IconButton>
      </Stack>
      <Divider />

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 2 }}>
        {error ? (
          <Alert severity="error">{error}</Alert>
        ) : loading || !conversationId ? (
          <Box sx={{ display: 'grid', placeItems: 'center', flex: 1 }}>
            <CircularProgress />
          </Box>
        ) : (
          // Keyed on the conversation so switching vendors from the event page
          // remounts the thread rather than animating one history into another.
          <EmbeddedThread
            key={conversationId}
            conversationId={conversationId}
            counterpartyName={target?.businessName ?? 'Vendor'}
            counterpartyType="vendor_admin"
            fill
          />
        )}
      </Box>
    </Drawer>
  );
}
