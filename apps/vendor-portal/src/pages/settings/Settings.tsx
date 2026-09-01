import { Box, Grid, PageTitle, QueryState, Stack } from '@sinnapi/ui';
import { profileSideColumnSx, useUrlTab } from '@sinnapi/ui/profile';
import { PrivacyDataSection, SecuritySection } from '@sinnapi/ui/settings';
import { PASSWORD_MIN_LENGTH } from '@/components/auth/schema';
import { formatDate } from '@/lib/config';
import { useSettings } from './hooks/useSettings';
import { panelId, tabId, SETTINGS_TABS, SETTINGS_TAB_META, type SettingsTab } from './schema';
import AccountGlanceCard from './components/organisms/AccountGlanceCard';
import PayoutBankSection from './components/organisms/PayoutBankSection';
import SettingsTabs from './components/molecules/SettingsTabs';

/**
 * What this portal must keep regardless of an erasure request. A vendor's
 * version of the client's note: payouts and commission are financial records
 * with their own statutory retention, quite apart from the bookings both sides
 * appear in.
 */
const RETENTION_NOTE =
  'Ask us to erase your personal data. Records tied to completed bookings, payouts and tax reporting are kept for the period the law requires before they can be removed.';

const TAB_ITEMS = SETTINGS_TABS.map((value) => ({ value, meta: SETTINGS_TAB_META[value] }));

/**
 * Payout banking, security and privacy.
 *
 * Name, phone and photo used to sit at the top of this page and now live on the
 * profile page's Personal tab, beside the photo they belong with. What is left here
 * is everything that is *not* the vendor's identity: money, credentials and data
 * rights. The security and privacy cards are the same shared components the client
 * portal renders, so the two portals cannot drift on either.
 *
 * ## Why a vertical rail and one section at a time
 *
 * The page was one 760px column stacked in a full-width shell: on a laptop that
 * left close to half the viewport empty beside a card of four inputs, and it made
 * the user scroll past a bank form to reach a privacy control that has nothing to
 * do with it. Stretching the cards would not have fixed either — a text input
 * dragged across 1400px is harder to read, not easier, and the usable measure for
 * a form stays in the 480–640px band whatever the window does.
 *
 * Tabs fix both at once. Three sections is comfortably inside the range tabs are
 * good for, they are peers rather than steps, and only one is ever wanted at a
 * time. The rail is vertical rather than a bar across the top for the reason the
 * page exists: a horizontal bar would leave the same empty width beside the panel.
 * It also gives each label room for a line saying what the section holds.
 *
 * `useUrlTab` puts the section in the query string, so `/settings?tab=privacy`
 * deep-links and a reload lands where the user was. Payouts is the default and is
 * represented by the absence of the parameter.
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
      <PageTitle title="Settings" subtitle="Payout banking, security and privacy." />

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
                the previous section's form state — the panels are unrelated
                forms, not two views of one record. */}
            <Box key={tab}>
              {tab === 'payouts' && <PayoutBankSection />}

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
