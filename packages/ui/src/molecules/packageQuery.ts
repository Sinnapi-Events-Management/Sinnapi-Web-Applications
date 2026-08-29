/**
 * The columns a published package is read with, defined once.
 *
 * Three apps read the same rows — the client portal, the console and the
 * marketing site — each through its own Supabase client, because the portals
 * share a project but not a session. What they must not have is three column
 * lists: a field added to the public card in one app and forgotten in the
 * other two renders as blank there, and nothing about that failure looks like
 * a missing column at the call site.
 *
 * Pure string data, no client and no React, for the same reason
 * `packagePricing` is pure: it has to be importable from a Next.js server
 * component and from a Vite SPA alike.
 *
 * The nested `quote_template_items` under the header is scoped by the CALLER
 * with `.is('quote_template_items.tier_id', null)` — those are the add-ons
 * offered across every tier. Without that filter the same rows arrive twice,
 * once here and once under their tier, and every tier's total is computed over
 * a list that includes the other tiers' lines. `packageAddOns` filters
 * defensively for exactly this reason, but the read should not be sending the
 * rows in the first place.
 */
const PACKAGE_LINE_COLUMNS =
  'id,tier_id,description,quantity,unit_price,unit_label,notes,is_optional,sort_order';

/** A published package with its tiers, its lines and its shared add-ons. */
export const PACKAGE_PUBLIC_COLUMNS =
  'id,vendor_id,name,summary,notes,currency,cover_image_url,vendor_service_id,category_id,' +
  'pricing_model,inclusions,exclusions,lead_time_days,tax_rate,tax_inclusive,valid_days,advance_rate,' +
  'advance_release_days_before,advance_terms_note,visibility,is_active,published_at,sort_order,' +
  `quote_template_tiers(id,name,description,is_recommended,discount_rate,sort_order,quote_template_items(${PACKAGE_LINE_COLUMNS})),` +
  `quote_template_items(${PACKAGE_LINE_COLUMNS})`;

/**
 * The same, plus the moderation columns.
 *
 * Only the console and the owning vendor may read these — the read policies
 * see to that — but the column list has to name them or an operator's page
 * cannot tell a draft from a take-down.
 */
export const PACKAGE_ADMIN_COLUMNS = `${PACKAGE_PUBLIC_COLUMNS},admin_unpublished_at,admin_unpublished_reason,admin_unpublished_by`;
