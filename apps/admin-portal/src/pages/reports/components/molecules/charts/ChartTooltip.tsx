import { Box, Typography } from '@sinnapi/ui';
import type { ValueFormat } from '../../../schema';
import { formatCompact } from '../../../format';
import { useChartTokens } from './chartTokens';

type TooltipEntry = { name?: string; value?: number; color?: string; dataKey?: string };
type Props = {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  /** Formats each row's value (money/percent/number). */
  valueFormat?: ValueFormat;
};

/**
 * Themed recharts tooltip — a small paper card that matches the app surface in
 * both colour schemes. Shared by every report chart so hover cards read the
 * same everywhere.
 */
export default function ChartTooltip({ active, payload, label, valueFormat = 'number' }: Props) {
  const { tooltip } = useChartTokens();
  if (!active || !payload?.length) return null;

  return (
    <Box
      sx={{
        bgcolor: tooltip.background,
        border: `1px solid ${tooltip.border}`,
        borderRadius: `${tooltip.radius}px`,
        px: 1.5,
        py: 1,
        boxShadow: 3,
        minWidth: 140,
      }}
    >
      {label && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {label}
        </Typography>
      )}
      {payload.map((entry) => (
        <Box
          key={entry.dataKey ?? entry.name}
          sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25 }}
        >
          <Box
            sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: entry.color, flexShrink: 0 }}
          />
          <Typography variant="body2" sx={{ flex: 1, color: 'text.secondary' }}>
            {entry.name}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {formatCompact(Number(entry.value ?? 0), valueFormat)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
