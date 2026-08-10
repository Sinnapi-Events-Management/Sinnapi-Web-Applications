import { Box, Stack, Typography } from '@sinnapi/ui';
import { alpha } from '@mui/material/styles';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import type { PaymentRail } from '../../hooks/useEscrowCheckout';

type Rail = PaymentRail & { label: string; caption: string };

type Props = {
  rails: Rail[];
  selected: number;
  onSelect: (index: number) => void;
  disabled?: boolean;
};

function railIcon(rail: Rail) {
  if (rail.provider === 'paypal') return <AccountBalanceWalletIcon />;
  if (rail.method === 'card') return <CreditCardIcon />;
  return <PhoneAndroidIcon />;
}

/**
 * How the client wants to pay.
 *
 * Rendered as radio cards rather than a select: the choice changes the total
 * (the processing fee differs per rail and is passed on), so it deserves to be
 * visible and comparable rather than hidden behind a dropdown.
 */
export default function PaymentRailPicker({ rails, selected, onSelect, disabled }: Props) {
  return (
    <Stack
      role="radiogroup"
      aria-label="Payment method"
      direction="row"
      flexWrap="wrap"
      sx={{ gap: 1 }}
    >
      {rails.map((rail, i) => {
        const active = i === selected;
        return (
          <Box
            key={`${rail.provider}-${rail.method}`}
            role="radio"
            aria-checked={active}
            tabIndex={disabled ? -1 : 0}
            onClick={() => !disabled && onSelect(i)}
            onKeyDown={(e) => {
              if (disabled) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(i);
              }
            }}
            sx={{
              flex: '1 1 calc(50% - 8px)',
              minWidth: 148,
              p: 1.5,
              borderRadius: 2,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
              border: (t) =>
                `1.5px solid ${active ? t.palette.secondary.main : alpha(t.palette.divider, 0.9)}`,
              bgcolor: (t) => (active ? alpha(t.palette.secondary.main, 0.08) : 'transparent'),
              transition: 'border-color .15s, background-color .15s',
              '&:hover': {
                borderColor: (t) => (disabled ? undefined : t.palette.secondary.main),
              },
              '&:focus-visible': {
                outline: (t) => `2px solid ${t.palette.secondary.main}`,
                outlineOffset: 2,
              },
            }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Box
                sx={{
                  color: active ? 'secondary.main' : 'text.disabled',
                  display: 'flex',
                  '& svg': { fontSize: 20 },
                }}
              >
                {railIcon(rail)}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={active ? 700 : 600} noWrap>
                  {rail.label}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {rail.caption}
                </Typography>
              </Box>
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}
