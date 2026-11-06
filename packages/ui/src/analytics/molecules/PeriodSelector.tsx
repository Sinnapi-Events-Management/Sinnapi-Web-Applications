'use client';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { PERIOD_OPTIONS, type AnalyticsPeriod } from '../core';

type Props = {
  value: AnalyticsPeriod;
  onChange: (next: AnalyticsPeriod) => void;
};

/**
 * Segmented control for the reporting window (7 days … 1 year). Owned by
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
      // On a phone the four words share the row evenly, each on one line,
      // rather than stacking "7" over "days".
      sx={{ flex: { xs: 1, sm: 'none' }, minWidth: 0 }}
    >
      {PERIOD_OPTIONS.map((p) => (
        <ToggleButton
          key={p.value}
          value={p.value}
          aria-label={p.longLabel}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            flex: { xs: 1, sm: 'none' },
            px: { xs: 0.5, sm: 1.75 },
            fontSize: { xs: '0.8125rem', sm: undefined },
          }}
        >
          {p.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
