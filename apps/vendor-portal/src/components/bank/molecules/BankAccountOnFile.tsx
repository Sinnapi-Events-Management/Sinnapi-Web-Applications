import { alpha, Box, Skeleton, Stack, StatusChip, Typography } from '@sinnapi/ui';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import type { VendorBankAccountModel } from '@/lib/types';

type Props = {
  account: VendorBankAccountModel | null;
  loading?: boolean;
};

/**
 * The payout account currently on file, masked.
 *
 * Its job is to answer the one question the form below it cannot: is anything
 * saved, and has finance verified it? The form clears itself after every save
 * because the account number must not linger in a text box, which left the card
 * looking identical whether a vendor had banked with us for a year or had never
 * entered anything at all.
 *
 * Only `last4` is shown, and only because that is the only part of the number
 * that ever leaves the database unencrypted (`set_vendor_bank_account` stores it
 * beside the ciphertext for exactly this). The leading dots are decoration, not
 * masked data — there is nothing behind them to reveal.
 */
export default function BankAccountOnFile({ account, loading }: Props) {
  if (loading) return <Skeleton variant="rounded" height={76} />;

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      sx={{
        p: 2,
        borderRadius: 2,
        border: (t) => `1px solid ${t.palette.divider}`,
        bgcolor: (t) =>
          t.palette.mode === 'dark'
            ? alpha(t.palette.text.primary, 0.03)
            : alpha(t.palette.secondary.main, 0.05),
      }}
    >
      <Box
        sx={{
          display: 'grid',
          placeItems: 'center',
          width: 40,
          height: 40,
          borderRadius: '50%',
          flexShrink: 0,
          color: 'secondary.main',
          bgcolor: 'background.paper',
          border: (t) => `1px solid ${t.palette.divider}`,
        }}
      >
        <AccountBalanceIcon fontSize="small" />
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {account ? 'Account on file' : 'No account on file'}
        </Typography>
        <Typography variant="subtitle2" fontWeight={600} noWrap>
          {account
            ? `${account.bank_name} •••• ${account.account_number_last4 ?? '????'}`
            : 'Add your bank details below to receive payouts.'}
        </Typography>
        {account && (
          <Typography
            variant="caption"
            color="text.secondary"
            component="div"
            sx={{ overflowWrap: 'anywhere' }}
          >
            {/* Labelled: a bare number typed as the account name read like a
                leaked account number (2026-11-17). */}
            {[
              account.account_name && `Name on account: ${account.account_name}`,
              account.branch && `Branch: ${account.branch}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Typography>
        )}
        {account && !account.is_verified && (
          <Typography variant="caption" color="warning.main" component="div" sx={{ mt: 0.5 }}>
            We check new bank details within 2 working days. Payments wait until then.
          </Typography>
        )}
      </Box>

      {account && <StatusChip status={account.is_verified ? 'verified' : 'pending_verification'} />}
    </Stack>
  );
}
