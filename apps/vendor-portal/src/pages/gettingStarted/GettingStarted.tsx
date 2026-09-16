import CloseIcon from '@mui/icons-material/Close';
import { Alert, Box, Button, IconButton, QueryState, SetupDialog, Typography } from '@sinnapi/ui';
import { useGettingStarted } from './hooks/useGettingStarted';
import { useSignOut } from './hooks/useSignOut';
import WizardProgress from './components/molecules/WizardProgress';
import BasicsStep from './components/organisms/BasicsStep';
import StoryStep from './components/organisms/StoryStep';
import CoverageStep from './components/organisms/CoverageStep';
import PhotoStep from './components/organisms/PhotoStep';
import VerificationStep from './components/organisms/VerificationStep';
import ShowcaseStep from './components/organisms/ShowcaseStep';

/**
 * The vendor onboarding wizard, as a blocking modal over the portal shell.
 *
 * Composition only: the position, the writes and what counts as complete all
 * live in `useGettingStarted` and the hooks beneath it. Each step owns its own
 * form and footer, because "Continue" has to be the submit button of the form it
 * sits under — one shared footer above the steps would have to reach into
 * whichever form was mounted.
 *
 * The modal covers the sidebar and cannot be dismissed, so the header carries
 * the only exit: sign out for a vendor still onboarding. One who has already
 * finished and only came in to edit a step is not blocked, so they get an
 * ordinary close button and a Cancel in each step's footer instead. Finishing
 * navigates away, which unmounts the route and the modal with it.
 */
export default function GettingStarted() {
  const { vendorId, step, index, isLast, status, back, next, goTo, canLeave, leaveLabel, leave } =
    useGettingStarted();
  const signOut = useSignOut();

  const stepProps = {
    vendorId,
    vendor: status.vendor,
    isLast,
    onBack: back,
    onCancel: canLeave ? leave : undefined,
    onDone: next,
  };

  return (
    <SetupDialog
      open
      title="Finish setting up your listing"
      description="A few details clients need before they can find and book you. It takes about five minutes."
      headerActions={
        canLeave ? (
          <IconButton aria-label={leaveLabel} onClick={leave} edge="end">
            <CloseIcon />
          </IconButton>
        ) : (
          <Button
            variant="text"
            color="inherit"
            size="small"
            onClick={signOut.run}
            disabled={signOut.pending}
          >
            Sign out
          </Button>
        )
      }
    >
      <QueryState isLoading={status.isLoading} error={status.error}>
        <WizardProgress index={index} percent={status.percent} done={status.done} onGoTo={goTo} />

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {step.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {step.caption}
          </Typography>
        </Box>

        {!vendorId ? (
          <Alert severity="warning">
            Your vendor account is still being set up. Refresh in a moment.
          </Alert>
        ) : (
          <>
            {step.key === 'basics' && <BasicsStep {...stepProps} />}
            {step.key === 'story' && <StoryStep {...stepProps} />}
            {step.key === 'coverage' && <CoverageStep {...stepProps} />}
            {step.key === 'photo' && <PhotoStep {...stepProps} />}
            {step.key === 'verification' && (
              <VerificationStep {...stepProps} hasBankAccount={status.hasBankAccount} />
            )}
            {step.key === 'showcase' && <ShowcaseStep {...stepProps} />}
          </>
        )}
      </QueryState>
    </SetupDialog>
  );
}
