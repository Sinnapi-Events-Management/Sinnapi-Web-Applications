import { Alert, Box, Snackbar } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import QueryState from '@/components/ui/QueryState';
import { useProfile } from './hooks/useProfile';
import ProfileTabs from './components/molecules/ProfileTabs';
import ProfileSection from './components/organisms/ProfileSection';
import SecuritySection from './components/organisms/SecuritySection';

/**
 * The signed-in admin's own account — personal details and photo under
 * "Profile", the password change under "Security". Reached from the avatar menu;
 * `?tab=security` deep-links straight to the password form.
 */
export default function Profile() {
  const {
    profile,
    email,
    roles,
    displayName,
    formValues,
    isLoading,
    error,
    tab,
    setTab,
    notice,
    setNotice,
    clearNotice,
  } = useProfile();

  return (
    <>
      <PageTitle
        title="My profile"
        subtitle="Manage your personal details, photo and account security."
      />

      <ProfileTabs value={tab} onChange={setTab} />

      <QueryState isLoading={isLoading} error={error}>
        {profile ? (
          <Box>
            {tab === 'profile' ? (
              <ProfileSection
                profile={profile}
                displayName={displayName}
                email={email}
                roles={roles}
                values={formValues}
                onDone={setNotice}
              />
            ) : (
              <SecuritySection onDone={setNotice} />
            )}
          </Box>
        ) : (
          <Alert severity="warning">
            We couldn&apos;t load your profile. Refresh the page, or sign out and back in.
          </Alert>
        )}
      </QueryState>

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
