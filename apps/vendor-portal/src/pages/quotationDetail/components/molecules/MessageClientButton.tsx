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
 * "Message client", wherever the page offers it.
 *
 * One component rather than a `<Button>` written out at each call site, because
 * the page offers it three times — beside the client's note, in the action bar,
 * and as the empty state's only move — and three copies is three chances for
 * one of them to lose the busy state and let a vendor double-tap two threads
 * into existence.
 *
 * `emphasis` is the only thing that varies. Next to the client's request for
 * changes it is the constructive answer and reads filled; in the manage bar it
 * sits among withdrawals and must not out-shout them, so it reads outlined.
 */
export default function MessageClientButton({
  onClick,
  busy,
  disabled,
  emphasis = 'quiet',
  label = 'Message client',
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
