import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, InfoRow, Stack } from '@sinnapi/ui';
import BadgeIcon from '@mui/icons-material/BadgeOutlined';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import NumbersIcon from '@mui/icons-material/Numbers';
import ReceiptIcon from '@mui/icons-material/ReceiptOutlined';
import SchoolIcon from '@mui/icons-material/SchoolOutlined';
import AccountBalanceIcon from '@mui/icons-material/AccountBalanceOutlined';
import { useVendorBankAccount } from '@/hooks/queries';
import type { VendorProfileEditModel } from '@/lib/types';
import { VERIFICATION_EDIT_HREF } from '../../schema';

type Props = { vendorId: string; vendor: VendorProfileEditModel };

/**
 * Verification and payout, as facts rather than fields.
 *
 * Read-only on purpose. The documents are objects in a private bucket and the
 * payout account is an encrypting RPC that never reads the number back — three
 * different write paths that the setup wizard already owns end to end. Repeating
 * them here would be a second implementation of the most sensitive writes in the
 * portal, so this reports the state and sends the vendor to the one place that
 * changes it.
 *
 * Two columns of rows from `lg` up, so the panel is half as tall on a desktop.
 * The section panel around it supplies the card and heading.
 */
export default function VerificationFacts({ vendorId, vendor }: Props) {
  const { data: bank } = useVendorBankAccount(vendorId);

  const onFile = (path: string | null) => (path ? 'On file' : 'Not provided');

  return (
    <>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'repeat(2, minmax(0, 1fr))' },
          columnGap: 4,
        }}
      >
        <InfoRow label="National ID" value={onFile(vendor.national_id_path)} icon={<BadgeIcon />} />
        <InfoRow
          label="Proof of work"
          value={onFile(vendor.proof_of_work_path)}
          icon={<WorkspacePremiumIcon />}
        />
        <InfoRow
          label="Business reg #"
          value={vendor.business_reg_number ?? undefined}
          icon={<NumbersIcon />}
          mono
        />
        <InfoRow label="Tax ID" value={vendor.tax_id ?? undefined} icon={<ReceiptIcon />} mono />
        <InfoRow
          label="iCandy alumni"
          value={vendor.icandy_alumni == null ? undefined : vendor.icandy_alumni ? 'Yes' : 'No'}
          icon={<SchoolIcon />}
        />
        <InfoRow
          label="Payout account"
          value={bank ? `${bank.bank_name} ····${bank.account_number_last4 ?? ''}` : undefined}
          icon={<AccountBalanceIcon />}
        />
      </Box>

      <Stack sx={{ mt: 2 }}>
        <Button
          component={RouterLink}
          to={VERIFICATION_EDIT_HREF}
          variant="outlined"
          size="small"
          sx={{ alignSelf: 'flex-start' }}
        >
          Update these details
        </Button>
      </Stack>
    </>
  );
}
