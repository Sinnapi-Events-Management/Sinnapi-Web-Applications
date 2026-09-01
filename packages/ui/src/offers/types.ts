/**
 * The shapes an offer arrives in, and the vocabulary every app names it with.
 *
 * An "offer" on this platform is one `discounts` row, optionally sitting under
 * a `promotions` campaign. The distinction matters to a vendor authoring one
 * and to nobody else: a client sees "20% off the Gold tier, until 30 Sep", and
 * whether that came from a standalone code or from a campaign with a banner is
 * an implementation detail of the vendor's own filing.
 *
 * So the type below is the SHAPE OF THE ROW THE RPCs RETURN, not the shape of
 * the tables. `package_offers`, `vendor_offers` and `search_public_offers` all
 * fold the campaign into the discount before it leaves the database, which is
 * why one type serves three reads and four apps.
 *
 * Every field is optional except the two that identify the thing, because the
 * three RPCs return overlapping but different column sets and a type that
 * demanded all of them would force three near-identical types whose only real
 * difference is which fields are absent.
 */

/** A discount type as the column stores it. Loose because PostgREST sends text. */
export type OfferType = 'percentage' | 'fixed';

/**
 * What the offer covers, as `package_offers` derives it.
 *
 * The client-facing distinction is between "this whole package" and "only this
 * tier", because those are the two that change what a reader should do next.
 * `campaign` and `vendor` both mean "wider than this package", and are kept
 * apart only so a vendor's own screen can say which.
 */
export type OfferScope = 'tier' | 'package' | 'campaign' | 'vendor';

/**
 * Why an offer cannot be used, exactly as `discount_block_reason` returns it.
 *
 * A union rather than a string so a new reason added in SQL fails the build in
 * `offerBlockCopy` rather than rendering a raw snake_case token to a client.
 */
export type OfferBlockReason =
  | 'not_found'
  | 'suspended'
  | 'paused'
  | 'not_started'
  | 'expired'
  | 'campaign_inactive'
  | 'vendor_unavailable'
  | 'wrong_vendor'
  | 'wrong_package'
  | 'wrong_tier'
  | 'below_minimum'
  | 'exhausted'
  | 'client_limit_reached'
  // The two the EVENT DATE can fail on, as opposed to the twelve above, which
  // are all about the offer or the client. `discount_date_block_reason` returns
  // these; they are the only reasons whose fix is "pick another day" rather
  // than "use another code", so they are worth their own sentences.
  | 'event_before_window'
  | 'event_after_window';

/** One live offer, as any of the three read paths returns it. */
export type OfferModel = {
  discount_id: string;
  promotion_id?: string | null;
  promotion_title?: string | null;
  promotion_public_id?: string | null;
  banner_url?: string | null;

  title: string;
  description?: string | null;
  terms?: string | null;

  /**
   * Null for a signed-out reader — the RPCs redact it rather than trusting the
   * caller to. A null code is therefore NOT the same as an automatic offer:
   * check `is_automatic` for that.
   */
  code?: string | null;
  is_automatic?: boolean | null;

  type: OfferType | string;
  value: number | string;
  currency?: string | null;
  max_discount_amount?: number | string | null;
  min_amount?: number | string | null;

  starts_at?: string | null;
  ends_at?: string | null;

  /** Null means uncapped. Zero never appears — an exhausted offer is not returned. */
  remaining_uses?: number | null;

  scope?: OfferScope | string | null;

  /**
   * What this offer takes off, when the caller passed a net to price it
   * against. Absent on reads that had no amount to work with, which is why
   * `offerSaving` recomputes rather than trusting it.
   */
  discount_amount?: number | string | null;
};

/** A row from the public offers directory: an offer plus who is running it. */
export type PublicOfferModel = OfferModel & {
  vendor_id: string;
  vendor_name: string;
  vendor_slug: string;
  vendor_image_url?: string | null;
  vendor_rating?: number | string | null;
  vendor_review_count?: number | null;
  category_id?: string | null;
  category_name?: string | null;
  is_featured?: boolean | null;
  package_count?: number | null;
  package_names?: string[] | null;
  /** The cheapest tier this offer touches, before the offer is applied. */
  from_price?: number | string | null;
  total_count?: number | null;
};

/** The single row `preview_discount` always returns, valid or not. */
export type OfferPreview = {
  discount_id: string | null;
  is_valid: boolean;
  reason: OfferBlockReason | string | null;
  title?: string | null;
  description?: string | null;
  terms?: string | null;
  type?: OfferType | string | null;
  value?: number | string | null;
  currency?: string | null;
  min_amount?: number | string | null;
  max_discount_amount?: number | string | null;
  ends_at?: string | null;
  remaining_uses?: number | null;
  discount_amount?: number | string | null;
};

/**
 * What a vendor's own screens add on top: the columns only an owner or an
 * operator may read, and the derived state both of them filter by.
 */
export type OfferAdminModel = OfferModel & {
  vendor_id?: string | null;
  vendor_name?: string | null;
  vendor_slug?: string | null;
  vendor_public_id?: string | null;
  max_uses?: number | null;
  max_per_client?: number | null;
  status?: OfferLifecycle | string | null;
  is_featured?: boolean | null;
  admin_suspended_at?: string | null;
  admin_suspended_reason?: string | null;
  package_count?: number | null;
  package_names?: string[] | null;
  reserved_count?: number | null;
  redeemed_count?: number | null;
  discounted_value?: number | string | null;
  total_count?: number | null;
};

/**
 * The state an offer is in, in the one vocabulary the vendor's screen, the
 * console's tabs and `admin_search_offers` all use.
 *
 * Derived, never stored. `deriveOfferLifecycle` is the browser's copy of the
 * CASE in `admin_search_offers`, so a card can label itself without a round
 * trip — and the two are written to the same clauses in the same order for the
 * one reason that matters: a vendor and an operator must never read two
 * different words for the same campaign.
 */
export type OfferLifecycle =
  | 'live'
  | 'scheduled'
  | 'paused'
  | 'suspended'
  | 'ended'
  | 'exhausted'
  | 'deleted';

/** One target a vendor has attached an offer to. */
export type OfferTargetKind = 'package' | 'package_tier' | 'vendor_service';

export type OfferTargetModel = {
  id?: string;
  promotion_id?: string | null;
  discount_id?: string | null;
  kind: OfferTargetKind;
  package_id?: string | null;
  tier_id?: string | null;
  vendor_service_id?: string | null;
};
