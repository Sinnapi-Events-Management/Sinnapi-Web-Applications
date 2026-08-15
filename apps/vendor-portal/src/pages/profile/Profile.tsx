import { Alert, PageTitle, Snackbar } from '@sinnapi/ui';
import VendorGate from '@/vendor/VendorGate';
import { useProfilePage } from './hooks/useProfilePage';
import ProfileTabs from './components/molecules/ProfileTabs';
import BusinessSection from './components/organisms/BusinessSection';
import PersonalSection from './components/organisms/PersonalSection';

/**
 * The vendor's profile — the public listing under "Business", the person behind the
 * account under "Personal". `?tab=personal` deep-links to the latter.
 *
 * The whole page sits behind `VendorGate`, including the tab bar: this is the
 * vendor portal, and a profile is a vendor's profile, so an account with no vendor
 * record has nothing to show here rather than half a page. The gate resolves to the
 * onboarding prompt, which is the one action such an account can actually take.
 *
 * Gating above the tabs rather than inside each section is what keeps the tab bar
 * from being a control that leads nowhere — offering "Business" and "Personal" to
 * someone who can open neither would be worse than not offering them.
 */
export default function Profile() {
  const { tab, setTab, notice, setNotice, clearNotice } = useProfilePage();

  return (
    <>
      <PageTitle title="Profile" subtitle="Your public listing and your own account details." />

      <VendorGate>
        {(vendorId) => (
          <>
            <ProfileTabs value={tab} onChange={setTab} />

            {tab === 'business' ? (
              <BusinessSection vendorId={vendorId} onDone={setNotice} />
            ) : (
              <PersonalSection onDone={setNotice} />
            )}
          </>
        )}
      </VendorGate>

      <Snackbar
        open={!!notice}
        autoHideDuration={4000}
        onClose={clearNotice}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={clearNotice}>
          {notice}
        </Alert>
      </Snackbar>
    </>
  );
}
