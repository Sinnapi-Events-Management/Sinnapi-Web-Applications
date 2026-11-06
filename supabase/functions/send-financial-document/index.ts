// send-financial-document — user-invoked (the vendor). Emails an issued
// invoice or receipt to its recipient with the PDF attached.
//
// THE FLOW
//   1. Read the document through the CALLER's own RLS. That proves the
//      caller can see it, and nothing more: a registered client can read
//      their own invoice too, so step 2 is not optional.
//   2. Require that the caller owns the vendor that issued it.
//   3. Work out the recipient. A registered client's address is read from
//      `profiles` with the service role and never returned, logged into the
//      history, or shown to the vendor — only a masked form is recorded
//      (vendors are not shown client emails, 20261031000001).
//   4. Fetch the PDF the browser rendered and uploaded to the private
//      `financial-documents` bucket; refuse anything that is not a PDF or
//      is too large; fingerprint it (sha256) for the history.
//   5. Claim the send with `begin_document_delivery`, which enforces the
//      daily cap and turns a double-click into a no-op.
//   6. Send, then record the outcome with `finish_document_delivery`.
//
// The subject, amounts and dates come from the DATABASE row, never from
// the PDF, so the email always states the record.
//
// Optional env:
//   CLIENT_PORTAL_URL — links for registered clients; falls back to PUBLIC_SITE_URL.
import { handler, json } from '../_shared/http.ts';
import { adminClient, userClient, requireUser, HttpError } from '../_shared/supabase.ts';
import { sendEmail, PUBLIC_SITE_URL } from '../_shared/email.ts';
import { documentEmail } from './emails.ts';
import {
  MAX_PDF_BYTES,
  attachmentName,
  formatDate,
  formatMoney,
  isPdf,
  maskEmail,
  parseSendRequest,
  rpcHttpError,
  sha256Hex,
  toBase64,
} from './lib.ts';

const CLIENT_PORTAL_URL = (Deno.env.get('CLIENT_PORTAL_URL') ?? PUBLIC_SITE_URL).replace(/\/$/, '');
const BUCKET = 'financial-documents';

type DocumentRow = {
  id: string;
  vendor_id: string;
  document_no: string | null;
  status: string;
  client_id: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  currency: string;
  // invoices
  title?: string | null;
  balance_due?: number | string;
  due_date?: string;
  payment_channel?: string;
  booking_id?: string | null;
  // receipts
  amount?: number | string;
  payment_date?: string;
  description?: string;
  balance_after?: number | string | null;
};

const INVOICE_COLUMNS =
  'id, vendor_id, document_no, status, client_id, recipient_name, recipient_email, currency, ' +
  'title, balance_due, due_date, payment_channel, booking_id';
const RECEIPT_COLUMNS =
  'id, vendor_id, document_no, status, client_id, recipient_name, recipient_email, currency, ' +
  'amount, payment_date, description, balance_after';

