/**
 * The document a quotation PDF is rendered from.
 *
 * Assembled by the caller rather than read off one row: a quotation carries its
 * own money and lines, but the two party names and the event title live
 * elsewhere on the booking, and a renderer that went looking for them would
 * need a Supabase client and stop being a pure function.
 *
 * The fields below the required block are optional because the three callers do
 * not all hold them. `get_event_quotation`, which the admin console downloads
 * from, returns neither the advance terms nor the version number; the two
 * portals read the quotation row itself and have all of it. Optional rather
 * than nullable is deliberate — it lets the admin's own `QuotationDocument`
 * satisfy this type structurally, with no mapping layer at the call site, and
 * each section simply omits itself when its data never arrived.
 */
export type QuotationPdfItem = {
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
  line_total: number | null;
};

export type QuotationPdfDocument = {
  id: string;
  reference_no: string | null;
  status: string;
  currency: string | null;
  subtotal: number | null;
  discount_total: number | null;
  tax_total: number | null;
  total: number | null;
  valid_until: string | null;
  sent_at: string | null;
  created_at: string | null;
  vendor_name: string | null;
  client_name: string | null;
  event_title: string | null;
  items: QuotationPdfItem[];

  /** What the client asked for, quoted back to them as the scope of the offer. */
  request_details?: string | null;
  /** Shown beside the reference once a quote has been revised at least once. */
  version_no?: number | null;
  /** Share of the total released to the vendor before the event, as a fraction. */
  advance_rate?: number | null;
  /** How many days before the event date that advance is released. */
  advance_release_days_before?: number | null;
  /** The vendor's own wording on the advance, when they supplied any. */
  advance_terms_note?: string | null;
};
