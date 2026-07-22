'use client';
import { Box, Chip, Stack, ToggleButton, ToggleButtonGroup } from '@sinnapi/ui/atoms';
import type { BillingCycle } from '@/lib/types';

type BillingToggleProps = {
  value: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
  /**
   * Percent saved by paying yearly, computed from the live catalogue. Null when
   * the numbers don't support a claim — see `annualSavingPercent`.
   */
  savingPercent: number | null;
};

/**
 * Monthly ⇄ Annual billing switch. Defaults to annual at the call site (it
 * anchors the lower price), with a savings badge to nudge yearly.
 *
 * The badge quotes a figure derived from the catalogue rather than a constant,
 * so an admin re-pricing a plan can't leave the page advertising a discount it
 * no longer gives. Its slot keeps its width when there's nothing to claim, so
 * the toggle doesn't shift sideways as the data lands.
 */
export default function BillingToggle({ value, onChange, savingPercent }: BillingToggleProps) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
      <ToggleButtonGroup
        exclusive
        value={value}
        onChange={(_, next: BillingCycle | null) => next && onChange(next)}
        aria-label="Billing cycle"
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 999,
          p: 0.5,
          '& .MuiToggleButton-root': {
            border: 0,
            borderRadius: 999,
            px: { xs: 2.5, md: 3 },
            py: 1,
            textTransform: 'none',
            fontWeight: 600,
            color: 'text.secondary',
            '&.Mui-selected': {
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.dark' },
            },
          },
        }}
      >
        <ToggleButton value="monthly" aria-label="Monthly billing">
          Monthly
        </ToggleButton>
        <ToggleButton value="annual" aria-label="Annual billing">
          Annual
        </ToggleButton>
      </ToggleButtonGroup>
      <Box sx={{ minWidth: 96 }}>
        {savingPercent !== null && (
          <Chip
            size="small"
            color="secondary"
            label={`Save ${savingPercent}%`}
            sx={{
              fontWeight: 700,
              opacity: value === 'annual' ? 1 : 0.55,
              transition: 'opacity .2s',
            }}
          />
        )}
      </Box>
    </Stack>
  );
}