Deno.serve(
  handler(async (req) => {
    if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed');

    const callerId = await requireUser(req);
    const body = parseSendRequest(await req.json().catch(() => null));
    const db = userClient(req);
    const admin = adminClient();

    // ---------- 1. the document, as the caller sees it ----------
    const { data: docData, error: docError } = await db
      .from(body.kind === 'invoice' ? 'vendor_invoices' : 'vendor_receipts')
      .select(body.kind === 'invoice' ? INVOICE_COLUMNS : RECEIPT_COLUMNS)
      .eq('id', body.id)
      .maybeSingle();
    if (docError) throw new HttpError(500, 'document_lookup_failed');
    if (!docData) throw new HttpError(404, 'not_found: document not found');
    const doc = docData as unknown as DocumentRow;

    // ---------- 2. only the issuing vendor may send it ----------
    const { data: vendor } = await admin
      .from('vendors')
      .select('id, owner_id, business_name')
      .eq('id', doc.vendor_id)
      .maybeSingle();
    if (!vendor || vendor.owner_id !== callerId) throw new HttpError(403, 'forbidden');
    if (doc.status === 'draft' || doc.status === 'void' || !doc.document_no) {
      throw new HttpError(409, 'document_not_sendable: only an issued document can be emailed');
    }

    const { data: owner } = await admin
      .from('profiles')
      .select('email')
      .eq('id', callerId)
      .maybeSingle();
    const vendorEmail: string | null = owner?.email ?? null;

    // ---------- 3. the recipient ----------
    let toAddress: string;
    let recipientKind: 'client_account' | 'address';
    let recipientDisplay: string;

    const wantsAccount =
      body.to === 'client_account' || (body.to === null && doc.client_id !== null);
    if (wantsAccount) {
      if (!doc.client_id) {
        throw new HttpError(400, 'invalid_recipient: this document is not for a Sinnapi client');
      }
      const { data: client } = await admin
        .from('profiles')
        .select('email')
        .eq('id', doc.client_id)
        .maybeSingle();
      if (!client?.email)
        throw new HttpError(422, 'recipient_unreachable: this client has no email on Sinnapi');
      toAddress = client.email;
      recipientKind = 'client_account';
      recipientDisplay = maskEmail(client.email);
    } else {
      const address = body.to ?? doc.recipient_email;
      if (!address) {
        throw new HttpError(422, 'recipient_email_required: add an email address for this client');
      }
      toAddress = address;
      recipientKind = 'address';
      recipientDisplay = address;
    }

    // ---------- 4. the PDF ----------
    const attachmentPath = `${doc.vendor_id}/${body.kind}/${doc.id}.pdf`;
    const { data: file, error: fileError } = await admin.storage
      .from(BUCKET)
      .download(attachmentPath);
    if (fileError || !file) {
      throw new HttpError(409, 'attachment_missing: the PDF was not generated yet — try again');
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength > MAX_PDF_BYTES || !isPdf(bytes)) {
      throw new HttpError(422, 'attachment_invalid: the stored file is not a valid PDF');
    }
    const sha256 = await sha256Hex(bytes);

    // ---------- the message, from the record ----------
    const { data: currency } = await admin
      .from('currencies')
      .select('minor_unit')
      .eq('code', doc.currency)
      .maybeSingle();
    const minor = currency?.minor_unit ?? 2;

    const isInvoice = body.kind === 'invoice';
    const isRegistered = doc.client_id !== null;
    const payThroughSinnapiUrl =
      isInvoice &&
      doc.payment_channel === 'sinnapi_escrow' &&
      doc.booking_id &&
      doc.status !== 'paid'
        ? `${CLIENT_PORTAL_URL}/bookings/${doc.booking_id}`
        : null;

    const content = (isVendorCopy: boolean) =>
      documentEmail({
        kind: body.kind,
        businessName: vendor.business_name,
        recipientName: doc.recipient_name ?? 'there',
        documentNo: doc.document_no!,
        amount: formatMoney(isInvoice ? doc.balance_due! : doc.amount!, doc.currency, minor),
        date: formatDate(isInvoice ? doc.due_date! : doc.payment_date!),
        balance:
          !isInvoice && doc.balance_after !== null && doc.balance_after !== undefined
            ? formatMoney(doc.balance_after, doc.currency, minor)
            : null,
        title: isInvoice ? (doc.title ?? null) : (doc.description ?? null),
        vendorMessage: body.message,
        portal: isRegistered
          ? {
              documentUrl: `${CLIENT_PORTAL_URL}/${isInvoice ? 'invoices' : 'receipts'}/${doc.id}`,
              messagesUrl: `${CLIENT_PORTAL_URL}/messages`,
            }
          : null,
        payThroughSinnapiUrl,
        isVendorCopy,
      });

    const message = content(false);

    // ---------- 5. claim the send ----------
    const { data: claimRows, error: claimError } = await admin.rpc('begin_document_delivery', {
      p_vendor_id: doc.vendor_id,
      p_kind: body.kind,
      p_document_id: doc.id,
      p_recipient_kind: recipientKind,
      p_recipient_display: recipientDisplay,
      p_cc_self: body.ccSelf,
      p_subject: message.subject,
      p_message: body.message,
      p_attachment_path: attachmentPath,
      p_attachment_sha256: sha256,
      p_request_key: body.requestKey,
      p_requested_by: callerId,
    });
    if (claimError) throw rpcHttpError(claimError.message);
    const claim = (Array.isArray(claimRows) ? claimRows[0] : claimRows) as {
      delivery_id: string;
      duplicate: boolean;
      delivery_status: string;
    };
    if (claim.duplicate) {
      return json(req, {
        deliveryId: claim.delivery_id,
        status: claim.delivery_status,
        recipient: recipientDisplay,
        duplicate: true,
      });
    }

    // ---------- 6. send, then record ----------
    const attachment = {
      filename: attachmentName(body.kind, doc.document_no),
      contentBase64: toBase64(bytes),
      contentType: 'application/pdf',
    };

    // Whatever happens from here on, the claimed row is closed as sent or
    // failed: a row left at `sending` would count against the daily limit
    // for a send that never went.
    let result: { sent: boolean; error?: string; messageId?: string };
    try {
      result = await sendEmail({
        to: toAddress,
        ...message,
        // External clients reply straight to the vendor; registered clients use Sinnapi messages.
        ...(!isRegistered && vendorEmail ? { replyTo: vendorEmail } : {}),
        attachments: [attachment],
      });

      // The vendor's own copy is a SEPARATE message, never a CC: a CC header
      // would show the vendor the registered client's address.
      if (result.sent && body.ccSelf && vendorEmail) {
        const copy = await sendEmail({
          to: vendorEmail,
          ...content(true),
          attachments: [attachment],
        });
        if (!copy.sent) {
          console.error(
            JSON.stringify({
              level: 'warn',
              message: 'vendor_copy_failed',
              delivery: claim.delivery_id,
            }),
          );
        }
      }
    } catch (e) {
      result = { sent: false, error: e instanceof Error ? e.message : 'Unexpected error' };
    }

    const { error: finishError } = await admin.rpc('finish_document_delivery', {
      p_delivery_id: claim.delivery_id,
      p_sent: result.sent,
      p_error: result.sent ? null : (result.error ?? 'Unknown error'),
      p_provider_message_id: result.messageId ?? null,
    });
    if (finishError) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'finish_document_delivery_failed',
          delivery: claim.delivery_id,
        }),
      );
    }

    if (!result.sent) {
      return json(
        req,
        {
          error: 'email_failed: the email could not be sent — try again shortly',
          deliveryId: claim.delivery_id,
        },
        502,
      );
    }

    return json(req, {
      deliveryId: claim.delivery_id,
      status: 'sent',
      recipient: recipientDisplay,
    });
  }),
);
