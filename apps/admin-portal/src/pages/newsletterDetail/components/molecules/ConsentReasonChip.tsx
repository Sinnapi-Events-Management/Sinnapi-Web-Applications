import { Chip, Tooltip } from '@sinnapi/ui';
import type { NewsletterAudienceRow } from '@/lib/types';

type Props = { reason: NewsletterAudienceRow['reason'] };

/**
 * Why a person cannot be mailed.
 *
 * Every state gets a sentence, not just a word, because each one has a
 * different remedy and an operator asked to explain a 400-person shortfall
 * needs to know which. `none` is by far the most common on an existing user
 * base — everyone who registered before the consent checkbox existed — and it
 * is the one that most needs saying plainly rather than reading as an error.
 */
const REASONS: Record<
  string,
  { label: string; detail: string; color: 'default' | 'warning' | 'error' }
> = {
  suppressed: {
    label: 'Suppressed',
    detail: 'This address unsubscribed, hard-bounced or reported us as spam. It cannot be mailed.',
    color: 'error',
  },
  unsubscribed: {
    label: 'Unsubscribed',
    detail: 'This person opted out of this topic. Only they can opt back in.',
    color: 'default',
  },
  pending: {
    label: 'Unconfirmed',
    detail: 'They ticked the box but have not clicked the confirmation link yet.',
    color: 'warning',
  },
  none: {
    label: 'No consent',
    detail: 'They never opted in to this topic — most likely they registered before it existed.',
    color: 'default',
  },
};

export default function ConsentReasonChip({ reason }: Props) {
  if (!reason) return <Chip size="small" color="success" variant="outlined" label="Subscribed" />;
  const meta = REASONS[reason] ?? REASONS.none;
  return (
    <Tooltip title={meta.detail}>
      <Chip size="small" variant="outlined" color={meta.color} label={meta.label} />
    </Tooltip>
  );
}
