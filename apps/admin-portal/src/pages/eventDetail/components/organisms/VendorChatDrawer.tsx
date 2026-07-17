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
import MessageComposer from '@/components/messaging/MessageComposer';
import { useMessages } from '@/hooks/queries';
import { useAuth } from '@/auth/AuthProvider';
import type { ChatTarget } from '../../hooks/useVendorChat';

/**
 * The message thread. Split into its own component so `useMessages` only runs
 * with a resolved conversation id (the drawer renders it once the thread is
 * ready), keeping the hook call unconditional and valid.
 */
function ChatThread({ conversationId }: { conversationId: string }) {
  const { user } = useAuth();
  const { data, isLoading } = useMessages(conversationId);
  const messages = data ?? [];

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', flex: 1 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (messages.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ m: 'auto', textAlign: 'center' }}>
        No messages yet. Say hello 👋
      </Typography>
    );
  }

  return (
    <Stack spacing={1} sx={{ flex: 1 }}>
      {messages.map((m) => {
        const mine = m.sender_id === user?.id;
        return (
          <Box key={m.id} sx={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
            <Box
              sx={{
                px: 1.5,
                py: 1,
                borderRadius: 2,
                bgcolor: mine ? 'primary.main' : 'grey.100',
                color: mine ? 'primary.contrastText' : 'text.primary',
              }}
            >
              <Typography variant="body2">{m.body}</Typography>
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}

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
 * conversation the RPC scoped to this event + vendor.
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

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          p: 2,
          overflowY: 'auto',
        }}
      >
        {error && <Alert severity="error">{error}</Alert>}
        {loading || !conversationId ? (
          !error && (
            <Box sx={{ display: 'grid', placeItems: 'center', flex: 1 }}>
              <CircularProgress />
            </Box>
          )
        ) : (
          <ChatThread conversationId={conversationId} />
        )}
      </Box>

      {conversationId && (
        <>
          <Divider />
          <Box sx={{ p: 2 }}>
            <MessageComposer conversationId={conversationId} />
          </Box>
        </>
      )}
    </Drawer>
  );
}
