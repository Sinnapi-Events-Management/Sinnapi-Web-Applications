import { rpcErrorMessage } from '@sinnapi/ui';

/**
 * What a failed service write means, in words the vendor can act on.
 *
 * The entry that matters most is the first one. `category_id` has been
 * `not null` on `vendor_services` since 0004 and the create form never sent
 * one, so every attempt came back as
 *
 *   null value in column "category_id" of relation "vendor_services"
 *   violates not-null constraint
 *
 * — a sentence about a column the vendor has never seen, naming a table they
 * do not know exists. The form now sends a category and the database defaults
 * one when it is missing, so this should be unreachable; it is mapped anyway,
 * because the version of this message a vendor actually reads should never
 * again be Postgres's.
 */
const SERVICE_ERRORS: Record<string, string> = {
  // Raised by `tg_vendor_services_default_category` when the vendor has no
  // primary category to fall back on either.
  service_category_required:
    'Choose a category for this service. If the list is empty, your vendor profile has no ' +
    'category set yet — contact support and we will set it.',
  // The raw constraint, in case an older client posts without a category
  // against a database that has not run 0823c yet.
  'violates not-null constraint': 'Choose a category for this service before saving it.',
  ck_vendor_services_pricing_models_distinct:
    'You have picked the same way of charging twice. Reload the page and try again.',
  '23503': 'That category no longer exists. Pick another one.',
  forbidden: 'You do not have permission to change this vendor’s services.',

  // --- lifecycle writes -------------------------------------------------
  //
  // Archiving is a DELETE that `trg_soft_delete` rewrites into an UPDATE, so
  // the foreign keys pointing at this row from `bookings` and `quote_templates`
  // are never tested and none of Postgres's referential messages should be
  // reachable. `23503` is mapped above for the category case and reads
  // correctly for either; the rest are here because the version of a failure a
  // vendor reads should never be the database's.
  '42501': 'You do not have permission to change this service. Sign in again and retry.',
  PGRST116: 'That service is no longer there. Refresh the page.',
};

/** Whatever a service write failed with, as a sentence. */
export function serviceWriteError(error: unknown): string {
  return rpcErrorMessage(error, SERVICE_ERRORS);
}
