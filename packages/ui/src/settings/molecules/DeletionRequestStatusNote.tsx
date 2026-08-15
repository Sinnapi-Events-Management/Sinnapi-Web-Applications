'use client';
import { Alert, AlertTitle, Typography } from '@mui/material';
import { DELETION_STATUS_COPY } from '../schema/deletionRequest';
import type { DeletionRequestSummary } from '../types';

export type DeletionRequestStatusNoteProps = {
  request: DeletionRequestSummary;
  /** Portal-supplied date formatting, so the note matches the rest of the app. */
  formatDate: (iso: string) => string;
};

/**
 * Where an erasure request has got to, in the subject's own terms.
 *
 * Replaces the request button while a request is open, rather than sitting
 * alongside it: the honest answer to "can I delete my data" once you already
 * asked is "you did, here is what happened to it", not a button that would file
 * a duplicate.
 */
export function DeletionRequestStatusNote({ request, formatDate }: DeletionRequestStatusNoteProps) {
  const { label, detail, accent } = DELETION_STATUS_COPY[request.status];

  return (
    <Alert severity={accent} variant="outlined" sx={{ borderRadius: 2 }}>
      <AlertTitle sx={{ mb: 0.25 }}>{label}</AlertTitle>
      <Typography variant="body2" color="text.secondary">
        {detail}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
        Requested {formatDate(request.createdAt)}
      </Typography>
    </Alert>
  );
}
