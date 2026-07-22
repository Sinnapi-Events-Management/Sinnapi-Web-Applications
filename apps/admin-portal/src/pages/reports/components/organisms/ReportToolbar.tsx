import { Paper, Stack, Typography } from '@sinnapi/ui';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { getPeriodOption, type ReportPeriod } from '../../schema';
import type { ExportFormat } from '../../data/reportExport';
import PeriodSelector from '@/components/analytics/PeriodSelector';
import ExportMenu from '../molecules/ExportMenu';

type Props = {
  /** One-line summary of the active report category. */
  description: string;
  period: ReportPeriod;
  onPeriodChange: (next: ReportPeriod) => void;
  /** Exports every table in the active report as one file. */
  onExportAll: (format: ExportFormat) => void;
  exportDisabled?: boolean;
};

/**
 * Sticky control bar above the active report: the category caption on the left,
 * the period selector and a whole-report export on the right. The period is the
 * single source of truth for every chart below it.
 */
export default function ReportToolbar({
  description,
  period,
  onPeriodChange,
  onExportAll,
  exportDisabled,
}: Props) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 3,
        mb: 3,
        position: { md: 'sticky' },
        top: { md: 8 },
        zIndex: 2,
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ md: 'center' }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}>
          <CalendarMonthIcon fontSize="small" />
          <Typography variant="body2">
            {description}{' '}
            <Typography
              component="span"
              variant="body2"
              sx={{ color: 'text.primary', fontWeight: 600 }}
            >
              {getPeriodOption(period).longLabel.toLowerCase()}.
            </Typography>
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexShrink: 0 }}>
          <PeriodSelector value={period} onChange={onPeriodChange} />
          <ExportMenu onExport={onExportAll} disabled={exportDisabled} label="Export report" />
        </Stack>
      </Stack>
    </Paper>
  );
}
