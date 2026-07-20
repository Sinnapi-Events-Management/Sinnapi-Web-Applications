import { Card, CardContent, Box, Typography, Skeleton } from '@sinnapi/ui';

type Accent = 'default' | 'primary' | 'info' | 'success';

const ACCENTS: Record<Accent, { fg: string; bg: string }> = {
  default: { fg: 'text.secondary', bg: 'action.hover' },
  primary: { fg: 'white', bg: 'primary.light' },
  info: { fg: 'white', bg: 'info.light' },
  success: { fg: 'white', bg: 'success.light' },
};

type Props = {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: Accent;
  loading?: boolean;
};

/**
 * A single KPI tile for the templates summary bar: a big count beside a tinted
 * icon badge whose colour cues the metric (email reads as "primary", active as
 * "success"). Presentational — counts are owned by the page hook.
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
