import { Button } from '@sinnapi/ui';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';

type Props = {
  onClick: () => void;
  busy: boolean;
  disabled?: boolean;
  /** Filled rather than outlined. For the one place it is the thing to do. */
  emphasis?: 'primary' | 'quiet';
  label?: string;
  fullWidth?: boolean;
};

/**
 * "Message vendor", wherever the page offers it.
 *
 * One component rather than a `<Button>` written out at each call site, because
 * the page offers it three times — beside the note on the quote, on the Next
 * steps card, and as the message tab's empty state — and three copies is three
 * chances for one of them to lose the busy state and let a client double-tap
 * two threads into existence.
 *
 * The vendor's page has its mirror in `MessageClientButton`. Not shared between
 * the two: they differ in label, in which id they carry and in which RPC sits
 * behind them, and hoisting a component whose every prop differs would leave a
 * shared file that is a `<Button>` with extra steps.
 */
export default function MessageVendorButton({
  onClick,
  busy,
  disabled,
  emphasis = 'quiet',
  label = 'Message vendor',
  fullWidth,
}: Props) {
  return (
    <Button
      variant={emphasis === 'primary' ? 'contained' : 'outlined'}
      color={emphasis === 'primary' ? 'primary' : 'inherit'}
      startIcon={<ChatBubbleOutlineIcon />}
      onClick={onClick}
      disabled={busy || disabled}
      fullWidth={fullWidth}
    >
      {label}
    </Button>
  );
}
