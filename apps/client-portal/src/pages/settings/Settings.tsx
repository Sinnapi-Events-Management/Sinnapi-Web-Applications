import { Box, Grid, PageTitle, QueryState, Stack } from '@sinnapi/ui';
import { profileSideColumnSx, useUrlTab } from '@sinnapi/ui/profile';
import { PrivacyDataSection, SecuritySection } from '@sinnapi/ui/settings';
import { PASSWORD_MIN_LENGTH } from '@/components/auth/schema';
import { formatDate } from '@/lib/config';
import { useSettings } from './hooks/useSettings';
import { panelId, tabId, SETTINGS_TABS, SETTINGS_TAB_META, type SettingsTab } from './schema';
import AccountGlanceCard from './components/organisms/AccountGlanceCard';
import SettingsTabs from './components/molecules/SettingsTabs';

/**
 * What this portal must keep regardless of an erasure request. Stated in the
 * client's own terms — a vendor's version names payouts and tax records — and
 * shown both on the card and inside the confirmation dialog.
 */
const RETENTION_NOTE =
  'Ask us to erase your personal data. Records tied to completed bookings and payments are kept for the period the law requires before they can be removed.';

const TAB_ITEMS = SETTINGS_TABS.map((value) => ({ value, meta: SETTINGS_TAB_META[value] }));

/**
 * Account security and privacy.
 *
 * Every card here is a shared component from `@sinnapi/ui/settings`, wired to
 * this portal's Supabase client through `useSettings`. The vendor portal
 * renders the same two cards from the same source, so the two can no longer
 * drift — which is how the pair got here in the first place, as two hand-copied
 * grids of buttons that did nothing.
 *
 * The tabbed rail is the vendor portal's, for the same reasons: one 760px column
 * in a full-width shell wasted most of a laptop screen, and stacking a privacy
 * control under an unrelated one made the page longer without making it clearer.
 * See that page for the full argument. Two sections here rather than three, which
 * is the minimum a tab rail earns — below that it would be a switch pretending to
 * be navigation.
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
  const { tab, setTab } = useUrlTab<SettingsTab>(SETTINGS_TABS);

  return (
    <>
      <PageTitle title="Settings" subtitle="Account, security, and privacy." />

      <QueryState isLoading={isLoading} error={error}>
        <Grid container spacing={3} alignItems="flex-start">
          <Grid item xs={12} md={4} lg={3}>
            <Stack spacing={3} sx={profileSideColumnSx}>
              <SettingsTabs items={TAB_ITEMS} value={tab} onChange={setTab} />
              <AccountGlanceCard profile={profile} />
            </Stack>
          </Grid>

          <Grid
            item
            xs={12}
            md={8}
            lg={9}
            role="tabpanel"
            id={panelId(tab)}
            aria-labelledby={tabId(tab)}
          >
            {/* Keyed on the tab so a section switch remounts rather than reusing
                the previous section's state — the panels are unrelated. */}
            <Box key={tab}>
              {tab === 'security' && (
                <SecuritySection
                  email={profile?.email}
                  minLength={PASSWORD_MIN_LENGTH}
                  onChangePassword={changePassword}
                />
              )}

              {tab === 'privacy' && (
                <PrivacyDataSection
                  onExport={exportMyData}
                  onRequestDeletion={requestDeletion}
                  deletionRequest={deletionRequest}
                  loadingDeletionRequest={loadingDeletionRequest}
                  privacyPolicyTo="/privacy"
                  retentionNote={RETENTION_NOTE}
                  formatDate={formatDate}
                />
              )}
            </Box>
          </Grid>
        </Grid>
      </QueryState>
    </>
  );
}
