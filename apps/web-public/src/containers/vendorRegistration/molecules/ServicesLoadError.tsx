'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, CircularProgress } from '@sinnapi/ui/atoms';
import { Alert } from '@sinnapi/ui/molecules';
import { Refresh } from '@mui/icons-material';

/**
 * Shown in place of the services picker when the categories could not be
 * loaded. Retry re-runs the route's Server Component (`router.refresh()`), which
 * fetches the categories again without remounting the form — anything the
 * applicant has already typed stays put.
 *
 * The field's id goes on the Retry button, so a submit attempted while the
 * list is missing moves focus straight to the one control that can fix it.
 */
export default function ServicesLoadError({ id }: { id: string }) {
  const router = useRouter();
  const [retrying, startRetry] = useTransition();

  return (
    <Alert
      severity="error"
      action={
        <Button
          id={id}
          color="inherit"
          size="small"
          disabled={retrying}
          onClick={() => startRetry(() => router.refresh())}
          startIcon={retrying ? <CircularProgress size={14} color="inherit" /> : <Refresh />}
        >
          {retrying ? 'Retrying…' : 'Retry'}
        </Button>
      }
    >
      We couldn&apos;t load the list of services. Check your connection and try again.
    </Alert>
  );
}
