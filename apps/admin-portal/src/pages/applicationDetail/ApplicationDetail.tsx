import { Suspense, lazy } from 'react';
import { Grid, Stack, Alert } from '@sinnapi/ui';
import QueryState from '@/components/ui/QueryState';
import EmptyState from '@/components/ui/EmptyState';
import { useApplicationDetail } from './hooks/useApplicationDetail';

// react-pdf / pdfjs is heavy — only load it when a document is actually opened.
const DocumentPreviewDialog = lazy(() => import('@/components/ui/DocumentPreviewDialog'));
import ApplicationHero from './components/ApplicationHero';
import DetailsSection from './components/DetailsSection';
import ServicesSection from './components/ServicesSection';
import ReferencesSection from './components/ReferencesSection';
import NotesSection from './components/NotesSection';
import WorkflowSection from './components/WorkflowSection';
import DocumentsSection from './components/DocumentsSection';
import PayoutSection from './components/PayoutSection';
import LinksSection from './components/LinksSection';
import RejectDialog from './components/RejectDialog';

export default function ApplicationDetail() {
  const {
    intake: a,
    isLoading,
    error,
    has,
    busy,
    err,
    rejectOpen,
    setRejectOpen,
    markReviewing,
    reject,
    promote,
    openDoc,
    preview,
    previewLoading,
    closePreview,
  } = useApplicationDetail();

  return (
    <QueryState isLoading={isLoading} error={error}>
      {!a ? (
        <EmptyState title="Application not found" ctaLabel="Back" ctaHref="/applications" />
      ) : (
        <>
          <ApplicationHero a={a} />

          {err && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {err}
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Stack spacing={3}>
                <DetailsSection a={a} />
                <ServicesSection a={a} />
                <ReferencesSection referees={a.referees ?? []} />
                <NotesSection notes={a.review_notes} />
              </Stack>
            </Grid>

            <Grid item xs={12} md={4}>
              <Stack spacing={3}>
                <WorkflowSection
                  status={a.status}
                  has={has}
                  busy={busy}
                  onMarkReviewing={markReviewing}
                  onPromote={promote}
                  onReject={() => setRejectOpen(true)}
                />
                <DocumentsSection
                  nationalIdPath={a.national_id_path}
                  proofOfWorkPath={a.proof_of_work_path}
                  onOpen={openDoc}
                />
                <PayoutSection a={a} />
                <LinksSection a={a} />
              </Stack>
            </Grid>
          </Grid>

          <RejectDialog
            open={rejectOpen}
            busy={busy}
            onClose={() => setRejectOpen(false)}
            onSubmit={reject}
          />

          {preview && (
            <Suspense fallback={null}>
              <DocumentPreviewDialog
                doc={preview}
                loading={previewLoading}
                onClose={closePreview}
              />
            </Suspense>
          )}
        </>
      )}
    </QueryState>
  );
}
