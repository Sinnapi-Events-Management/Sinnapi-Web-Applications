import { useState } from 'react';
import { Box, Button, Card, Collapse, Stack, Typography } from '@sinnapi/ui';
import StarIcon from '@mui/icons-material/Star';
import type { RatingBand, StarFilter } from '../../schema';
import RatingBreakdownCard from './RatingBreakdownCard';

type Props = {
  bands: RatingBand[];
  average: number;
  publishedCount: number;
  star: StarFilter;
  onSelectStar: (star: StarFilter) => void;
};

/**
 * Your rating in one line, with the score bars one tap away (2026-11-17).
 * Four stat lines and an open breakdown card used to sit above every review,
 * pushing the one that needed an answer to the bottom of the page.
 */
export default function ReviewsSummary({
  bands,
  average,
  publishedCount,
  star,
  onSelectStar,
}: Props) {
  const [open, setOpen] = useState(star !== 0);
  return (
    <Box component="section" sx={{ mb: 3 }}>
      <Card variant="outlined" sx={{ px: 2, py: 1.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography variant="h5" fontWeight={700}>
              {publishedCount ? average.toFixed(1) : '—'}
            </Typography>
            <StarIcon sx={{ color: 'secondary.main' }} />
            <Typography color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              from {publishedCount} review{publishedCount === 1 ? '' : 's'}
            </Typography>
          </Stack>
          <Button
            size="small"
            onClick={() => setOpen((o) => !o)}
            sx={{ minHeight: 40, whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {open ? 'Hide' : 'Details'}
          </Button>
        </Stack>
      </Card>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ mt: 2 }}>
          <RatingBreakdownCard
            average={average}
            publishedCount={publishedCount}
            bands={bands}
            star={star}
            onSelectStar={onSelectStar}
          />
        </Box>
      </Collapse>
    </Box>
  );
}
