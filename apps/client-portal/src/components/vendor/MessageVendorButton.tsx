import { Button, CircularProgress, Alert, Stack } from '@sinnapi/ui';
import ChatIcon from '@mui/icons-material/Chat';
import { useStartConversation } from '@/hooks/messaging/useStartConversation';

type Props = {
  vendorId: string | null | undefined;
  fullWidth?: boolean;
  variant?: 'text' | 'outlined' | 'contained';
};

/**
 * Starts — or reopens — the client's conversation with a vendor.
 *
 * This replaces a `<Button component={RouterLink} to="/messages">` that sat on
 * the vendor profile and the booking panel. That link went to the inbox, which
 * on a first visit is empty, so the single most direct action on the page —
 * "talk to this vendor" — dead-ended in a list telling the reader to message a
 * vendor from their profile. Which is the page they had just left.
 *
 * The find-or-create RPC behind `messageVendor` is idempotent, so tapping twice
 * reopens the same thread rather than creating a second one.
 */
export default function MessageVendorButton({
  vendorId,
  fullWidth = true,
  variant = 'outlined',
}: Props) {
  const { messageVendor, isBusy, error } = useStartConversation();

  return (
    <Stack spacing={1} sx={{ width: fullWidth ? '100%' : 'auto' }}>
      <Button
        onClick={() => void messageVendor(vendorId)}
        disabled={!vendorId || isBusy}
        fullWidth={fullWidth}
        variant={variant}
        startIcon={isBusy ? <CircularProgress size={16} color="inherit" /> : <ChatIcon />}
      >
        {isBusy ? 'Opening…' : 'Message vendor'}
      </Button>
      {/* Inline rather than a toast: the reason is about the button that was
          just pressed, and it should stay on screen next to it. */}
      {error && (
        <Alert severity="error" sx={{ py: 0.25 }}>
          {error}
        </Alert>
      )}
    </Stack>
  );
}
