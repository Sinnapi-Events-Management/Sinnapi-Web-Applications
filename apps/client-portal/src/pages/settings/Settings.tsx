import { Stack, PageTitle, QueryState } from '@sinnapi/ui';
import { PrivacyDataSection, SecuritySection } from '@sinnapi/ui/settings';
import { PASSWORD_MIN_LENGTH } from '@/components/auth/schema';
import { formatDate } from '@/lib/config';
import { useSettings } from './hooks/useSettings';

/**
 * What this portal must keep regardless of an erasure request. Stated in the
 * client's own terms — a vendor's version names payouts and tax records — and
 * shown both on the card and inside the confirmation dialog.
 */
const RETENTION_NOTE =
  'Ask us to erase your personal data. Records tied to completed bookings and payments are kept for the period the law requires before they can be removed.';

/**
 * Account security and privacy.
 *
 * Every card here is a shared component from `@sinnapi/ui/settings`, wired to
 * this portal's Supabase client through `useSettings`. The vendor portal
 * renders the same two cards from the same source, so the two can no longer
 * drift — which is how the pair got here in the first place, as two hand-copied
 * grids of buttons that did nothing.
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
      <PageTitle title="Settings" subtitle="Account, security, and privacy." />
      <QueryState isLoading={isLoading} error={error}>
        <Stack spacing={3} sx={{ maxWidth: 760 }}>
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
