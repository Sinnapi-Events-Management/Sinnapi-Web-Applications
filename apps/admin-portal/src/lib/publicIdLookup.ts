/** Shape returned by the `admin_lookup_public_id` RPC (migration 20260829000005). */
export type PublicIdLookupModel = {
  found: boolean;
  /** Table name without the schema, e.g. `vendors`. Null when nothing matched. */
  entity: string | null;
  /** One line naming the record — the business name, the campaign title, an amount. */
  label: string | null;
  /** The identifier as searched, normalised. */
  public_id: string;
  /** Null when the identifier was issued but its record has since been deleted. */
  row_id: string | null;
  /** Admin-portal path, or null where the entity has no page. */
  route: string | null;
  /** `current` for a live identifier, `legacy` for a pre-migration reference. */
  matched_on: 'current' | 'legacy' | null;
};
