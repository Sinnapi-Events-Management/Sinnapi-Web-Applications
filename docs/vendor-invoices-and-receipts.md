# Sinnapi Vendor Invoices & Receipts — Implementation Report

Status: **built and verified locally; not yet deployed.** Migrations, SQL tests, unit
tests, PDF renders and production builds pass (§15). Nothing has been applied to the
develop or production Supabase projects, and the email path has not yet sent a real
email (§16, §17).

Built 2026-11-05 in ten approval-gated phases. Every decision marked _(confirmed)_
was made by the product owner during those phases.

---

## 1. What vendors and clients can now do

**Vendors** (vendor portal → Finance → Invoices & Receipts):

- Create, save and issue **invoices** for a Sinnapi client or anyone else.
- Create an invoice for a **booking**, filled in from its quote; the client pays it
  through Sinnapi escrow and it marks itself paid.
- Record **payments** they received outside Sinnapi as **receipts** — against an
  invoice (partial and repeated payments) or on their own.
- **Download** any issued document as an A4 PDF and **email** it with the PDF
  attached.
- Keep **saved clients** (people not on Sinnapi): saved automatically when first
  invoiced, or added by hand.
- Find documents by tab, status filter (All · Unpaid · Overdue · Paid · Drafts · Void)
  and search; see what is still owed and overdue, per currency.
- **Void** an issued invoice or receipt with a reason; **copy** an invoice into a new
  draft.

**Clients** (client portal → Payments → Invoices & Receipts):

- See every issued invoice and receipt addressed to them, open and download it.
- Pay booking invoices through Sinnapi; receive in-app alerts for new documents.

## 2. Invoice workflow

```
New invoice ──► Draft (no number, editable, deletable)
                   │  Issue (confirm)
                   ▼
                Issued ── receipts ──► Partly paid ──► Paid
                   │                         ▲
                   │ booking invoices: escrow funded ─┘ (full refund → back to Issued)
                   ▼
                 Void (reason required; refused while live receipts exist,
                       or once a booking invoice is paid through Sinnapi)
```

- **Lines:** items (make the subtotal) and extra charges such as transport (added
  after the discount). Quantities may be decimal (2.5 hours).
- **Money:** discount as % or fixed amount; tax **optional**, label and rate typed by
  the vendor, inclusive or exclusive, **no TIN required** _(confirmed)_.
- **Formula** (database is authoritative; the browser mirrors it for the live total):

  ```
  line_total     = round(round(qty,2) × round(unit_price))
  subtotal       = Σ item lines
  discount_total = round(subtotal × rate/100) or round(fixed)
  taxable        = subtotal − discount_total + Σ charge lines
  tax_total      = exclusive: round(taxable × rate/100)
                   inclusive: round(taxable − taxable/(1+rate/100))
  total          = exclusive: taxable + tax_total ; inclusive: taxable
  ```

  `round` is to the currency's minor unit (UGX 0, USD 2) at every step.

- **Dates:** issue date ≤ today (Kampala); due date ≥ issue date; shortcuts On
  receipt / 7 / 14 / 30 days. **Overdue** is derived, never stored.
- **Numbers:** `SNP-INV-` + 8 random digits, assigned at issue, unique across the
  platform, unguessable _(confirmed)_.
- **Issued = fixed.** Corrections are void + new invoice (or "Copy into a new draft").

## 3. Receipt workflow

- A receipt is the vendor's acknowledgement of money **they received outside
  Sinnapi**; the "I confirm I have received this payment" tick is required — Sinnapi
  cannot see that money, so the vendor's confirmation is the payment record.
- **Linked** (Record payment on an invoice): currency and recipient come from the
  invoice; the amount cannot exceed what is still owed; the invoice's status and
  balance update in the same transaction.
- **Standalone** (New receipt): description, date and an optional outstanding balance
  typed by the vendor _(confirmed)_.
- **Never for escrow money** _(confirmed)_: booking invoices refuse receipts — Sinnapi's
  own payment confirmation covers payments through escrow.
- Methods: cash, MTN MoMo, Airtel Money, bank transfer, card, cheque, other; a
  transaction reference is asked for on all but cash.
- Numbers: `SNP-RCT-` + 8 random digits. A double-submitted "Record payment" returns
  the first receipt (idempotency key).
- The PDF prints the amount **in words** ("Two million Uganda shillings").

## 4. Registered and non-registered clients

