import { Box } from '@sinnapi/ui';
import EmptyState from '@/components/ui/EmptyState';
import { QUEUES, type QueueCardModel } from '../../schema';
import SectionHeading from '../molecules/SectionHeading';
import QueueCard from '../molecules/QueueCard';
import QueueCardSkeleton from '../molecules/QueueCardSkeleton';

type Props = {
  queues: QueueCardModel[];
  loading: boolean;
};

/**
 * The "what needs me today" band.
 *
 * Laid out with `auto-fit` rather than a fixed 12-column split because the card
 * count varies with the admin's permissions — a five-queue admin gets five
 * across on a wide screen, a two-queue admin gets two wide cards instead of
 * three empty columns. Phones are pinned to two-up, where a 180px minimum would
 * otherwise collapse the band into a very tall single column.
 */
export default function ActionQueuesSection({ queues, loading }: Props) {
  const grid = {
    display: 'grid',
    gap: 2,
    gridTemplateColumns: {
      xs: 'repeat(2, minmax(0, 1fr))',
      sm: 'repeat(auto-fit, minmax(180px, 1fr))',
    },
  } as const;

  return (
    <Box component="section">
      <SectionHeading
        title="Needs your attention"
        subtitle="Live backlogs — every card opens its queue"
      />

      {loading && (
        <Box sx={grid}>
          {QUEUES.map((q) => (
            <QueueCardSkeleton key={q.key} />
          ))}
        </Box>
      )}

      {!loading && queues.length === 0 && (
        <EmptyState
          title="No queues assigned to you"
          description="Your role doesn't include any of the approval queues. The analytics tabs still apply."
        />
      )}

      {!loading && queues.length > 0 && (
        <Box sx={grid}>
          {queues.map((queue) => (
            <QueueCard key={queue.key} queue={queue} />
          ))}
        </Box>
      )}
    </Box>
  );
}
