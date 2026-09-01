import { ChartCard } from '@sinnapi/ui/analytics';
import { ExportMenu, type ExportFormat, type ReportTable } from '@sinnapi/ui/export';

type Accent = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

type Props = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  accent?: Accent;
  /**
   * The tables behind this card. Given a non-empty set, the header grows an
   * export menu scoped to exactly them — so a vendor can take one chart to
   * their accountant without exporting the whole page.
   */
  tables?: ReportTable[];
  onExport?: (tables: ReportTable[], format: ExportFormat) => void;
  children: React.ReactNode;
};

/**
 * The Analytics flavour of a chart card: the shared `ChartCard` shell plus the
 * one thing only this page needs in its header — an export scoped to the card's
 * own data.
 *
 * Icon-only, because a labelled Export button in every card header would
 * compete with the card's own title; the whole-page export in the toolbar keeps
 * its label since it is the one a vendor goes looking for.
 */
export default function AnalyticsChartCard({
  title,
  subtitle,
  icon,
  accent = 'secondary',
  tables,
  onExport,
  children,
}: Props) {
  const canExport = !!onExport && !!tables?.length;

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      icon={icon}
      accent={accent}
      action={
        canExport ? (
          <ExportMenu
            iconOnly
            label={`Export ${title.toLowerCase()}`}
            onExport={(format) => onExport(tables, format)}
          />
        ) : undefined
      }
    >
      {children}
    </ChartCard>
  );
}
