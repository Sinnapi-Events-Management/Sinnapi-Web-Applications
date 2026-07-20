import { Chip, Stack, Tooltip } from '@sinnapi/ui';
import SectionCard from '@/components/ui/SectionCard';
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
 * A titled card housing one chart: reuses the shared `SectionCard` shell (icon
 * badge + accent bar) and adds a provenance chip and an optional per-card export
 * menu in the header action slot.
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
    <SectionCard title={title} subtitle={subtitle} icon={icon} accent={accent} action={action}>
      {children}
    </SectionCard>
  );
}
