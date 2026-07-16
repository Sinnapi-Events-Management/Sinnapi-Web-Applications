import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PersonIcon from '@mui/icons-material/Person';
import NumbersIcon from '@mui/icons-material/Numbers';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import SectionCard from '@/components/ui/SectionCard';
import InfoRow from '@/components/ui/InfoRow';
import type { IntakeDetailModel } from '@/lib/types';

/** Bank / payout destination for the applicant. */
export default function PayoutSection({ a }: { a: IntakeDetailModel }) {
  return (
    <SectionCard title="Payout details" icon={<AccountBalanceIcon />} accent="info">
      <InfoRow label="Bank" value={a.bank_name ?? undefined} icon={<AccountBalanceIcon />} />
      <InfoRow label="Account name" value={a.account_name ?? undefined} icon={<PersonIcon />} />
      <InfoRow
        label="Account #"
        value={a.account_number ?? undefined}
        icon={<NumbersIcon />}
        mono
        copyValue={a.account_number ?? undefined}
      />
      <InfoRow label="Branch" value={a.branch ?? undefined} icon={<CallSplitIcon />} />
    </SectionCard>
  );
}
