'use client';
import { Alert, Button, CircularProgress, Snackbar, Stack } from '@mui/material';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import GavelIcon from '@mui/icons-material/Gavel';
import { Link as RouterLink } from 'react-router-dom';
import { SectionCard } from '../../organisms/SectionCard';
import { SettingsRow } from '../molecules/SettingsRow';
import { SettingsRowGroup } from '../molecules/SettingsRowGroup';
import { DeletionRequestStatusNote } from '../molecules/DeletionRequestStatusNote';
import { isDeletionRequestOpen } from '../schema/deletionRequest';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useDisclosure } from '../hooks/useDisclosure';
import { RequestDeletionDialog } from './RequestDeletionDialog';
import type { DeletionRequestSummary, ExportDataHandler, RequestDeletionHandler } from '../types';

export type PrivacyDataSectionProps = {
  onExport: ExportDataHandler;
  onRequestDeletion: RequestDeletionHandler;
  /** The user's latest erasure request, if any. `undefined` while still loading. */
  deletionRequest?: DeletionRequestSummary | null;
  /** True while the existing request is being read. */
  loadingDeletionRequest?: boolean;
  /** Router path to this portal's privacy policy page. */
  privacyPolicyTo: string;
  /** What this portal must retain regardless, in its own terms. */
  retentionNote: string;
  formatDate: (iso: string) => string;
};

/**
 * The privacy card: take your data with you, ask for it to be erased, and read
 * the policy that governs both.
 *
 * All three used to be buttons with no handler. The export and the erasure
 * request now do real work through the portal-supplied callbacks; the policy
 * link stays a router link, which is what it always was.
 */
export function PrivacyDataSection({
  onExport,
  onRequestDeletion,
  deletionRequest,
  loadingDeletionRequest = false,
  privacyPolicyTo,
  retentionNote,
  formatDate,
}: PrivacyDataSectionProps) {
  const exportAction = useAsyncAction(onExport);
  const deletionDialog = useDisclosure();

  const openRequest =
    deletionRequest && isDeletionRequestOpen(deletionRequest.status) ? deletionRequest : null;

  return (
    <>
      <SectionCard title="Privacy & data" icon={<PrivacyTipIcon />} accent="secondary">
        <Stack spacing={2.5}>
          {exportAction.error && (
            <Alert severity="error" onClose={exportAction.reset}>
              {exportAction.error}
            </Alert>
          )}

          <SettingsRowGroup>
            <SettingsRow
              title="Export my data"
              description="Download a PDF of everything held against your account — your profile, bookings, quotations, payments and correspondence."
              action={
                <Button
                  variant="outlined"
                  startIcon={
                    exportAction.busy ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <DownloadIcon />
                    )
                  }
                  onClick={() => exportAction.run()}
                  disabled={exportAction.busy}
                >
                  {exportAction.busy ? 'Preparing…' : 'Export my data'}
                </Button>
              }
            />

            <SettingsRow
              title="Request data deletion"
              description={retentionNote}
              action={
                openRequest || loadingDeletionRequest ? undefined : (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={deletionDialog.show}
                  >
                    Request deletion
                  </Button>
                )
              }
            >
              {openRequest && (
                <DeletionRequestStatusNote request={openRequest} formatDate={formatDate} />
              )}
            </SettingsRow>

            <SettingsRow
              title="Privacy Policy"
              description="How we collect, use, share and retain your personal data."
              action={
                <Button
                  component={RouterLink}
                  to={privacyPolicyTo}
                  variant="text"
                  color="primary"
                  startIcon={<GavelIcon />}
                >
                  View Privacy Policy
                </Button>
              }
            />
          </SettingsRowGroup>
        </Stack>
      </SectionCard>

      <RequestDeletionDialog
        open={deletionDialog.open}
        onClose={deletionDialog.hide}
        onSubmit={onRequestDeletion}
        retentionNote={retentionNote}
      />

      <Snackbar
        open={exportAction.done}
        autoHideDuration={5000}
        onClose={exportAction.reset}
        message="Your data export has been downloaded"
      />
    </>
  );
}
