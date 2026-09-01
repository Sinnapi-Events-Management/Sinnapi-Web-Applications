import { Chip } from '@sinnapi/ui';
import type { ServiceState } from '../../schema';

/** How each state is worn: label, colour, and whether it is filled in. */
const CHIP: Record<ServiceState, { label: string; color: 'success' | 'default'; filled: boolean }> =
  {
    live: { label: 'Live', color: 'success', filled: true },
    hidden: { label: 'Hidden', color: 'default', filled: false },
    archived: { label: 'Archived', color: 'default', filled: false },
  };

/**
 * Where a service stands, in one chip.
 *
 * Filled only when live, so a grid reads as live-or-not at a glance without
 * the vendor parsing a word per card. The colour is `success` rather than
 * `primary` because gold is the platform's headline colour and a whole grid of
 * gold chips would flatten the one place it means something — the price.
 *
 * Hidden and archived share the outlined treatment rather than each taking a
 * colour of their own. Both mean "clients cannot see this", the tab the vendor
 * is standing on already says which of the two it is, and spending `warning`
 * on a state the vendor chose on purpose would make their own tidying look
 * like a problem.
 */
export default function ServiceStatusChip({ state }: { state: ServiceState }) {
  const chip = CHIP[state];
  return (
    <Chip
      size="small"
      variant={chip.filled ? 'filled' : 'outlined'}
      color={chip.color}
      label={chip.label}
    />
  );
}
