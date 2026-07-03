import { Box, Chip, Paper, Stack, Typography } from '@sinnapi/ui/atoms';
import {
  Savings,
  CalendarMonth,
  SupportAgent,
  Groups,
  Restaurant,
  CurrencyExchange,
  FlightTakeoff,
  Diversity3,
  Celebration,
  Mic,
  FactCheck,
  Handshake,
  Shield,
  TravelExplore,
} from '@mui/icons-material';
import { withAlpha, palette } from '@sinnapi/ui/tokens';
import type { TipIcon } from '../data/tips';

/** Token → Material icon. Keeps the tips data file pure (JSX-free) data. */
const ICONS: Record<TipIcon, typeof Savings> = {
  budget: Savings,
  calendar: CalendarMonth,
  planner: SupportAgent,
  guests: Groups,
  food: Restaurant,
  forex: CurrencyExchange,
  trip: FlightTakeoff,
  family: Diversity3,
  ceremony: Celebration,
  mc: Mic,
  runOfShow: FactCheck,
  contract: Handshake,
  contingency: Shield,
  regional: TravelExplore,
};

type TipCardProps = {
  icon: TipIcon;
  title: string;
  body: string;
  /** Audience label shown as a subtle chip (e.g. "From abroad"). */
  tag: string;
};

/**
 * A single planning tip — an outlined card with a tinted icon tile, an audience
 * chip, a short title and one supporting line. Mirrors the EventDetailHighlights
 * tile (rounded, outlined, lift on hover) so tips feel native to the page.
 */
export default function TipCard({ icon, title, body, tag }: TipCardProps) {
  const Icon = ICONS[icon];

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        height: '100%',
        borderRadius: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        transition: 'box-shadow .2s ease, border-color .2s ease, transform .2s ease',
        '&:hover': {
          boxShadow: 3,
          borderColor: 'primary.main',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'primary.main',
            bgcolor: withAlpha(palette.light.primary.main, 0.1),
          }}
        >
          <Icon fontSize="small" />
        </Box>
        <Chip
          label={tag}
          size="small"
          variant="outlined"
          sx={{ fontWeight: 600, color: 'text.secondary' }}
        />
      </Stack>

      <Typography variant="h6" sx={{ lineHeight: 1.3 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
        {body}
      </Typography>
    </Paper>
  );
}