|                    | Sinnapi client                                                   | Someone else                        |
| ------------------ | ---------------------------------------------------------------- | ----------------------------------- |
| Who qualifies      | Has a quote or booking with the vendor (same rule as messaging)  | Anyone                              |
| Details            | Name from their profile; phone only once the engagement is live  | Typed, or picked from Saved clients |
| Email              | **Never shown to or stored for the vendor**; Sinnapi sends to it | Saved on the contact                |
| Sees it in Sinnapi | Yes, once issued; in-app alert                                   | —                                   |
| Replies            | "Message the vendor in Sinnapi"                                  | Reply-To is the vendor              |

No account is ever created for an external client, and nothing looks an email up
against Sinnapi accounts. Recipient and vendor details are **frozen onto the document
at issue**, so later profile edits never change a past document. Deleting a saved
client keeps the frozen copy on issued documents _(confirmed)_.

## 5. Database changes

Eight migrations, all additive — no existing table, column or enum value changes.

| Table                        | Purpose                                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `vendor_contacts`            | A vendor's saved external clients; one live contact per email per vendor                                                          |
| `vendor_invoices`            | Invoices: recipient snapshot, `vendor_snapshot` jsonb, money columns (`numeric(14,2)`), `balance_due` generated, lifecycle fields |
| `vendor_invoice_items`       | Lines, `kind` item/charge; frozen once the invoice is issued                                                                      |
| `vendor_receipts`            | Receipts: payment fields, `balance_before/after`, `vendor_confirmed_at`, `idempotency_key`                                        |
| `vendor_document_deliveries` | One row per email attempt; registered-client addresses stored masked                                                              |

New enums: `invoice_status`, `receipt_status`, `invoice_payment_channel`
(`vendor_collected` | `sinnapi_escrow`), `invoice_item_kind`, `receipt_payment_method`,
`vendor_contact_source`, `document_delivery_status`, `document_recipient_kind`.

Integrity highlights: unique document numbers; one live invoice per booking;
`amount_paid ≤ total`; paid ⇔ fully paid; void needs a reason; a registered client's
email can never be stored on a row; a trigger refuses any edit to an issued invoice or
receipt except its payment and void fields; receipts cannot be deleted.

Settings and retention: `document_email_daily_limit = 50` (admin-editable);
`financial_documents` retained **10 years** under legal hold _(confirmed)_;
`vendor_contacts` deletable by the vendor.

## 6. Migration files

```
supabase/migrations/20261105000001_financial_document_enums.sql
supabase/migrations/20261105000002_vendor_contacts.sql
supabase/migrations/20261105000003_vendor_invoices.sql
supabase/migrations/20261105000004_vendor_receipts.sql
supabase/migrations/20261105000005_document_deliveries.sql
supabase/migrations/20261105000006_financial_document_rpc.sql
supabase/migrations/20261105000007_financial_document_rls.sql
supabase/migrations/20261105000008_invoice_escrow_sync_and_notifications.sql
```

All are safe to re-apply (guarded `create`s, `drop … if exists`, `on conflict`).

## 7. Security and RLS

| Table           | Vendor (owner) | Registered client | Staff (`payments.read`) |
| --------------- | -------------- | ----------------- | ----------------------- |
| contacts        | read + write   | —                 | —                       |
| invoices, items | read           | read, issued only | read                    |
| receipts        | read           | read              | read                    |
| deliveries      | read           | —                 | read                    |

- **No direct writes** to invoices, items, receipts or deliveries by any client role —
  table privileges revoked **and** no write policies; every write is a
  `SECURITY DEFINER` function that takes the vendor from `current_vendor_id()`,
  never from the request.
- **Storage:** private bucket `financial-documents` (PDF only, 5 MB). A vendor may
  write only `{vendor_id}/{invoice|receipt}/{id}.pdf` for a **real, issued document of
  their own**; clients cannot read the bucket.
- **Inputs:** numbers must be finite plain decimals below one trillion (NaN and
  Infinity are refused); dates validated; text lengths capped.
- **Email:** the send function requires a signed-in user, reads the document through
  the caller's own RLS, then requires the caller to own the issuing vendor; claims are
  rate-limited under a per-vendor lock; double-clicks send once.
- Service-only functions (`begin_/finish_document_delivery`) are not executable by
  signed-in users.

## 8. Backend services and business logic

