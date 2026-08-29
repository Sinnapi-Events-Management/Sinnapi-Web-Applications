import { Grid, SectionCard, Stack } from '@sinnapi/ui';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import type { RatingBand, StarFilter } from '../../schema';
import ReviewScore from '../atoms/ReviewScore';
import RatingBandRow from '../molecules/RatingBandRow';

type Props = {
  average: number;
  publishedCount: number;
  bands: RatingBand[];
  star: StarFilter;
  onSelectStar: (star: StarFilter) => void;
};

/**
 * The vendor's standing, and the way into the reviews behind it.
 *
 * One card rather than two. The average and its distribution answer a single
 * question — "is this score carried by everyone, or by a few?" — and splitting
 * them across two surfaces makes the vendor hold one number in their head while
 * they look at the other.
 *
 * The score and the bars sit side by side from `md` up and stack below it. On a
 * phone the score leads: it is the figure worth seeing first when there is only
 * one screen's worth of room.
 *
 * The two halves are separated by one rule that changes axis with the layout —
 * a left border between the columns on wide screens, a top border between the
 * stacked blocks on narrow ones. Written as a responsive border rather than a
 * `<Divider>` per breakpoint so the rule cannot fall out of step with the
 * direction the card is actually laid out in.
 */
export default function RatingBreakdownCard({
  average,
  publishedCount,
  bands,
  star,
  onSelectStar,
}: Props) {
  return (
    <SectionCard
      title="Your rating"
      subtitle="As clients see it on your public profile — select a score to read those reviews"
      icon={<StarOutlineIcon />}
      accent="secondary"
    >
      <Grid container spacing={{ xs: 1, md: 3 }} alignItems="center">
        <Grid item xs={12} md={4}>
          <ReviewScore average={average} publishedCount={publishedCount} />
        </Grid>

        <Grid item xs={12} md={8}>
          <Stack
            spacing={0.25}
            sx={{
              borderTop: { xs: 1, md: 0 },
              borderLeft: { xs: 0, md: 1 },
              borderColor: { xs: 'divider', md: 'divider' },
              pt: { xs: 2, md: 0 },
              pl: { xs: 0, md: 3 },
            }}
          >
            {bands.map((band) => (
              <RatingBandRow
                key={band.star}
                band={band}
                selected={star === band.star}
                dimmed={star !== 0}
                onSelect={() => onSelectStar(band.star as StarFilter)}
              />
            ))}
          </Stack>
        </Grid>
      </Grid>
    </SectionCard>
  );
}
