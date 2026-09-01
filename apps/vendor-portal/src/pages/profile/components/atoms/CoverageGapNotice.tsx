import { Alert } from '@sinnapi/ui';

/**
 * The warning a vendor sees while they serve nowhere.
 *
 * "No regions selected" is not a neutral default — it is the state that makes a
 * vendor unreachable through every location filter on the platform, and until an
 * admin's `approve_vendor` copy runs it is also where a brand new listing starts.
 * Saying so is the difference between an untouched form and a silent outage.
 */
export default function CoverageGapNotice() {
  return (
    <Alert severity="warning">
      You haven&apos;t selected any regions, so you won&apos;t appear when clients filter vendors by
      location. Pick at least one.
    </Alert>
  );
}
