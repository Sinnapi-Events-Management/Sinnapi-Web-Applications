import { Link as RouterLink } from 'react-router-dom';
import { Card, CardActionArea, LinearProgress, Stack, Typography } from '@sinnapi/ui';

type Props = { percent: number; tip: string | null };

/** How complete the public listing is, and the one next thing to add. Hidden at 100%. */
export default function ListingStrengthCard({ percent, tip }: Props) {
  if (percent >= 100) return null;
  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardActionArea component={RouterLink} to="/profile" sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
          <Typography fontWeight={700}>Your page is {percent}% complete</Typography>
          <Typography variant="body2" color="secondary.dark" fontWeight={700}>
            Improve →
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={percent}
          color="secondary"
          sx={{ my: 1, height: 8, borderRadius: 4 }}
        />
        {tip && (
          <Typography variant="body2" color="text.secondary">
            Next: {tip}. A complete page helps clients trust you.
          </Typography>
        )}
      </CardActionArea>
    </Card>
  );
}