Functions in `20261105000006` (all `SECURITY DEFINER`, fixed `search_path`):

| Function                                                    | Does                                                                                                                 |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `save_invoice_draft(id, payload)`                           | Create/update a draft; recompute every figure                                                                        |
| `create_invoice_from_booking(booking_id)`                   | Sinnapi-paid draft from the quote (idempotent); refuses quotes that don't add up to the booking amount _(confirmed)_ |
| `issue_invoice(id)`                                         | Number, freeze details, save the contact, notify the client                                                          |
| `void_invoice`, `duplicate_invoice`, `delete_invoice_draft` | Lifecycle                                                                                                            |
| `record_receipt(payload)`                                   | Locks the invoice; refuses escrow, overpayment, wrong currency, future dates                                         |
| `void_receipt(id, reason)`                                  | Restores the invoice balance                                                                                         |
| `vendor_document_summary()`                                 | Outstanding and overdue, per currency                                                                                |
| `begin_/finish_document_delivery`                           | Email bookkeeping (service role only)                                                                                |

`20261105000008` adds a trigger on `escrow_transactions` that marks a booking invoice
paid when escrow is funded (and back to issued on a full refund), plus in-app
notification templates `payment.invoice_issued.client` / `payment.receipt_issued.client`.

## 9. Frontend components and hooks

**Shared kit `@sinnapi/ui/documents`** (and React-free `@sinnapi/ui/documents/core`):
types, `invoicePricing` (formula mirror), money/date formatting, `amountInWords`,
statuses, error copy, row→view mapping, print palette, and the components
`InvoicePreview`, `ReceiptPreview`, `DocumentPaper`, `DocumentStatusChip`,
`DocumentListCard` and their atoms/molecules.

**Vendor portal**

| Route                                         | Page                                              |
| --------------------------------------------- | ------------------------------------------------- |
| `/invoices` (`?tab=receipts`, `?tab=clients`) | `pages/documents` — lists, summary, saved clients |
| `/invoices/new`, `/invoices/:id/edit`         | `pages/invoiceEditor`                             |
| `/invoices/:id`                               | `pages/invoiceDetail`                             |
| `/receipts/new`                               | `pages/receiptEditor`                             |
| `/receipts/:id`                               | `pages/receiptDetail`                             |

Plus `BookingInvoiceCard` on booking detail; shared `components/documents/`
(recipient fields, receipt form, void/record-payment/send/preview dialogs, delivery
history); hooks in `hooks/documentQueries.ts`.

**Client portal:** `/invoices`, `/invoices/:id`, `/receipts/:id`; hooks in
`hooks/documentQueries.ts` (filtered to `client_id = me`, so a dual-role user's own
vendor paperwork never appears); notification links to the new pages.

Every page follows the folder + hook + atomic-design convention; state lives in hooks.

## 10. PDF generation

`@sinnapi/utils/financialPdf` — jsPDF + jspdf-autotable (already in the repo), loaded
on first click so it stays off first paint.

- A4, Helvetica; mirrors the on-screen preview and its palette; always white.
- Vendor logo (WebP/AVIF converted to PNG in the browser; initials if unavailable),
  gold rule and "Generated using Sinnapi — www.sinnapi.com" + "Page X of N" on every
  page; VOID stamp and watermark on voided documents.
- Long invoices: header repeats, rows never split, totals kept together.
- Built from the stored record, never from form state.

## 11. Email integration

`supabase/functions/send-financial-document` over the existing SMTP transport
(`_shared/email.ts` gained optional `attachments` and returns `messageId`).

Flow: browser renders the PDF → uploads it to the private bucket → function re-reads
the record, checks ownership, validates the PDF (magic bytes, size), fingerprints it
(sha256), claims the send (daily cap, idempotency), sends, records sent/failed.
Subjects and amounts come from the database. "Send me a copy" is a separate email,
never a CC.

## 12. Responsive and theme

- Lists are tables on desktop and cards on phones; the editor is two columns on
  desktop, single column with a pinned total/Issue bar on phones; dialogs go full
  screen on small screens.
- App surfaces follow the shared light/warm-dark theme; documents (preview and PDF)
  stay white in both.

## 13. Files

