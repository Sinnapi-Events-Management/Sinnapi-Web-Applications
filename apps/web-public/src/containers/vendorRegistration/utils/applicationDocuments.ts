import type { RegistrationValues } from '../data/schema';

/**
 * A verification document, named by the `application-intake` folder it lives in.
 *
 * The folder name is a contract written in four places: the browser uploads to
 * it, `isIntakeDocumentPath()` in the `vendor-application` function re-derives
 * it, the `intake_upload` storage policy matches on it, and the admin portal
 * signs a URL from the stored path. Spelling it once here is the point — the
 * certificate went missing precisely because one side of that contract knew
 * about a document the other did not.
 */
export type IntakeDocumentKind = 'national-id' | 'business-registration';

export type IntakeDocument = { kind: IntakeDocumentKind; file: File };

/** Storage paths of the documents uploaded for one submission, by folder. */
export type IntakeDocumentPaths = Partial<Record<IntakeDocumentKind, string>>;

const MAX_STORED_NAME = 80;

/**
 * RFC 4122 v4.
 *
 * `crypto.randomUUID` exists only in a secure context, and the endpoint
 * validates `submissionRef` against a UUID pattern — so the fallback has to be
 * a real UUID too, not merely unique. A timestamp fallback would have been
 * refused as `missing_or_invalid:submissionRef` on plain http.
 */
export function uuid(): string {
  const webCrypto = globalThis.crypto;
  if (webCrypto?.randomUUID) return webCrypto.randomUUID();

  const bytes = new Uint8Array(16);
  if (webCrypto?.getRandomValues) webCrypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10x
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Where a document is stored: `{submissionRef}/{kind}/{uuid}-{safe name}`.
 *
 * The name is reduced to the characters the storage policy and the endpoint's
 * path check both accept, keeping the tail so the extension survives — the
 * extension is the only part of the name either of them reads.
 */
export function documentPath(submissionRef: string, kind: IntakeDocumentKind, file: File): string {
  const safeName = file.name.replace(/[^\w.-]+/g, '-').slice(-MAX_STORED_NAME);
  return `${submissionRef}/${kind}/${uuid()}-${safeName}`;
}

/**
 * The mime type to store the object under.
 *
 * Only worth sending because the bucket allows a narrow list and the endpoint
 * reads the STORED type back before it accepts the application; a browser that
 * reports no type at all would otherwise upload as `application/octet-stream`
 * and have a perfectly good PDF refused.
 */
export function contentType(file: File): string {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.png')) return 'image/png';
  return 'image/jpeg';
}

/**
 * The documents THIS application has to carry.
 *
 * Derived from the applicant type rather than from "whichever files happen to
 * be set", so the list the form uploads is the same list it later checks the
 * endpoint's receipt against. An individual never sends a certificate even if
 * one is left in state from before they switched type.
 */
export function applicationDocuments(values: RegistrationValues): IntakeDocument[] {
  const documents: IntakeDocument[] = [];
  if (values.nationalIdFile) {
    documents.push({ kind: 'national-id', file: values.nationalIdFile });
  }
  if (values.applicantType === 'registered_business' && values.businessRegistrationFile) {
    documents.push({ kind: 'business-registration', file: values.businessRegistrationFile });
  }
  return documents;
}

/**
 * Which of the documents we uploaded the endpoint did not record on the
 * application row.
 *
 * An endpoint that reports nothing at all is the case worth separating out, and
 * it is not "an application without documents": it is an endpoint older than
 * this form, which accepts the paths and drops the ones it has never heard of.
 * That is how a certificate of incorporation reached storage and still read
 * "Not provided" to the reviewer, so a missing receipt counts every document as
 * unrecorded rather than none.
 */
export function unrecordedDocuments(
  sent: IntakeDocumentKind[],
  stored: IntakeDocumentKind[] | undefined,
): IntakeDocumentKind[] {
  if (!Array.isArray(stored)) return sent;
  return sent.filter((kind) => !stored.includes(kind));
}
