import { Chip, Stack, Tooltip } from '@sinnapi/ui';
import ChartCardShell from '@/components/analytics/ChartCard';
import type { ExportFormat } from '../../data/reportExport';
import ExportMenu from './ExportMenu';

type Accent = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

type Props = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  accent?: Accent;
  /**
   * Honest provenance badge: `live` = backed by a real Supabase read, `sample` =
   * illustrative mock pending the reporting RPC. Surfaced so the UI never passes
   * placeholder trends off as real data.
   */
  source?: 'live' | 'sample';
  /** When provided, renders an export dropdown scoped to this card's data. */
  onExport?: (format: ExportFormat) => void;
  children: React.ReactNode;
};

/**
 * The reports flavour of a chart card: the shared analytics `ChartCard` shell
 * plus the two things only reporting needs in its header — a data-provenance
 * chip and a per-card export menu.
 */
export default function ChartCard({
  title,
  subtitle,
  icon,
  accent = 'secondary',
  source,
  onExport,
  children,
}: Props) {
  const action = (
    <Stack direction="row" alignItems="center" spacing={1}>
      {source && (
        <Tooltip title={source === 'live' ? 'Backed by live data' : 'Illustrative sample data'}>
          <Chip
            size="small"
            label={source === 'live' ? 'Live' : 'Sample'}
            color={source === 'live' ? 'success' : 'default'}
            variant={source === 'live' ? 'filled' : 'outlined'}
            sx={{ height: 22, fontSize: 11, fontWeight: 600 }}
          />
        </Tooltip>
      )}
      {onExport && <ExportMenu onExport={onExport} />}
    </Stack>
  );

  return (
    <ChartCardShell title={title} subtitle={subtitle} icon={icon} accent={accent} action={action}>
      {children}
    </ChartCardShell>
  );
}
