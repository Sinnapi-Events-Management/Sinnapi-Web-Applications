import { Alert, PageTitle, QueryState, Snackbar } from '@sinnapi/ui';
import { useProfile } from './hooks/useProfile';
import ProfileSection from './components/organisms/ProfileSection';

/**
 * The signed-in client's own account: personal details and photo.
 *
 * Password and privacy are deliberately *not* here. They live on the Settings
 * page, which already owned them, and a second copy of the change-password card
 * would have been two routes to one dialog — the kind of duplication that ends
 * with the two drifting apart. The account card links across instead, so the
 * control is one click away rather than in two places at once.
 */
export default function Profile() {
  const { profile, isLoading, error, displayName, formValues, notice, setNotice, clearNotice } =
    useProfile();

  return (
    <>
      <PageTitle
        title="My profile"
        subtitle="Your photo and the details vendors see when you book them."
      />

      <QueryState isLoading={isLoading} error={error}>
        {profile ? (
          <ProfileSection
            profile={profile}
            displayName={displayName}
            values={formValues}
            onDone={setNotice}
          />
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
