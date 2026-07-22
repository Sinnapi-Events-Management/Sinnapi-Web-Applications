import { ToggleButton, ToggleButtonGroup } from '@sinnapi/ui';
import { PERIOD_OPTIONS, type AnalyticsPeriod } from '@/lib/analytics';

type Props = {
  value: AnalyticsPeriod;
  onChange: (next: AnalyticsPeriod) => void;
};

/**
 * Segmented control for the reporting window (7D / 30D / 90D / 12M). Owned by
 * the toolbar; every time-series report reads the selected value so one control
 * drives the whole page.
 */
export default function PeriodSelector({ value, onChange }: Props) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      size="small"
      onChange={(_, next: AnalyticsPeriod | null) => next && onChange(next)}
      aria-label="Reporting period"
    >
      {PERIOD_OPTIONS.map((p) => (
        <ToggleButton
          key={p.value}
          value={p.value}
          aria-label={p.longLabel}
          sx={{ textTransform: 'none', fontWeight: 600, px: 1.75 }}
        >
          {p.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
