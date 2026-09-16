import { Alert, Box, PageTitle, Snackbar } from '@sinnapi/ui';
import VendorGate from '@/vendor/VendorGate';
import { useProfilePage } from './hooks/useProfilePage';
import ProfileTabs from './components/molecules/ProfileTabs';
import BusinessSection from './components/organisms/BusinessSection';
import PersonalSection from './components/organisms/PersonalSection';

/**
 * The vendor's profile — the public listing under "Business", the person behind the
 * account under "Personal". `?tab=personal` deep-links to the latter, and
 * `?section=…` to a section within either.
 *
 * Each tab is a header, a section menu and one panel at a time, with a save bar
 * that appears only while there are edits — so the page is as long as the section
 * being edited, not the sum of all of them.
 *
 * The whole page sits behind `VendorGate`, including the tab bar: an account with
 * no vendor record has nothing to show here, and offering tabs that lead nowhere
 * would be worse than not offering them.
 *
 * A tab stays mounted (hidden) once opened, so a draft on one survives a look at
 * the other.
 */
export default function Profile() {
  const { tab, setTab, visited, notice, setNotice, clearNotice } = useProfilePage();

  return (
    <>
      <PageTitle title="Profile" subtitle="Your public listing and your own account details." />

      <VendorGate>
        {(vendorId) => (
          <>
            <ProfileTabs value={tab} onChange={setTab} />

            {visited.has('business') && (
              <Box hidden={tab !== 'business'}>
                <BusinessSection vendorId={vendorId} onDone={setNotice} />
              </Box>
            )}
            {visited.has('personal') && (
              <Box hidden={tab !== 'personal'}>
                <PersonalSection onDone={setNotice} />
              </Box>
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
