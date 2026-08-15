import { Stack, PageTitle, QueryState } from '@sinnapi/ui';
import { PrivacyDataSection, SecuritySection } from '@sinnapi/ui/settings';
import { PASSWORD_MIN_LENGTH } from '@/components/auth/schema';
import { formatDate } from '@/lib/config';
import { useSettings } from './hooks/useSettings';
import PayoutBankSection from './components/organisms/PayoutBankSection';

/**
 * What this portal must keep regardless of an erasure request. A vendor's
 * version of the client's note: payouts and commission are financial records
 * with their own statutory retention, quite apart from the bookings both sides
 * appear in.
 */
const RETENTION_NOTE =
  'Ask us to erase your personal data. Records tied to completed bookings, payouts and tax reporting are kept for the period the law requires before they can be removed.';

/**
 * Payout banking, security and privacy.
 *
 * Name, phone and photo used to sit at the top of this page and now live on the
 * profile page's Personal tab, beside the photo they belong with. What is left here
 * is everything that is *not* the vendor's identity: money, credentials and data
 * rights. The security and privacy cards are the same shared components the client
 * portal renders, so the two portals cannot drift on either.
 */
export default function Settings() {
  const {
    profile,
    isLoading,
    error,
    deletionRequest,
    loadingDeletionRequest,
    changePassword,
    exportMyData,
    requestDeletion,
  } = useSettings();

  return (
    <>
      <PageTitle title="Settings" subtitle="Payout banking, security and privacy." />
      <QueryState isLoading={isLoading} error={error}>
        <Stack spacing={3} sx={{ maxWidth: 760 }}>
          <PayoutBankSection />
          <SecuritySection
            email={profile?.email}
            minLength={PASSWORD_MIN_LENGTH}
            onChangePassword={changePassword}
          />
          <PrivacyDataSection
            onExport={exportMyData}
            onRequestDeletion={requestDeletion}
            deletionRequest={deletionRequest}
            loadingDeletionRequest={loadingDeletionRequest}
            privacyPolicyTo="/privacy"
            retentionNote={RETENTION_NOTE}
            formatDate={formatDate}
          />
        </Stack>
      </QueryState>
    </>
  );
}
