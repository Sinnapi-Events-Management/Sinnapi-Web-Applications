import { Box, Stack, StatusChip, Typography, HeroSurface } from '@sinnapi/ui';
import type { EventBudgetSummaryModel, MyEventDetailModel } from '@/lib/types';
import EventHeroMeta from '../molecules/EventHeroMeta';

type Props = {
  event: MyEventDetailModel;
  budget: EventBudgetSummaryModel | null;
};

/**
 * Banner header: which event this is, where it stands, and the facts worth
 * reading before scrolling.
 *
 * No budget state chip up here, deliberately. The budget card immediately below
 * carries the meter, the state and the sentence explaining it; repeating "Over
 * budget" in the banner would put the same warning on screen twice, which reads
 * as two problems rather than one and is the fastest way to teach a client to
 * ignore both.
 */
export default function EventHero({ event, budget }: Props) {
  return (
    <HeroSurface>
      <Box sx={{ position: 'relative', minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.15 }}>
            {event.title}
          </Typography>
          <StatusChip status={event.status} size="medium" />
        </Stack>

        {event.description && (
          <Typography
            variant="body2"
            sx={{
              opacity: 0.9,
              mt: 0.75,
              maxWidth: '68ch',
              // A brief can run to 2000 characters. The hero shows the opening
              // of it and the Details card below carries the whole thing.
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {event.description}
          </Typography>
        )}
      </Box>

      <EventHeroMeta event={event} budget={budget} />
    </HeroSurface>
  );
}
