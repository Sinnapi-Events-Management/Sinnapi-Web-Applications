import { SectionCard } from '@sinnapi/ui';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import VendorGate from '@/vendor/VendorGate';
import BankAccountForm from '@/components/bank/BankAccountForm';

/**
 * Where payouts land. Vendor-only, and gated: the form writes against a vendor
 * id, so an owner whose application has not been approved yet is shown the
 * onboarding prompt instead of a form with nothing to save to.
 */
export default function PayoutBankSection() {
  return (
    <SectionCard title="Payout bank account" icon={<AccountBalanceIcon />} accent="secondary">
      <VendorGate>{(vendorId) => <BankAccountForm vendorId={vendorId} />}</VendorGate>
    </SectionCard>
  );
}
