-- =====================================================================
-- Sinnapi — 1106a Overpaid invoices & "email it to me": vocabulary
--
-- Two enum values, in a file of their own: Postgres refuses to USE a
-- value added by `alter type … add value` until that transaction commits,
-- and 1106b uses both.
--
--   invoice_status 'overpaid'        receipts on an invoice add up to MORE
--                                    than its total (a client paid extra,
--                                    or paid twice). Stored, not derived,
--                                    so lists and reports can filter on it.
--   document_recipient_kind 'self'   a vendor emailed a document only to
--                                    their own account address.
-- =====================================================================

alter type public.invoice_status add value if not exists 'overpaid' after 'paid';
alter type public.document_recipient_kind add value if not exists 'self';
