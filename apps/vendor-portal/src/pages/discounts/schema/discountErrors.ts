/** The shape Supabase resolves a failed write with — never an `Error`. */
type WriteError = { code?: string; message: string } | null;

/** `ux_discounts_code` is the only constraint a vendor can trip by typing. */
const UNIQUE_VIOLATION = '23505';

const DUPLICATE_CODE =
  'That code is already in use. Discount codes are unique across Sinnapi, so pick another — ' +
  'adding your business name or the season usually does it.';

/**
 * A refused discount write, said in words a vendor can act on.
 *
 * One constraint on this table is reachable by hand: codes are unique across
 * every vendor while they are alive, so a vendor typing `SUMMER` gets a
 * rejection caused by a business they have never heard of. Postgres phrases
 * that as `duplicate key value violates unique constraint "ux_discounts_code"`,
 * which names our index and tells the vendor nothing about what to do next.
 *
 * Everything else is passed through: a failed write a vendor cannot fix is
 * still a failed write they need to see, and inventing a friendlier sentence
 * for it would hide the one detail support would ask for.
 */
export function discountWriteMessage(error: WriteError): string | null {
  if (!error) return null;

  if (error.code === UNIQUE_VIOLATION || error.message.includes('ux_discounts_code')) {
    return DUPLICATE_CODE;
  }
  return error.message;
}
