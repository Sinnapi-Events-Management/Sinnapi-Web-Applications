import SectionCard from '@/components/ui/SectionCard';

type Accent = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

type Props = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  accent?: Accent;
  /** Header-right slot — provenance chips, export menus, links, filters. */
  action?: React.ReactNode;
  children: React.ReactNode;
  sx?: object;
};

/**
 * A titled card housing one chart: the shared `SectionCard` shell (icon badge +
 * accent bar) with a full-height frame so cards sitting side by side in a grid
 * row align to the same bottom edge.
 *
 * Deliberately free of any export/provenance concerns — surfaces that need them
 * wrap this and pass their own `action` (see the Reports panel's ChartCard).
 */
export default function ChartCard({
  title,
  subtitle,
  icon,
  accent = 'secondary',
  action,
  children,
  sx,
}: Props) {
  return (
    <SectionCard
      title={title}
      subtitle={subtitle}
      icon={icon}
      accent={accent}
      action={action}
      sx={{ height: '100%', ...sx }}
    >
      {children}
    </SectionCard>
  );
}
