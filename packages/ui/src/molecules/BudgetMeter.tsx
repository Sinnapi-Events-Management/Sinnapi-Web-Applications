'use client';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  BUDGET_BAND_LABELS,
  budgetBandGeometry,
  budgetStateColor,
  type BudgetFigures,
} from './eventBudget';
import { formatAmount } from './money';

export type BudgetMeterProps = {
  figures: BudgetFigures;
  /**
   * `compact` is the card variant: the bar and nothing else, for a grid where
   * the meter is one row of a summary rather than the subject of the screen.
   */
  compact?: boolean;
  /** Hide the figure legend under the bar. Implied by `compact`. */
  hideLegend?: boolean;
};

/**
 * Spend against a ceiling, as a horizontal track.
 *
 * A BAR, NOT A DONUT. For a limit — as opposed to a part-to-whole breakdown —
 * a bar is the mark that reads at a glance, because "how far along am I" is a
 * length comparison and an arc makes the eye do trigonometry. It is also the
 * one that survives being 200px wide on a phone card. (`StackedShareBar` in the
 * analytics kit is the part-to-whole sibling: it normalises to the sum of its
 * slices, so it can express a distribution and cannot express an overrun.)
 *
 * TWO BANDS, ALWAYS DISTINGUISHABLE. `committed` is a vendor who has taken the
 * job; `pending` is an accepted price with no booking behind it yet, or a
 * request the vendor has not answered. Collapsing them into one figure is what
 * makes a client think they have 12m free when 4m of it is already promised —
 * so pending is drawn in the same hue at lower opacity, which reads as "the
 * same money, less settled" rather than as a second, unrelated category.
 *
 * OVERFLOW IS SHOWN, NOT CLAMPED. Past the budget the track rescales to what is
 * actually spoken for and a marker line shows where the budget sat, so the
 * overspend has a visible width. A bar pinned at 100% announces the problem and
 * then hides its size.
 */
export function BudgetMeter({ figures, compact = false, hideLegend = false }: BudgetMeterProps) {
  const theme = useTheme();
  const geo = budgetBandGeometry(figures);
  const color = budgetStateColor(figures.state);

  // `default` has no `.main`; an unset budget draws a neutral, empty track.
  const bandColor = color === 'default' ? theme.palette.text.disabled : theme.palette[color].main;

  const trackHeight = compact ? 8 : 12;
  const showLegend = !compact && !hideLegend;

  const committedLabel = `${BUDGET_BAND_LABELS.committed}: ${formatAmount(
    figures.committed_amount,
    figures.currency,
  )}`;
  const pendingLabel = `${BUDGET_BAND_LABELS.pending}: ${formatAmount(
    figures.pending_amount,
    figures.currency,
  )}`;

  return (
    <Box>
      <Box
        role="img"
        aria-label={
          figures.budget_amount == null
            ? 'No budget set'
            : `${committedLabel}, ${pendingLabel}, of a ${formatAmount(
                figures.budget_amount,
                figures.currency,
              )} budget`
        }
        sx={{
          position: 'relative',
          display: 'flex',
          height: trackHeight,
          borderRadius: trackHeight / 2,
          overflow: 'hidden',
          // The unfilled remainder of the track. `action.hover` rather than a
          // fixed grey so the empty part of the bar sits correctly against both
          // the light sheet and the warm dark panel.
          bgcolor: 'action.hover',
        }}
      >
        <Tooltip title={committedLabel} arrow>
          <Box
            sx={{
              width: `${geo.committedPercent}%`,
              bgcolor: bandColor,
              transition: theme.transitions.create('width'),
            }}
          />
        </Tooltip>
        <Tooltip title={pendingLabel} arrow>
          <Box
            sx={{
              width: `${geo.pendingPercent}%`,
              // Same hue, less settled. A striped fill was the alternative and
              // is worse: at 8px tall on a card the stripes alias into noise.
              bgcolor: alpha(bandColor, 0.42),
              transition: theme.transitions.create('width'),
            }}
          />
        </Tooltip>

        {geo.budgetMarkerPercent != null && (
          <Tooltip
            title={`Your budget: ${formatAmount(figures.budget_amount, figures.currency)}`}
            arrow
          >
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${geo.budgetMarkerPercent}%`,
                width: 2,
                // Reads against both bands and against the empty track.
                bgcolor: 'background.paper',
                boxShadow: `0 0 0 1px ${alpha(theme.palette.text.primary, 0.45)}`,
              }}
            />
          </Tooltip>
        )}
      </Box>

      {showLegend && (
        <Stack
          direction="row"
          spacing={{ xs: 1.5, sm: 3 }}
          sx={{ mt: 1.5, flexWrap: 'wrap' }}
          useFlexGap
        >
          <LegendItem
            swatch={bandColor}
            label={BUDGET_BAND_LABELS.committed}
            value={formatAmount(figures.committed_amount, figures.currency)}
          />
          <LegendItem
            swatch={alpha(bandColor, 0.42)}
            label={BUDGET_BAND_LABELS.pending}
            value={formatAmount(figures.pending_amount, figures.currency)}
          />
          {figures.budget_amount != null && (
            <LegendItem
              swatch={theme.palette.action.hover}
              label={BUDGET_BAND_LABELS.remaining}
              value={formatAmount(figures.remaining_amount, figures.currency)}
            />
          )}
        </Stack>
      )}
    </Box>
  );
}

function LegendItem({ swatch, label, value }: { swatch: string; label: string; value: string }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
      <Box
        sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: swatch, flexShrink: 0 }}
        aria-hidden
      />
      <Typography variant="caption" color="text.secondary" noWrap>
        {label}
      </Typography>
      <Typography
        variant="caption"
        sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
        noWrap
      >
        {value}
      </Typography>
    </Stack>
  );
}
