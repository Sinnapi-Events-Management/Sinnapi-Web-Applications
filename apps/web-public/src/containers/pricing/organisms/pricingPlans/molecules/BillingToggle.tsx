'use client';
import { Box, Chip, Stack, ToggleButton, ToggleButtonGroup } from '@sinnapi/ui/atoms';
import { ANNUAL_SAVING_PERCENT, type BillingCycle } from '../data/plans';

type BillingToggleProps = {
  value: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
};

/**
 * Monthly ⇄ Annual billing switch. Defaults to annual at the call site (best
 * practice — it anchors the lower price), with a savings badge to nudge yearly.
 */
export default function BillingToggle({ value, onChange }: BillingToggleProps) {
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
        <Chip
          size="small"
          color="secondary"
          label={`Save ${ANNUAL_SAVING_PERCENT}%`}
          sx={{
            fontWeight: 700,
            opacity: value === 'annual' ? 1 : 0.55,
            transition: 'opacity .2s',
          }}
        />
      </Box>
    </Stack>
  );
}
