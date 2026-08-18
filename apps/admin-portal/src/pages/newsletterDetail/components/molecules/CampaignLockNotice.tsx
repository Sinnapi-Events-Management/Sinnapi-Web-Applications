import { Alert } from '@sinnapi/ui';
import { lockNotice } from '../../schema';

type Props = { status: string };

/**
 * Why the composer stopped accepting edits.
 *
 * Rendered as one banner rather than a disabled hint on each control: past
 * `draft`, the whole screen is a record of what was sent, and an operator who
 * finds a greyed-out subject field deserves the reason once, at the top,
 * together with the way out of it.
 */
export default function CampaignLockNotice({ status }: Props) {
  const message = lockNotice(status);
  if (!message) return null;

  return (
    <Alert severity="info" sx={{ mb: 2 }}>
      {message}
    </Alert>
  );
}
