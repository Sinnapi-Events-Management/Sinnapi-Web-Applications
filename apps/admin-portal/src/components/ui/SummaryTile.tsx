import { Card, CardContent, Box, Typography, Skeleton } from '@sinnapi/ui';

export type SummaryAccent =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

const ACCENTS: Record<SummaryAccent, { fg: string; bg: string }> = {
  default: { fg: 'text.secondary', bg: 'action.hover' },
  primary: { fg: 'primary.main', bg: 'primary.light' },
  secondary: { fg: 'secondary.main', bg: 'secondary.light' },
  info: { fg: 'info.main', bg: 'info.light' },
  success: { fg: 'success.main', bg: 'success.light' },
  warning: { fg: 'warning.main', bg: 'warning.light' },
  error: { fg: 'error.main', bg: 'error.light' },
};

type Props = {
  label: string;
  value: number;
  icon: React.ReactNode;
  /** Colour cue for the icon badge — use it to signal urgency, not decoration. */
  accent?: SummaryAccent;
  loading?: boolean;
};

/**
 * A single KPI tile for a summary bar: a big count beside a tinted icon badge.
 * Presentational — counts are owned by the caller's hook — and shared across the
 * admin queues so every summary row reads the same.
 */
export default function SummaryTile({ label, value, icon, accent = 'default', loading }: Props) {
  const { fg, bg } = ACCENTS[accent];
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: 2,
            flexShrink: 0,
            color: fg,
            bgcolor: bg,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="overline"
            color="text.secondary"
            // A one-word label ("CONVERSATIONS") has no break opportunity, so a
            // squeezed tile clipped it mid-word instead of wrapping. Let it wrap
            // anywhere and drop the tracking a touch so it rarely needs to.
            sx={{
              display: 'block',
              lineHeight: 1.4,
              letterSpacing: '0.5px',
              overflowWrap: 'anywhere',
            }}
          >
            {label}
          </Typography>
          {loading ? (
            <Skeleton variant="text" width={40} height={38} />
          ) : (
            <Typography variant="h3" sx={{ fontSize: '1.9rem', lineHeight: 1.1 }}>
              {value}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
