import { Box, IconButton, Paper, Stack, Tooltip, Typography } from '@sinnapi/ui';
import RefreshIcon from '@mui/icons-material/Refresh';
import PeriodSelector from '@/components/analytics/PeriodSelector';
import { formatRelative } from '@/lib/config';
import type { AnalyticsPeriod } from '@/lib/analytics';

type Props = {
  period: AnalyticsPeriod;
  onPeriodChange: (next: AnalyticsPeriod) => void;
  /** When the payload on screen was generated, for the freshness caption. */
  generatedAt?: string;
  isRefreshing: boolean;
  onRefresh: () => void;
};

/**
 * Sticky control bar for the whole page: one period selector driving every
 * trend, plus refresh and a freshness read. Sticky because the dashboard is
 * long — the control that reframes it should not scroll out of reach.
 */
export default function DashboardToolbar({
  period,
  onPeriodChange,
  generatedAt,
  isRefreshing,
  onRefresh,
}: Props) {
  return (
    <Paper
      variant="outlined"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 2,
        borderRadius: 3,
        px: { xs: 2, sm: 2.5 },
        py: 1.5,
        mb: 3,
        // The page scrolls beneath this bar, so it needs an opaque backdrop.
        bgcolor: 'background.paper',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        spacing={1.5}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2">Reporting window</Typography>
          <Typography variant="caption" color="text.secondary">
            {generatedAt ? `Updated ${formatRelative(generatedAt)}` : 'Loading latest figures…'}
          </Typography>
        </Box>

        <Stack direction="row" alignItems="center" spacing={1}>
          <PeriodSelector value={period} onChange={onPeriodChange} />
          <Tooltip title="Refresh">
            {/* span keeps the tooltip working while the button is disabled */}
            <span>
              <IconButton
                onClick={onRefresh}
                disabled={isRefreshing}
                aria-label="Refresh dashboard"
              >
                <RefreshIcon
                  sx={{
                    animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': { to: { transform: 'rotate(360deg)' } },
                  }}
                />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>
    </Paper>
  );
}
