import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Paper, Stack, Typography, alpha } from '@sinnapi/ui';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { Insight, InsightTone } from '../../schema';

type Props = { insight: Insight };

// Tone → the one semantic colour and glyph it carries. Kept as palette *keys*
// rather than colour values so both schemes resolve from the live theme — the
// warm dark canvas needs different actual hues from the light sheet, and
// hardcoding either would break the other.
const TONE: Record<InsightTone, { color: 'success' | 'warning' | 'info'; icon: React.ReactNode }> =
  {
    positive: { color: 'success', icon: <TrendingUpIcon fontSize="small" /> },
    attention: { color: 'warning', icon: <PriorityHighIcon fontSize="small" /> },
    neutral: { color: 'info', icon: <InfoOutlinedIcon fontSize="small" /> },
  };

/**
 * One derived finding: what the numbers say, why it matters, and where to act.
 *
 * Colour is carried by the glyph and a hairline left rule rather than by a
 * tinted fill. A row of four filled cards would put more colour above the
 * charts than there is in them, and on this product colour is reserved for
 * meaning — so it marks the tone and stops there.
 */
export default function InsightCard({ insight }: Props) {
  const tone = TONE[insight.tone];

  return (
    <Paper
      variant="outlined"
      sx={{
        height: '100%',
        borderRadius: 3,
        p: { xs: 2, sm: 2.25 },
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        // `alpha` on a palette colour keeps the rule legible on the light sheet
        // and on the warm dark panel without a second definition.
        borderLeft: 3,
        borderLeftColor: (t) => alpha(t.palette[tone.color].main, 0.85),
      }}
    >
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <Box sx={{ color: `${tone.color}.main`, display: 'flex', mt: '1px', flexShrink: 0 }}>
          {tone.icon}
        </Box>
        <Typography variant="subtitle2" sx={{ lineHeight: 1.35 }}>
          {insight.headline}
        </Typography>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
        {insight.detail}
      </Typography>

      {insight.action && (
        <Button
          component={RouterLink}
          to={insight.action.to}
          size="small"
          sx={{ textTransform: 'none', alignSelf: 'flex-start', px: 0.5, mt: 0.25 }}
        >
          {insight.action.label}
        </Button>
      )}
    </Paper>
  );
}
