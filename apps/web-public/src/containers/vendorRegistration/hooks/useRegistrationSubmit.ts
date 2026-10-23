'use client';
import { useMemo, useRef, useState } from 'react';
import { useCaptcha } from '@sinnapi/ui/forms';
import { createBrowserClient } from '@/lib/supabase/browser';
import type { RegistrationValues } from '../data/schema';
import type { FailureReason } from '../data/options';
import { toApplicationPayload } from '../utils/toApplicationPayload';
import {
  applicationDocuments,
  contentType,
  documentPath,
  unrecordedDocuments,
  uuid,
  type IntakeDocumentKind,
  type IntakeDocumentPaths,
} from '../utils/applicationDocuments';

/**
 * What `vendor-application` answers with.
 *
 * `storedDocuments` is a receipt read back off the inserted row — the folders
 * of the documents the endpoint actually persisted, not an echo of what we
 * sent. It is optional because an endpoint deployed before this form existed
 * does not send it, and that absence is exactly what the check below reports.
 */
type ApplicationResult = {
  id: string;
  duplicate?: boolean;
  storedDocuments?: IntakeDocumentKind[];
};

/** Sends a validated application: the Turnstile challenge, the request and its outcome. */
export function useRegistrationSubmit() {
  const supa = useMemo(() => createBrowserClient(), []);
  // One per page view. The server answers a repeated ref with the row it
  // already has, so a double submit files one application, not two.
  const submissionRef = useRef<string>(uuid());
  const uploadedFiles = useRef(new WeakMap<File, { path: string; uploaded: boolean }>());
  const captcha = useCaptcha();

  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [failure, setFailure] = useState<FailureReason>('generic');
  const [submitted, setSubmitted] = useState(false);

  function fail(reason: FailureReason) {
    setFailure(reason);
    setStatus('error');
  }

  async function send(values: RegistrationValues) {
    if (!supa) return fail('generic');
    if (!captcha.token) return fail('captcha');

    setStatus('submitting');

    /**
     * Upload one document, once. A retry after a refused submission re-sends
     * the same `File` object, and the bucket takes no overwrites, so the path
     * and its outcome are remembered per file rather than per attempt.
     */
    async function upload(kind: IntakeDocumentKind, file: File): Promise<string> {
      let item = uploadedFiles.current.get(file);
      if (!item) {
        item = { path: documentPath(submissionRef.current, kind, file), uploaded: false };
        uploadedFiles.current.set(file, item);
      }
      if (!item.uploaded) {
        // `contentType` is the only file fact worth sending: storage records the
        // stored object's own size and mime type, and the application endpoint
        // reads those back before it accepts the submission. A `metadata` option
        // here would land in `user_metadata` — caller-supplied, and read by
        // nobody.
        const { error } = await supa!.storage.from('application-intake').upload(item.path, file, {
          contentType: contentType(file),
          upsert: false,
        });
        if (error) {
          uploadedFiles.current.delete(file);
          throw error;
        }
        item.uploaded = true;
      }
      return item.path;
    }

    // Every document this applicant owes, uploaded before the application is
    // filed: the endpoint verifies each stored object before it accepts the
    // submission, so a file that did not land must stop the whole thing rather
    // than file an application the reviewer cannot act on.
    const documents = applicationDocuments(values);
    let paths: IntakeDocumentPaths;
    try {
      const uploads = await Promise.all(
        documents.map(async ({ kind, file }) => [kind, await upload(kind, file)] as const),
      );
      paths = Object.fromEntries(uploads) as IntakeDocumentPaths;
    } catch {
      fail('generic');
      return;
    }

    const { data, error } = await supa.functions.invoke<ApplicationResult>('vendor-application', {
      body: toApplicationPayload(values, captcha.token, submissionRef.current, paths),
    });
    if (error) {
      // 403 is the endpoint refusing the Turnstile token. 409 is the duplicate
      // guard: this email is already an approved vendor, so there is nothing to
      // retry and the copy has to say so rather than invite another submit.
      // Everything else is a validation or transport failure — generic copy.
      const httpStatus = (error as { context?: Response }).context?.status;
      if (httpStatus === 403) fail('captcha');
      else if (httpStatus === 409) fail('alreadyApplied');
      else fail('generic');
      // Spent on the refused submission either way — the form is still on
      // screen, so the retry needs its own challenge.
      captcha.reset();
      return;
    }

    // The application is filed and the applicant is told so — a document the
    // endpoint failed to record is not theirs to fix and not worth refusing a
    // submission over. It is ours: the file is sitting in the private bucket
    // under this ref, and only the path is missing. So say it where the people
    // who can act on it will see it, with the ref needed to recover the file.
    const unrecorded = unrecordedDocuments(
      documents.map((d) => d.kind),
      data?.storedDocuments,
    );
    if (unrecorded.length > 0) {
      console.error(
        '[vendor-application] uploaded but NOT recorded on the application:',
        unrecorded.join(', '),
        `— submissionRef ${submissionRef.current}.`,
        'The files are in the application-intake bucket under that ref; the endpoint stored no',
        'path for them, so a reviewer will see "Not provided". The usual cause is a deployed',
        'vendor-application function older than this form.',
      );
    }

    setStatus('idle');
    setSubmitted(true);
  }

  return {
    captcha,
    submitting: status === 'submitting',
    submitFailed: status === 'error',
    failure,
    submitted,
    send,
  };
}