**New:** the 8 migrations; `supabase/tests/1105_financial_documents.test.sql`;
`supabase/functions/send-financial-document/` (index, emails, lib, lib.test);
`packages/ui/src/documents/`; `packages/utils/financialPdf/`; vendor
`components/documents/`, `hooks/documentQueries.ts`, pages `documents`,
`invoiceEditor`, `invoiceDetail`, `receiptEditor`, `receiptDetail`,
`BookingInvoiceCard.tsx`; client `hooks/documentQueries.ts`,
`hooks/useDocumentDownload.ts`, pages `documents`, `invoiceDetail`, `receiptDetail`;
this document.

**Changed:** both portals' `App.tsx` and `lib/config.ts` (routes, menu); vendor
`MoneySection.tsx`; client notification `targets.ts`; `_shared/email.ts`,
`_shared/emailTemplate.ts`; `supabase/config.toml`; `supabase/tests/README.md`;
`package.json`, `turbo.json`, `packages/ui/package.json`,
`packages/utils/package.json`, `yarn.lock`.

## 14. Dependencies

- **Added (dev only):** `vitest@2.1.9` in `@sinnapi/ui` and `@sinnapi/utils`
  _(approved)_; `yarn test` runs it through turbo.
- **No new runtime dependencies.** jsPDF, jspdf-autotable and nodemailer were already
  in use.

## 15. Tests executed

| Suite                                                                                                                                                           | Result |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| All 172 migrations on a fresh Postgres (supabase/postgres 17.6) + new 8 re-applied                                                                              | Pass   |
| `1105_financial_documents.test.sql` — formula, rounding, lock, receipts, isolation, RLS, escrow sync, numbering, email cap, NaN/overflow guards, storage policy | Pass   |
| `0904_payment_attribution`, `0904_payment_trace` (regression)                                                                                                   | Pass   |
| Vitest: pricing mirror, words, money, statuses (23); PDF renders incl. 4-page invoice (6)                                                                       | Pass   |
| Deno: send-function helpers and email content (11)                                                                                                              | Pass   |
| Type-check, lint across all 7 packages                                                                                                                          | Pass   |
| Vendor portal production build (PDF renderer in its own chunk)                                                                                                  | Pass   |

Run them: see `supabase/tests/README.md` for SQL; `yarn test`; `deno test
supabase/functions/send-financial-document/lib.test.ts`.

## 16. Known limitations

- **Not exercised in a browser against a real Supabase project** — no environment has
  the migrations yet; verification so far is the automated suites above.
- **No real email sent yet** — needs the function deployed with SMTP configured.
- Vendor logos in PDFs load only in a real browser (falls back to initials).
- "Message the vendor" opens the messages inbox, not a specific conversation.
- "Create invoice" lives on the booking page; an accepted quote goes through its booking.
- A send that crashes the function before it records an outcome would stay `sending`
  and count toward the daily cap (narrow; normal failures are recorded).
- Document text outside the Latin (Windows-1252) range prints as `?` in PDFs.
- Out of scope by design: recurring invoices, credit notes, multi-tax and per-line
  tax/discount, currency conversion, online payment links for external clients,
  custom templates.
- Pre-existing, not changed: jsPDF already sits in the vendor main bundle (via the
  quotation download); the shared email helper logs recipients in function logs.

## 17. Configuration still required

Function secrets on each project (most already exist for other functions):
`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` (and optional `SMTP_PORT`, `EMAIL_FROM`),
`ALLOWED_ORIGINS` including the portals, optional `CLIENT_PORTAL_URL` for email links.
`document_email_daily_limit` can be changed in platform settings.

## 18. Deployment

The CLI in this repo is **linked to production**. Always name the target.

```sh
# develop: preview, then apply
supabase db push --dry-run --db-url "postgresql://postgres:<PASSWORD>@db.oxrndnpnecrwldbigxek.supabase.co:5432/postgres"
supabase db push           --db-url "postgresql://postgres:<PASSWORD>@db.oxrndnpnecrwldbigxek.supabase.co:5432/postgres"
supabase functions deploy send-financial-document --project-ref oxrndnpnecrwldbigxek
```

Then on develop: issue an invoice to a test client, download it, email it (to a
registered client and to an external address), record a partial and a full payment,
void a receipt, and fund a booking invoice through escrow. If the dry run lists older
migrations as pending, develop's history is behind — resolve that before applying.

Production follows the same steps with production's connection string and
`--project-ref mnecsflrsyackeibixfn`, once develop has passed. Deploy the portals after
the database and function, so no screen calls a function that does not exist yet.
