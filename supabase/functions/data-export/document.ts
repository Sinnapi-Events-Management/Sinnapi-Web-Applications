// Composition of the export PDF: what appears, in what order, under which
// heading. Layout mechanics (pagination, wrapping, tables, footers) belong to
// `_shared/pdf.ts`; nothing here touches a coordinate.
import { PdfBuilder, type PdfMetaEntry, type TableColumn } from '../_shared/pdf.ts';
import { SECTION_LIMIT, type ExportData, type Fetched } from './queries.ts';

const TITLE = 'Personal Data Export';

/** ISO → "12 Aug 2026". Fixed en-GB so the file reads the same wherever it opens. */
function date(value: string | null | undefined): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function dateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return `${date(value)} ${parsed.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function money(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount === null || amount === undefined) return '-';
  return `${currency ?? 'UGX'} ${Number(amount).toLocaleString('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/** `requested_by_admin` → `Requested by admin`. */
function label(value: string | null | undefined): string {
  if (!value) return '-';
  const spaced = value.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function truncateText(value: string | null | undefined, max = 160): string {
  if (!value) return '-';
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
}

/**
 * Render one table section, stating any read failure or cap on the page itself.
 *
 * Centralised so no section can forget to: a table that shows 500 of 900 rows
 * with no note is indistinguishable, to the person holding the file, from a
 * complete record.
 */
function tableSection<T>(
  pdf: PdfBuilder,
  heading: string,
  fetched: Fetched<T>,
  columns: TableColumn[],
  toRow: (row: T) => string[],
  emptyText: string,
): void {
  pdf.section(heading);
  if (fetched.error) {
    pdf.note(`This section could not be read: ${fetched.error}`);
    return;
  }
  if (fetched.rows.length === 0) {
    pdf.empty(emptyText);
    return;
  }
  pdf.table(columns, fetched.rows.map(toRow));
  if (fetched.truncated) {
    pdf.note(
      `Showing the ${SECTION_LIMIT} most recent records. Contact support if you need the full history.`,
    );
  }
}

/**
 * Build the export document.
 *
 * Ordered the way a person reads their own file rather than the way the schema
 * is laid out: who you are, then what you arranged, then what you paid, then
 * what you said, then the security trail. Vendor-only sections are simply
 * absent for a client, rather than present and empty.
 */
export async function buildExportPdf(data: ExportData, generatedAt: Date): Promise<Uint8Array> {
  const pdf = await PdfBuilder.create(TITLE);
  const { profile, vendor } = data;

  const meta: PdfMetaEntry[] = [
    { label: 'Account name', value: profile?.full_name ?? '-' },
    { label: 'Email', value: profile?.email ?? '-' },
    { label: 'Account ID', value: profile?.id ?? '-' },
    { label: 'Roles', value: data.roles.length ? data.roles.map(label).join(', ') : '-' },
    { label: 'Generated', value: dateTime(generatedAt.toISOString()) },
  ];

  pdf.cover({
    title: TITLE,
    subtitle: 'A complete copy of the personal data Sinnapi holds about this account.',
    meta,
  });

  pdf.note(
    'This file was generated at your request under your right of access. It covers the data Sinnapi holds about you as a platform user. Records that name other people — the other side of a booking, for instance — appear only to the extent they are part of your own transaction history.',
  );

  pdf.section('Account profile');
  pdf.keyValues([
    { label: 'Full name', value: profile?.full_name ?? '-' },
    { label: 'Email', value: profile?.email ?? '-' },
    { label: 'Phone', value: profile?.phone ?? '-' },
    { label: 'Account status', value: label(profile?.status) },
    { label: 'Preferred language', value: profile?.locale ?? '-' },
    { label: 'Preferred currency', value: profile?.preferred_currency ?? '-' },
    { label: 'Account created', value: dateTime(profile?.created_at) },
    { label: 'Last sign-in', value: dateTime(profile?.last_login_at) },
  ]);

  if (vendor) {
    pdf.section('Business profile');
    pdf.keyValues([
      { label: 'Business name', value: vendor.business_name },
      { label: 'Public URL slug', value: vendor.slug },
      { label: 'Base city', value: vendor.base_city ?? '-' },
      { label: 'Website', value: vendor.website ?? '-' },
      { label: 'Listing status', value: label(vendor.status) },
      { label: 'Visibility', value: label(vendor.visibility) },
      { label: 'Average rating', value: `${vendor.avg_rating} (${vendor.review_count} reviews)` },
      { label: 'Listed since', value: date(vendor.created_at) },
      { label: 'Biography', value: truncateText(vendor.biography, 600) },
    ]);

    tableSection(
      pdf,
      'Services offered',
      data.services,
      [
        { header: 'Service', weight: 3 },
        { header: 'Description', weight: 4 },
        { header: 'From', weight: 1.6, align: 'right' },
        { header: 'Active', weight: 1 },
      ],
      (s) => [
        s.title,
        truncateText(s.description, 120),
        money(s.base_price, s.currency),
        s.is_active ? 'Yes' : 'No',
      ],
      'No services listed.',
    );
  }

  tableSection(
    pdf,
    'Events',
    data.events,
    [
      { header: 'Title', weight: 3 },
      { header: 'Type', weight: 1.6 },
      { header: 'Date', weight: 1.4 },
      { header: 'Location', weight: 2 },
      { header: 'Status', weight: 1.4 },
    ],
    (e) => [e.title, label(e.event_type), date(e.event_date), e.location ?? '-', label(e.status)],
    'No events posted.',
  );

  tableSection(
    pdf,
    'Bookings',
    data.bookings,
    [
      { header: 'Reference', weight: 1.8 },
      { header: 'Vendor', weight: 2.4 },
      { header: 'Event date', weight: 1.5 },
      { header: 'Status', weight: 1.5 },
      { header: 'Amount', weight: 1.8, align: 'right' },
    ],
    (b) => [
      b.reference_no,
      b.vendors?.business_name ?? '-',
      date(b.event_date),
      label(b.status),
      money(b.amount, b.currency),
    ],
    'No bookings.',
  );

  tableSection(
    pdf,
    'Quotations',
    data.quotations,
    [
      { header: 'Reference', weight: 1.8 },
      { header: 'Vendor', weight: 2.4 },
      { header: 'Requested', weight: 1.5 },
      { header: 'Status', weight: 1.5 },
      { header: 'Total', weight: 1.8, align: 'right' },
    ],
    (q) => [
      q.reference_no,
      q.vendors?.business_name ?? '-',
      date(q.created_at),
      label(q.status),
      money(q.total, q.currency),
    ],
    'No quotations.',
  );

  tableSection(
    pdf,
    'Payments',
    data.payments,
    [
      { header: 'Date', weight: 1.5 },
      { header: 'Purpose', weight: 1.8 },
      { header: 'Method', weight: 1.8 },
      { header: 'Reference', weight: 2 },
      { header: 'Status', weight: 1.3 },
      { header: 'Amount', weight: 1.7, align: 'right' },
    ],
    (p) => [
      date(p.paid_at ?? p.created_at),
      label(p.purpose),
      `${label(p.provider)} / ${label(p.provider_method)}`,
      p.provider_ref ?? '-',
      label(p.status),
      money(p.amount, p.currency),
    ],
    'No payments.',
  );

  if (vendor) {
    tableSection(
      pdf,
      'Payouts',
      data.payouts,
      [
        { header: 'Requested', weight: 1.5 },
        { header: 'Completed', weight: 1.5 },
        { header: 'Reference', weight: 2.2 },
        { header: 'Status', weight: 1.4 },
        { header: 'Amount', weight: 1.7, align: 'right' },
      ],
      (p) => [
        date(p.created_at),
        date(p.completed_at),
        p.provider_ref ?? '-',
        label(p.status),
        money(p.amount, p.currency),
      ],
      'No payouts.',
    );

    tableSection(
      pdf,
      'Subscriptions',
      data.subscriptions,
      [
        { header: 'Plan', weight: 2.2 },
        { header: 'Status', weight: 1.5 },
        { header: 'Period start', weight: 1.6 },
        { header: 'Period end', weight: 1.6 },
        { header: 'Auto-renew', weight: 1.3 },
      ],
      (s) => [
        s.pricing_plans?.name ?? '-',
        label(s.status),
        date(s.current_period_start),
        date(s.current_period_end),
        s.auto_renew ? 'Yes' : 'No',
      ],
      'No subscriptions.',
    );
  }

  tableSection(
    pdf,
    'Reviews you wrote',
    data.reviews,
    [
      { header: 'Date', weight: 1.4 },
      { header: 'Vendor', weight: 2.2 },
      { header: 'Rating', weight: 1 },
      { header: 'Review', weight: 4 },
    ],
    (r) => [
      date(r.created_at),
      r.vendors?.business_name ?? '-',
      `${r.rating}/5`,
      truncateText([r.title, r.body].filter(Boolean).join(' - '), 180),
    ],
    'No reviews written.',
  );

  tableSection(
    pdf,
    'Messages',
    data.messages,
    [
      { header: 'Date', weight: 1.6 },
      { header: 'Conversation', weight: 2 },
      { header: 'From', weight: 1.2 },
      { header: 'Message', weight: 5 },
    ],
    (m) => [
      dateTime(m.created_at),
      m.conversations?.subject ?? label(m.conversations?.type),
      m.sender_id === data.profile?.id ? 'You' : 'Them',
      m.is_system ? '(system message)' : truncateText(m.body, 200),
    ],
    'No messages.',
  );

  tableSection(
    pdf,
    'Notifications',
    data.notifications,
    [
      { header: 'Date', weight: 1.6 },
      { header: 'Title', weight: 2.6 },
      { header: 'Detail', weight: 4 },
      { header: 'Read', weight: 1.2 },
    ],
    (n) => [
      dateTime(n.created_at),
      n.title,
      truncateText(n.body, 140),
      n.read_at ? date(n.read_at) : 'Unread',
    ],
    'No notifications.',
  );

  tableSection(
    pdf,
    'Sign-in history',
    data.logins,
    [
      { header: 'When', weight: 2 },
      { header: 'IP address', weight: 1.8 },
      { header: 'Device', weight: 4 },
      { header: 'Outcome', weight: 1.4 },
    ],
    (l) => [
      dateTime(l.occurred_at),
      l.ip_address ?? '-',
      truncateText(l.user_agent, 90),
      `${l.success ? 'Success' : 'Failed'}${l.is_new_device ? ' (new device)' : ''}`,
    ],
    'No sign-in history recorded.',
  );

  tableSection(
    pdf,
    'Data deletion requests',
    data.erasures,
    [
      { header: 'Requested', weight: 1.6 },
      { header: 'Status', weight: 1.8 },
      { header: 'Reason given', weight: 5 },
    ],
    (e) => [date(e.created_at), label(e.status), truncateText(e.notes, 200)],
    'No deletion requests.',
  );

  pdf.section('About this export');
  pdf.note(
    'Amounts are shown in the currency each record was transacted in and are not converted. Times are shown in UTC. Text in scripts outside the Latin alphabet may appear as "?" because of the font used to typeset this document; if that affects your records, contact support for a plain-text copy.',
  );
  pdf.note(
    'Some records cannot be erased on request because we are required to keep them — financial and tax records in particular. Your rights, and those limits, are set out in the Privacy Policy.',
  );

  return await pdf.finish(
    `${TITLE} - ${profile?.email ?? profile?.id ?? 'account'} - generated ${date(
      generatedAt.toISOString(),
    )}`,
  );
}

/** `sinnapi-data-export-2026-08-12.pdf` — sortable, and obvious in a downloads folder. */
export function exportFileName(generatedAt: Date): string {
  return `sinnapi-data-export-${generatedAt.toISOString().slice(0, 10)}.pdf`;
}
