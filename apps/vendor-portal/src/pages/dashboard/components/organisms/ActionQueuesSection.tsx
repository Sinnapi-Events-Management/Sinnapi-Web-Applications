import { Box } from '@sinnapi/ui';
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
 * Laid out with `auto-fit` rather than a fixed column split so the six cards
 * reflow to whatever the viewport allows. Phones are pinned to two-up, where a
 * 180px minimum would otherwise collapse the band into a very tall column.
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
        subtitle="Live backlogs — every card opens its list"
      />

      <Box sx={grid}>
        {loading
          ? QUEUES.map((q) => <QueueCardSkeleton key={q.key} />)
          : queues.map((queue) => <QueueCard key={queue.key} queue={queue} />)}
      </Box>
    </Box>
  );
}
