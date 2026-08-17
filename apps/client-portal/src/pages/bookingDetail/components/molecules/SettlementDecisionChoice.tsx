import { Box, Stack, Typography, formatAmount } from '@sinnapi/ui';
import { alpha } from '@mui/material/styles';

type Props = {
  value: 'full' | 'reduced';
  onChange: (next: 'full' | 'reduced') => void;
  requested: number;
  currency: string;
  disabled?: boolean;
};

/**
 * The two answers a client can give, as cards rather than a dropdown.
 *
 * Paying in full and paying less are not two values of one setting — they are
 * two different acts with different consequences, one of which asks another
 * person to accept less than they invoiced. A select would present them as
 * interchangeable and hide the second behind a click; side by side, with what
 * each one does written underneath, the client chooses knowing both.
 *
 * Neither is pre-selected as the "safe" one. `full` is the default because it
 * is the common case, not because the screen is nudging: the alternative is
 * given equal weight and equal space.
 */
export default function SettlementDecisionChoice({
  value,
  onChange,
  requested,
  currency,
  disabled,
}: Props) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
      <Choice
        selected={value === 'full'}
        disabled={disabled}
        onClick={() => onChange('full')}
        title={`Approve ${formatAmount(requested, currency)}`}
        detail="Everything the vendor asked for. We release it and the booking is settled."
      />
      <Choice
        selected={value === 'reduced'}
        disabled={disabled}
        onClick={() => onChange('reduced')}
        title="Approve a smaller amount"
        detail="You say how much and why. The vendor has to agree before anything moves."
      />
    </Stack>
  );
}

function Choice({
  selected,
  disabled,
  onClick,
  title,
  detail,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  detail: string;
}) {
  return (
    <Box
      role="radio"
      aria-checked={selected}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      sx={{
        flex: 1,
        p: 1.75,
        borderRadius: 2,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        border: '1px solid',
        borderColor: selected ? 'secondary.main' : 'divider',
        bgcolor: (t) => (selected ? alpha(t.palette.secondary.main, 0.08) : 'transparent'),
        transition: 'border-color 120ms, background-color 120ms',
      }}
    >
      <Typography variant="subtitle2" fontWeight={700}>
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {detail}
      </Typography>
    </Box>
  );
}
