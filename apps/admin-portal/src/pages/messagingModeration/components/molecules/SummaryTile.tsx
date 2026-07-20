import { Card, CardContent, Box, Typography, Skeleton } from '@sinnapi/ui';

type Accent = 'default' | 'warning' | 'success' | 'error';

const ACCENTS: Record<Accent, { fg: string; bg: string }> = {
  default: { fg: 'text.secondary', bg: 'action.hover' },
  warning: { fg: 'warning.main', bg: 'warning.light' },
  success: { fg: 'success.main', bg: 'success.light' },
  error: { fg: 'error.main', bg: 'error.light' },
};

type Props = {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: Accent;
  loading?: boolean;
};

/**
 * A single KPI tile for the moderation summary bar: a big count with a tinted
 * icon badge whose colour signals urgency (open flags read as "warning").
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
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ display: 'block', lineHeight: 1.4 }}
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
