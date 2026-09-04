import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import {
  paginate,
  rpcErrorMessage,
  BOOKING_PAYMENT_WINDOW_COLUMNS,
  type PageParams,
  type Paged,
} from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';
import { one } from '@/lib/rel';
import { fetchLatestDeletionRequest } from '@/lib/accountApi';
import type {
  EventSearchFilters,
  EventSearchPage,
  EventFacetCounts,
  ServiceRegionModel,
  ProfileModel,
  DirectoryProfile,
  MyApplicationModel,
  VendorBookingModel,
  VendorBookingDetailModel,
  VendorBookingEscrowModel,
  SettlementRequestModel,
  SettlementEventModel,
  BookingStatusEventModel,
  VendorQuotationModel,
  PackageQuoteTermsModel,
  QuotationDetailModel,
  QuotationStatusEventModel,
  QuotationBookingModel,
  PackageModel,
  ServiceModel,
  ServiceCategoryModel,
  MediaModel,
  AvailabilityModel,
  BlockedDateModel,
  PublicEventModel,
  PublicEventDetailModel,
  PublicEventRequirementModel,
  VendorEventQuotationModel,
  VendorEventBookingModel,
  EventTypeRef,
  EventInterestModel,
  EscrowModel,
  PayoutModel,
  VendorBankAccountModel,
  PromotionModel,
  PromotionDiscountModel,
  DiscountModel,
  ReviewModel,
  PlanModel,
  ConversationModel,
  MessageModel,
  VendorClientModel,
  NotificationModel,
  NotificationPage,
  OfferTargetModel,
  OfferPerformanceModel,
  SubscriptionQuoteModel,
  MySubscriptionModel,
  SubscriptionPaymentModel,
  SubscriptionEventModel,
  PaymentReturnModel,
} from '@/lib/types';

// All reads are RLS-scoped: a vendor sees only rows for vendors they own.

// Shared react-query options for a server-paginated list: the page params are
// part of the key (so each page/sort caches independently) and the previous
// page stays visible while the next one loads. The list's own key stays the
// prefix, so existing broad invalidations (`['v-bookings']`) still match every
// page of every vendor.
//
// The pagination contract itself (`PageParams`/`Paged`/`paginate`) is shared
// across all three portals from `@sinnapi/ui`. Only this thin react-query
// binding is portal-local, since the design system does not depend on
// react-query.
function pagedOptions<Row>(
  key: readonly unknown[],
  params: PageParams,
  fetcher: () => Promise<Paged<Row>>,
) {
  return {
    queryKey: [...key, params.page, params.pageSize, params.sort, params.filters] as const,
    queryFn: fetcher,
    placeholderData: keepPreviousData,
  };
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('id,public_id,full_name,email,phone,avatar_url,preferred_currency,created_at')
        .eq('id', user.id)
        .maybeSingle();
      return (data as ProfileModel) ?? null;
    },
  });
}

/** Frozen so an empty result cannot be mistaken for a mutable cache entry. */
const EMPTY_DIRECTORY: Record<string, DirectoryProfile> = Object.freeze({});

/**
 * Resolves counterparty profiles by id — the vendor portal's only way to put a
 * name to a client.
 *
 * `profiles_self_read` restricts the table to the caller's own row, so every
 * `profiles:client_id(...)` embed this portal used to select resolved to null
 * and every client rendered as the placeholder "Client". The rows now come from
 * `get_profile_directory`, which discloses name and avatar for people the
 * vendor already shares a quotation, booking or conversation with, and contact
 * details only once that engagement is live.
 *
 * Callers pass the ids off a page of rows, so duplicates and nulls are expected
 * and cleaned up here. The ids are sorted into the query key so two renders of
 * the same page hit one cache entry regardless of row order.
 */
export function useProfileDirectory(ids: Array<string | null | undefined>) {
  // Not memoized on purpose: react-query hashes the key structurally, so a
  // fresh array with the same contents is the same cache entry. Memoizing here
  // would only move the cost around and would need the caller to hold a stable
  // array reference.
  const unique = Array.from(new Set(ids.filter((v): v is string => !!v))).sort();

  const query = useQuery({
    queryKey: ['profile-directory', unique] as const,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_profile_directory', { p_ids: unique });
      if (error) throw error;
      const rows = (data ?? []) as DirectoryProfile[];
      return Object.fromEntries(rows.map((r) => [r.id, r])) as Record<string, DirectoryProfile>;
    },
    enabled: unique.length > 0,
    // Names and avatars are not what a vendor is refreshing this page to see.
    staleTime: 5 * 60_000,
  });

  const profiles = query.data ?? EMPTY_DIRECTORY;

  return {
    profiles,
    /** `null` for an id that resolved to nothing — unknown, or not ours to see. */
    profile: (id: string | null | undefined) => (id ? (profiles[id] ?? null) : null),
    isLoading: query.isLoading,
    error: query.error,
  };
}

/** The single-id case, which is most detail pages. */
export function useDirectoryProfile(id: string | null | undefined) {
  const { profile, isLoading, error } = useProfileDirectory([id]);
  return { profile: profile(id), isLoading, error };
}

/** Query key for the erasure request, so the settings page can invalidate it after filing one. */
export const DELETION_REQUEST_KEY = ['deletion-request'] as const;

/**
 * The account's latest right-to-erasure request, if it has ever made one.
 *
 * Read on the settings page to decide whether to offer the request button or
 * report the state of the request already in the compliance queue.
 */
export function useLatestDeletionRequest() {
  return useQuery({
    queryKey: DELETION_REQUEST_KEY,
    queryFn: fetchLatestDeletionRequest,
  });
}

export function useMyApplication() {
  return useQuery({
    queryKey: ['my-application'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('vendor_applications')
        .select('id,status,business_name,is_reapplication,rejection_reason,submitted_at,created_at')
        .eq('applicant_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as MyApplicationModel) ?? null;
    },
  });
}

/** One page of the vendor's bookings, by event date unless re-sorted. */
export function useVendorBookings(vendorId: string | undefined, params: PageParams) {
  return useQuery({
    ...pagedOptions(['v-bookings', vendorId], params, () =>
      paginate<VendorBookingModel>(
        supabase
          .from('bookings')
          .select(
            'id,reference_no,status,event_date,amount,currency,client_id,payment_type,' +
              `payment_terms_status,${BOOKING_PAYMENT_WINDOW_COLUMNS}`,
            {
              count: 'exact',
            },
          )
          .eq('vendor_id', vendorId!),
        params,
        { field: 'event_date', ascending: false },
      ),
    ),
    enabled: !!vendorId,
  });
}

/**
 * One booking with everything behind it: the quotation the vendor sent, with
 * that quote's priced lines, and the event it was requested against.
 *
 * Embedded rather than fetched separately because both answer questions asked
 * *about this booking* — "is this the price I quoted?", "which request was
 * this?" — and a second round trip per card turns one page into three loading
 * states.
 *
 * Both resolve to null legitimately: a booking placed straight against a
 * service never had a quotation, and `events_public_read` withholds a client's
 * private event from the vendor. Neither is an error, and neither card draws.
 */
const VENDOR_BOOKING_DETAIL_SELECT = [
  '*',
  'quotations(id,reference_no,status,currency,subtotal,discount_total,tax_total,total,' +
    'valid_until,request_details,version_no,advance_rate,advance_release_days_before,' +
    'advance_terms_note,sent_at,responded_at,created_at,' +
    'quotation_items(id,description,quantity,unit_price,line_total,sort_order))',
  'events(id,title,event_date,location,payment_type,payment_terms_note)',
].join(',');

export function useVendorBooking(id: string) {
  return useQuery({
    queryKey: ['v-booking', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(VENDOR_BOOKING_DETAIL_SELECT)
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as VendorBookingDetailModel) ?? null;
    },
  });
}

/**
 * The escrow behind one booking, or `null` when nothing has been funded.
 *
 * The vendor cannot act on it — funding, disputes and release confirmation are
 * all the client's or an admin's — but the booking page needs its status to
 * know whether the booking may be started: `start_booking` refuses until the
 * money is in, and a disabled button with no explanation is worse than none.
 */
export function useVendorBookingEscrow(bookingId: string | undefined) {
  return useQuery({
    queryKey: ['v-booking-escrow', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select(
          'id,status,currency,gross_amount,advance_amount,balance_amount,timers_frozen_at,advance_released_at,advance_release_due_at',
        )
        .eq('booking_id', bookingId!)
        .maybeSingle();
      if (error) throw error;
      return (data as VendorBookingEscrowModel) ?? null;
    },
    enabled: !!bookingId,
  });
}

/**
 * The settlement request on one booking, or `null` when the vendor has not
 * asked yet.
 *
 * Newest first and limited to one: a booking can only have one *live* request
 * (a partial unique index enforces it), but a contested or withdrawn one stays
 * on the record and a second attempt is legitimate. The latest row is the one
 * the page is about; the rest are history and are read through the trail.
 */
export function useVendorBookingSettlement(bookingId: string | undefined) {
  return useQuery({
    queryKey: ['v-settlement', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settlement_requests')
        .select('*')
        .eq('booking_id', bookingId!)
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as SettlementRequestModel) ?? null;
    },
    enabled: !!bookingId,
  });
}

/** A settlement's visible trail, oldest first — the order it reads in. */
export function useSettlementEvents(requestId: string | undefined) {
  return useQuery({
    queryKey: ['v-settlement-events', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settlement_events')
        .select('id,kind,actor_role,amount,note,created_at')
        .eq('request_id', requestId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as SettlementEventModel[];
    },
    enabled: !!requestId,
  });
}

/**
 * A booking's status trail, oldest first — the order it reads in as a timeline.
 * Keyed under the booking so `useBookingActions` can invalidate it with the
 * same `['v-booking', id]`-shaped refresh it already does after a status write.
 */
export function useVendorBookingStatusHistory(id: string) {
  return useQuery({
    queryKey: ['v-booking-history', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_status_history')
        .select('id,from_status,to_status,reason,occurred_at')
        .eq('booking_id', id)
        .order('occurred_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as BookingStatusEventModel[];
    },
    enabled: !!id,
  });
}

/** One page of the vendor's quote requests, newest first unless re-sorted. */
export function useVendorQuotations(vendorId: string | undefined, params: PageParams) {
  return useQuery({
    ...pagedOptions(['v-quotations', vendorId], params, () =>
      paginate<VendorQuotationModel>(
        supabase
          .from('quotations')
          .select(
            'id,reference_no,status,total,currency,valid_until,request_details,created_at,client_id',
            { count: 'exact' },
          )
          .eq('vendor_id', vendorId!),
        params,
        { field: 'created_at', ascending: false },
      ),
    ),
    enabled: !!vendorId,
  });
}

/**
 * One quotation with its priced lines and the event it was requested for. The
 * client is only a `client_id` here — RLS keeps their profile row out of an
 * embed — and is resolved through `useProfileDirectory`.
 *
 * The PostgREST error is raised rather than swallowed. It used to be dropped on
 * the floor and the page rendered "Quotation not found" — which told a vendor
 * their quote had been deleted when the truth was a failed request.
 */
export function useQuotation(id: string) {
  return useQuery({
    queryKey: ['v-quotation', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select(
          '*,quotation_items(id,description,quantity,unit_price,line_total,sort_order),events(id,title,event_date),event_types(id,name)',
        )
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return (data as QuotationDetailModel) ?? null;
    },
    enabled: !!id,
  });
}

/**
 * What a package order is locked to, for the approval panel.
 *
 * Its own query rather than more columns on `useQuotation`, because two of the
 * fields are computed against the package as it stands RIGHT NOW — a vendor who
 * edits the package in another tab should see `package_changed` flip on a
 * refetch, and folding that into the quotation's cache entry would tie it to a
 * key that has no reason to invalidate.
 *
 * Returns null for a quote that is not a package order, which is what the RPC
 * itself does: it returns no rows rather than raising, so a vendor opening an
 * ordinary quote gets a quiet null instead of an error boundary.
 */
export function usePackageQuoteTerms(id: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ['v-package-quote-terms', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('package_quote_terms', { p_quotation_id: id })
        .maybeSingle();
      if (error) throw error;
      return (data as PackageQuoteTermsModel) ?? null;
    },
    enabled: !!id && enabled,
  });
}

/**
 * The columns the quotation pages need about a booking made from a quote.
 *
 * The keyed variant repeats the list rather than concatenating onto the first:
 * supabase-js parses the select string as a *literal type* to infer the row
 * shape, and a runtime concatenation widens it to `string` — at which point the
 * inferred row becomes `GenericStringError` and the cast below stops compiling.
 */
const QUOTATION_BOOKING_SELECT = 'id,reference_no,status,event_date,start_time,end_time,location';
const QUOTATION_BOOKING_KEYED_SELECT =
  'id,reference_no,status,event_date,start_time,end_time,location,quotation_id';

/** Stable empty map, so consumers do not re-render on every fetch. */
const EMPTY_QUOTATION_BOOKINGS: Record<string, QuotationBookingModel> = Object.freeze({});

/**
 * The booking a client made from this quotation, or null while they have not
 * scheduled it yet.
 *
 * Read off `bookings` rather than embedded on the quotation because the
 * relation runs the other way — `bookings.quotation_id` is the foreign key —
 * and because this is the one fact on the quote page that changes without the
 * quotation row changing.
 *
 * `maybeSingle` rather than a list: `ux_bookings_quotation` guarantees at most
 * one live booking per quote, so anything else is a schema violation and should
 * surface as an error rather than be silently sliced to `[0]`.
 */
export function useQuotationBooking(quotationId: string | undefined) {
  return useQuery({
    queryKey: ['v-quotation-booking', quotationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(QUOTATION_BOOKING_SELECT)
        .eq('quotation_id', quotationId!)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      return (data as QuotationBookingModel) ?? null;
    },
    enabled: !!quotationId,
  });
}

/**
 * The bookings made from a page of quotations, keyed by quotation.
 *
 * One query for the whole page rather than one per row — the same shape as
 * `useProfileDirectory` above, and for the same reason: a list column that
 * needs a fact the row does not carry must not become N requests.
 */
export function useQuotationBookings(quotationIds: Array<string | null | undefined>) {
  const unique = Array.from(new Set(quotationIds.filter((v): v is string => !!v))).sort();

  const query = useQuery({
    queryKey: ['v-quotation-bookings', unique] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(QUOTATION_BOOKING_KEYED_SELECT)
        .in('quotation_id', unique)
        .is('deleted_at', null);
      if (error) throw error;
      const rows = (data ?? []) as Array<QuotationBookingModel & { quotation_id: string }>;
      return Object.fromEntries(rows.map((r) => [r.quotation_id, r])) as Record<
        string,
        QuotationBookingModel
      >;
    },
    enabled: unique.length > 0,
  });

  return {
    bookings: query.data ?? EMPTY_QUOTATION_BOOKINGS,
    isLoading: query.isLoading,
  };
}

/**
 * A quotation's status trail, oldest first — the order it reads in as a
 * timeline. The table is append-only and trigger-written, so this needs no
 * invalidation of its own: it is refetched alongside the quotation whenever a
 * status changes.
 */
export function useQuotationStatusHistory(id: string) {
  return useQuery({
    queryKey: ['v-quotation-history', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotation_status_history')
        .select('id,from_status,to_status,reason,occurred_at,actor_id')
        .eq('quotation_id', id)
        .order('occurred_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as QuotationStatusEventModel[];
    },
    enabled: !!id,
  });
}

/**
 * Every column of a package, both levels of its lines, in one read.
 *
 * The nested embed is what makes a package editable and previewable without a
 * waterfall: the editor opens with the tree already in hand, and the preview
 * beside it prices from the same objects the form is bound to.
 *
 * The second `quote_template_items` embed is filtered to `tier_id is null` —
 * the add-ons offered across every tier. Without the filter the same rows would
 * arrive twice, once here and once under their tier, and every tier's total
 * would be computed over a list that includes the other tiers' lines.
 */
const PACKAGE_COLS =
  'id,vendor_id,name,summary,notes,currency,cover_image_url,vendor_service_id,category_id,' +
  'pricing_model,inclusions,exclusions,lead_time_days,tax_rate,tax_inclusive,valid_days,advance_rate,' +
  'advance_release_days_before,advance_terms_note,visibility,is_active,published_at,sort_order,' +
  'admin_unpublished_at,admin_unpublished_reason,' +
  'quote_template_tiers(id,name,description,is_recommended,discount_rate,sort_order,' +
  'quote_template_items(id,tier_id,description,quantity,unit_price,unit_label,notes,is_optional,sort_order)),' +
  'quote_template_items(id,tier_id,description,quantity,unit_price,unit_label,notes,is_optional,sort_order)';

export function usePackages(vendorId?: string) {
  return useQuery({
    queryKey: ['v-packages', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quote_templates')
        .select(PACKAGE_COLS)
        .eq('vendor_id', vendorId!)
        .is('deleted_at', null)
        .is('quote_template_items.tier_id', null)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PackageModel[];
    },
  });
}

/**
 * The packages a vendor can actually quote from, for the builder's picker.
 *
 * Archived ones are filtered out here rather than in the picker: a vendor who
 * archived a package has said they are no longer selling it, and offering it as
 * a starting point in the one place quotes are built would undo that.
 */
export function useQuotablePackages(vendorId?: string) {
  const query = usePackages(vendorId);
  return {
    ...query,
    data: (query.data ?? []).filter(
      (pkg) => pkg.is_active !== false && (pkg.quote_template_tiers?.length ?? 0) > 0,
    ),
  };
}

/**
 * A vendor's catalogue of services.
 *
 * `base_price`/`currency` are still selected because the columns still exist
 * and a type that omitted them would drift from the row. Nothing in this
 * portal reads them any more — a service card's "from" figure comes from the
 * packages hanging off the service, through the same `packagePricing` a client
 * sees, so the two cannot disagree.
 *
 * The error is surfaced rather than swallowed. The previous version dropped it
 * and returned `[]`, which is how a failing read looked exactly like an empty
 * catalogue and sent vendors to support instead of to a retry.
 *
 * ARCHIVED ROWS ARE OPT-IN
 * `includeArchived` widens the read to soft-deleted services, and only the
 * services screen asks for it — that screen has an Archived tab and a Restore
 * action, so it needs rows nobody else should see. Everywhere a service is
 * *chosen* rather than *managed* (the package editor's picker) keeps the
 * default and gets live rows only, because offering a vendor a service they
 * archived is offering them a choice they already made.
 *
 * The flag is part of the query key, so the two reads cache separately, and
 * both still fall under an `invalidateQueries(['v-services', vendorId])` —
 * react-query matches keys by prefix, so a write on the services screen
 * refreshes the package editor's picker too.
 */
export function useServices(vendorId?: string, options?: { includeArchived?: boolean }) {
  const includeArchived = options?.includeArchived ?? false;

  return useQuery({
    queryKey: ['v-services', vendorId, includeArchived ? 'with-archived' : 'live'],
    enabled: !!vendorId,
    queryFn: async () => {
      const query = supabase
        .from('vendor_services')
        .select(
          'id,title,description,base_price,currency,is_active,category_id,pricing_models,deleted_at',
        )
        .eq('vendor_id', vendorId!);

      const { data, error } = await (includeArchived ? query : query.is('deleted_at', null)).order(
        'created_at',
        { ascending: false },
      );
      if (error) throw error;
      return (data ?? []) as ServiceModel[];
    },
  });
}

/**
 * The platform's service taxonomy, for the picker on the service form.
 *
 * World-readable through `ref_read_categories`, maintained by the console, and
 * effectively static within a session — so it is cached indefinitely and not
 * keyed by vendor. A category an admin adds shows up on the vendor's next
 * visit without a release.
 *
 * Ordered by `sort_order` then name, matching the console's own list: a vendor
 * and an operator discussing "the fourth one down" are looking at the same
 * fourth one.
 */
export function useServiceCategories() {
  return useQuery({
    queryKey: ['service-categories'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('id,name')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ServiceCategoryModel[];
    },
  });
}

/**
 * The vendor's portfolio, in the order they curated it.
 *
 * `created_at` breaks ties on purpose: every row predating the reorder feature
 * carries the column default of 0, and without a second key those rows would come
 * back in whatever order the planner happened to produce — so a gallery could
 * reshuffle itself between two refetches with nothing having changed.
 */
export function useMedia(vendorId?: string) {
  return useQuery({
    queryKey: ['v-media', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase
        .from('vendor_media')
        .select('id,media_type,url,caption,is_primary,sort_order')
        .eq('vendor_id', vendorId!)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      return (data ?? []) as MediaModel[];
    },
  });
}

export function useAvailability(vendorId?: string) {
  return useQuery({
    queryKey: ['v-availability', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase
        .from('vendor_availability')
        .select('id,day_of_week,specific_date,start_time,end_time,is_available')
        .eq('vendor_id', vendorId!);
      return (data ?? []) as AvailabilityModel[];
    },
  });
}

export function useBlockedDates(vendorId?: string) {
  return useQuery({
    queryKey: ['v-blocked', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      // The booking is embedded rather than fetched per row: the calendar names
      // the job behind every non-manual block, and one round trip per blocked
      // day would turn a month view into thirty requests.
      const { data, error } = await supabase
        .from('vendor_blocked_dates')
        .select(
          'id,blocked_date,reason,source,booking_id,' +
            'bookings(id,reference_no,status,start_time,end_time,location,amount,currency,client_id)',
        )
        .eq('vendor_id', vendorId!)
        .order('blocked_date', { ascending: true });
      if (error) throw error;
      // Cast before mapping: the select is too long for supabase-js to infer a
      // row shape from, so it falls back to a union the spread below cannot
      // read. `one()` then normalizes the embed — PostgREST returns a to-one
      // relation as an object, but the generated types widen it to an array, and
      // no component should have to handle both shapes.
      const rows = (data ?? []) as unknown as BlockedDateModel[];
      return rows.map((row) => ({ ...row, bookings: one(row.bookings) }));
    },
  });
}

/**
 * Re-raises a cancelled request as a real `AbortError`.
 *
 * PostgREST catches an aborted fetch and hands it back as an ordinary
 * `{ error }` result rather than rejecting, so a superseded request would
 * otherwise surface as a genuine failure — a red error panel every time someone
 * changes a filter mid-flight. TanStack Query only treats a rejection as a
 * cancellation, so the abort has to be thrown, not returned.
 *
 * Call it after the await and before inspecting `error`.
 */
function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
}

// ---------- Public events ----------

/**
 * How many event cards the feed pulls per "View more". Deliberately small: a
 * vendor scanning for work reads the first few briefs carefully and abandons
 * the rest, so paying the transfer for fifty of them up front buys nothing. The
 * RPC clamps anything above 48.
 */
export const EVENT_PAGE_SIZE = 8;

/** The filter arguments shared by the feed query and the facet counts. */
function toEventRpcArgs(filters: EventSearchFilters) {
  return {
    p_q: filters.q ?? null,
    p_type: filters.type ?? null,
    p_source: filters.source ?? null,
    p_location: filters.location ?? null,
    p_budget_min: filters.budgetMin ?? null,
    p_budget_max: filters.budgetMax ?? null,
    p_when: filters.when ?? null,
  };
}

/** A `search_events_public` row: the card model plus the window count. */
type EventSearchRow = PublicEventModel & { total_count: number };

/**
 * Projects a result row onto the card model, dropping the window count that
 * rides along on every row. Spelled out rather than spread so the shape a card
 * receives is stated once, here at the data boundary, instead of being whatever
 * the RPC happens to return.
 */
function toEventCard(row: EventSearchRow): PublicEventModel {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    event_type: row.event_type,
    event_type_name: row.event_type_name,
    event_date: row.event_date,
    location: row.location,
    budget_min: row.budget_min,
    budget_max: row.budget_max,
    currency: row.currency,
    cover_image_url: row.cover_image_url,
    source: row.source,
  };
}

/**
 * One page of the public-events feed.
 *
 * Search, occasion, town, date band, budget, sort and paging all resolve inside
 * `search_events_public` — the same read the public site's events grid makes,
 * and one whose predicate (`status = 'published' and is_public and deleted_at
 * is null`) is exactly what this page was filtering for by hand.
 *
 * `total` rides on every row as a window count over the filtered set before
 * limit/offset, so "N of M" is the real total rather than the length of the
 * page in hand.
 */
async function searchPublicEvents(
  filters: EventSearchFilters,
  { offset, signal }: { offset: number; signal: AbortSignal },
): Promise<EventSearchPage> {
  const { data, error } = await supabase
    .rpc('search_events_public', {
      ...toEventRpcArgs(filters),
      p_sort: filters.sort ?? 'soonest',
      p_limit: EVENT_PAGE_SIZE,
      p_offset: offset,
    })
    .abortSignal(signal);
  throwIfAborted(signal);
  if (error) throw error;

  const rows = (data ?? []) as EventSearchRow[];
  return {
    events: rows.map(toEventCard),
    total: rows[0]?.total_count ?? 0,
    offset,
  };
}

/**
 * The occasions the feed can be filtered by, straight from `event_types`.
 *
 * Replaces a hardcoded list that had already drifted from what the admin portal
 * writes — it offered `corporate` and `product_launch`, which nothing has ever
 * written, while missing `introduction`, `company_event` and `fundraising`,
 * which are exactly the occasions a Ugandan vendor is looking for. Filtering by
 * one of the phantom tokens returned an empty feed with no explanation.
 *
 * Active types only, `key` as the value: the key is what
 * `search_events_public` matches and what the URL carries. Reference data that
 * changes rarely, so it is cached for the session.
 */
export function useEventTypeOptions() {
  return useQuery({
    queryKey: ['event-type-options'],
    staleTime: Infinity,
    queryFn: async (): Promise<EventTypeRef[]> => {
      const { data, error } = await supabase
        .from('event_types')
        .select('key,name')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as EventTypeRef[];
    },
  });
}

/**
 * The paginated events feed, as an infinite query whose cursor is the row
 * offset. `total` comes back on every page, so "is there more" is a comparison
 * rather than a guess about whether a short page means the end.
 *
 * `keepPreviousData` keeps the current cards on screen while a new filter's
 * page lands (the page dims them via `isRefreshing`) instead of collapsing the
 * feed into skeletons on every keystroke.
 *
 * `signal` is forwarded to PostgREST so a page superseded mid-flight — the
 * vendor changed a filter before it landed — is actually cancelled rather than
 * left to arrive and be discarded. Reading it off the context is also what arms
 * TanStack Query's cancellation: it only aborts a fetch whose queryFn consumed
 * the signal.
 */
export function usePublicEventSearch(filters: EventSearchFilters) {
  return useInfiniteQuery({
    queryKey: ['public-events', 'search', filters],
    queryFn: ({ pageParam, signal }) => searchPublicEvents(filters, { offset: pageParam, signal }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.offset + lastPage.events.length;
      // An empty page ends the list even if `total` disagrees, so a count that
      // shifts between requests can't leave "View more" fetching forever.
      if (lastPage.events.length === 0 || loaded >= lastPage.total) return undefined;
      return loaded;
    },
    placeholderData: keepPreviousData,
  });
}

/**
 * Result counts for every occasion, source, town and date band under the
 * current filters, so each dropdown can label itself ("Wedding (24)") and
 * disable the options that lead nowhere. Each facet ignores its own selection —
 * see `count_event_facets_public`.
 *
 * Towns are passed in rather than grouped out of the data: `events.location` is
 * free text, so the RPC counts each curated token by containment, the same way
 * the filter itself matches.
 *
 * The RPC arguments double as the cache key, which is what keeps `sort` out of
 * it: `toEventRpcArgs` never sends a sort, and re-ordering the feed cannot
 * change a count — so a re-sort reuses these results instead of refetching them.
 */
export function usePublicEventFacetCounts(filters: EventSearchFilters, locations: string[]) {
  const args = { ...toEventRpcArgs(filters), p_locations: locations };
  return useQuery({
    queryKey: ['public-events', 'facets', args],
    queryFn: async ({ signal }): Promise<EventFacetCounts> => {
      const { data, error } = await supabase
        .rpc('count_event_facets_public', args)
        .abortSignal(signal);
      throwIfAborted(signal);
      if (error) throw error;
      return (
        (data ?? []) as { facet: keyof EventFacetCounts; key: string; count: number }[]
      ).reduce(
        (acc, row) => {
          if (acc[row.facet]) acc[row.facet][row.key] = Number(row.count);
          return acc;
        },
        { type: {}, source: {}, location: {}, when: {} } as EventFacetCounts,
      );
    },
    placeholderData: keepPreviousData,
  });
}

export function useMyInterests(vendorId?: string) {
  return useQuery({
    queryKey: ['v-interests', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase
        .from('event_interests')
        .select('event_id,status')
        .eq('vendor_id', vendorId!);
      return (data ?? []) as EventInterestModel[];
    },
  });
}

/**
 * The columns the event page reads. Spelled out rather than `*` so the row the
 * page renders is the row this app is allowed to see: `posted_by` and the audit
 * trail stay out of the browser, because the feed's whole promise is that a
 * vendor sees the brief and not the client behind it.
 *
 * A literal, not a built string: supabase-js infers the row shape from the
 * select as a *literal type*, and a concatenated one widens to `string`, at
 * which point the inferred row becomes `GenericStringError` and the cast stops
 * compiling.
 */
const PUBLIC_EVENT_DETAIL_SELECT =
  'id,title,description,event_date,location,budget_min,budget_max,currency,source,created_at,event_types(key,name)';

/**
 * One public event, for its own page.
 *
 * `maybeSingle` rather than `single`, and the null is a real answer: an event
 * that has been unpublished, made private or soft-deleted simply stops
 * satisfying `events_public_read`, and the row vanishes for the vendor with no
 * error. The page says "no longer open" for that; a thrown 406 would say
 * "something broke", which is a different and wrong claim.
 *
 * The PostgREST error IS raised, because a failed request and a withdrawn event
 * must not look the same — that confusion is exactly what the quotation page's
 * comment above `useQuotation` was written about.
 */
export function usePublicEvent(id: string) {
  return useQuery({
    queryKey: ['public-event', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(PUBLIC_EVENT_DETAIL_SELECT)
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as PublicEventDetailModel) ?? null;
    },
  });
}

/**
 * The client's plan, in the vendor-safe projection.
 *
 * Through the RPC rather than a select on `event_requirements`, and that is not
 * a style choice: the rule being enforced is column-level — a vendor may read
 * four of the columns and must never read `allocated_amount` — and RLS filters
 * rows, not columns. `list_event_requirements_public` is where that line is
 * drawn, so this is the only way the vendor portal may read a plan.
 */
export function useEventRequirementsPublic(eventId: string) {
  return useQuery({
    queryKey: ['public-event', eventId, 'requirements'],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_event_requirements_public', {
        p_event_id: eventId,
      });
      if (error) throw error;
      return (data ?? []) as PublicEventRequirementModel[];
    },
  });
}

/**
 * This vendor's quotations against one event, newest first.
 *
 * Scoped by vendor as well as event even though `quotations_read` already does
 * it: a filter the server enforces and the client repeats costs an index scan
 * and removes the class of bug where a policy is loosened later and a page
 * quietly starts showing a competitor's quotes.
 *
 * There can legitimately be several — one vendor may quote two lines of one
 * event (the caterer who also does the cake), which is why `open_event_quotation`
 * keys on the requirement and not just the pair.
 */
export function useVendorEventQuotations(vendorId: string | undefined, eventId: string) {
  return useQuery({
    queryKey: ['v-event-quotations', vendorId, eventId],
    enabled: !!vendorId && !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select(
          'id,reference_no,status,total,currency,valid_until,sent_at,created_at,requirement_id',
        )
        .eq('vendor_id', vendorId!)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as VendorEventQuotationModel[];
    },
  });
}

/** This vendor's bookings against one event — what the quotes actually became. */
export function useVendorEventBookings(vendorId: string | undefined, eventId: string) {
  return useQuery({
    queryKey: ['v-event-bookings', vendorId, eventId],
    enabled: !!vendorId && !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        // One literal, not a concatenation: supabase-js infers the row shape
        // from the select as a *literal type*, and a built string widens to
        // `string`, at which point the row becomes `GenericStringError`.
        .select(
          'id,reference_no,status,event_date,start_time,end_time,location,amount,currency,quotation_id,requirement_id',
        )
        .eq('vendor_id', vendorId!)
        .eq('event_id', eventId)
        .order('event_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as VendorEventBookingModel[];
    },
  });
}

/** One page of escrow activity for the vendor's bookings (read-only). */
export function useVendorEscrow(vendorId: string | undefined, params: PageParams) {
  return useQuery({
    ...pagedOptions(['v-escrow', vendorId], params, () =>
      paginate<EscrowModel>(
        supabase
          .from('escrow_transactions')
          .select(
            'id,status,gross_amount,commission_amount,net_payout_amount,agreed_amount,advance_amount,balance_amount,advance_release_due_at,advance_released_at,auto_release_due_at,currency,bookings(reference_no)',
            { count: 'exact' },
          )
          .eq('vendor_id', vendorId!),
        params,
        { field: 'created_at', ascending: false },
      ),
    ),
    enabled: !!vendorId,
  });
}

/** One page of the vendor's payout history, newest request first. */
export function useVendorPayouts(vendorId: string | undefined, params: PageParams) {
  return useQuery({
    ...pagedOptions(['v-payouts', vendorId], params, () =>
      paginate<PayoutModel>(
        supabase
          .from('payouts')
          .select(
            'id,kind,amount,currency,status,provider,settlement_method,settlement_reference,settled_at,blocked_reason,approved_at,completed_at,created_at',
            {
              count: 'exact',
            },
          )
          .eq('vendor_id', vendorId!),
        params,
        { field: 'created_at', ascending: false },
      ),
    ),
    enabled: !!vendorId,
  });
}

export const BANK_ACCOUNT_KEY = 'v-bank-account';

/**
 * The payout account currently on file, for display only.
 *
 * Every column here is safe to read: the `bank_owner` RLS policy already scopes
 * the row to the vendor who owns it, and the select deliberately stops short of
 * `account_number_encrypted` — that one is ciphertext with its own audited
 * decrypt RPC, and naming it here would ship a blob to the browser that nothing
 * on the client can (or should) open.
 *
 * `set_vendor_bank_account` inserts a new row and demotes the old one rather
 * than updating in place, so "the account on file" is the primary row, not the
 * newest; the `ux_bank_primary` partial index guarantees there is at most one.
 */
export function useVendorBankAccount(vendorId?: string) {
  return useQuery({
    queryKey: [BANK_ACCOUNT_KEY, vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_bank_accounts')
        .select('id,bank_name,account_name,account_number_last4,branch,is_verified,updated_at')
        .eq('vendor_id', vendorId!)
        .eq('is_primary', true)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      return (data as VendorBankAccountModel) ?? null;
    },
  });
}

/** A vendor's campaigns, newest window first. */
export function usePromotions(vendorId?: string) {
  return useQuery({
    queryKey: ['v-promotions', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase
        .from('promotions')
        .select(
          'id,title,description,banner_url,terms,starts_at,ends_at,is_active,admin_suspended_at,admin_suspended_reason,featured_at',
        )
        .eq('vendor_id', vendorId!)
        .is('deleted_at', null)
        .order('starts_at', { ascending: false });
      return (data ?? []) as PromotionModel[];
    },
  });
}

/**
 * The discount codes attached to this vendor's promotions.
 *
 * A separate read rather than an embed on `usePromotions`, so a campaign card
 * still draws when this fails or is slow — the promotion is the thing being
 * managed and its redemption count is commentary on it. Filtered to rows that
 * actually name a promotion, because an unattached code belongs to the
 * Discounts screen and would only inflate the totals here.
 */
export function usePromotionDiscounts(vendorId?: string) {
  return useQuery({
    queryKey: ['v-promotion-discounts', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase
        .from('discounts')
        .select('id,promotion_id,code,type,value,currency,max_uses,used_count,is_active')
        .eq('vendor_id', vendorId!)
        .not('promotion_id', 'is', null)
        .is('deleted_at', null);
      return (data ?? []) as PromotionDiscountModel[];
    },
  });
}

/**
 * Every discount code this vendor owns, newest window first.
 *
 * Read whole rather than a page at a time. The screen above it filters by a
 * status that is *derived* — a code inside its window that has hit its cap is
 * not what `is_active` says it is — and counts redemptions across the whole
 * set, and neither can be asked of one page: a "Live (3)" badge computed from
 * rows 1–25 is wrong the moment there are 26. A vendor's own codes are a set
 * measured in tens, so this is one small read rather than a page plus the
 * aggregate queries the badges and tiles would otherwise each need.
 */
export function useDiscounts(vendorId?: string) {
  return useQuery({
    queryKey: ['v-discounts', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase
        .from('discounts')
        .select(
          'id,code,title,description,terms,type,value,currency,max_uses,used_count,min_amount,max_discount_amount,max_per_client,is_automatic,promotion_id,starts_at,ends_at,is_active,admin_suspended_at,admin_suspended_reason',
        )
        .eq('vendor_id', vendorId!)
        .is('deleted_at', null)
        .order('starts_at', { ascending: false });
      return (data ?? []) as DiscountModel[];
    },
  });
}

/**
 * Every target on every offer this vendor owns, in one read.
 *
 * One query rather than one per offer, and grouped in the browser. A vendor
 * runs offers in tens and targets in low hundreds; twenty round trips to draw
 * one grid is the shape that makes a Promotions screen feel slow, and the join
 * that would avoid them cannot be expressed here because `offer_targets` hangs
 * off two different parents.
 *
 * Scoped by the offers the vendor owns rather than by a vendor column, because
 * `offer_targets` deliberately has none: a target belongs to an offer, and the
 * offer is what belongs to a vendor. The read policy enforces the same thing;
 * this filter is what keeps the payload to the rows the screen will use.
 */
export function useOfferTargets(vendorId?: string) {
  const promotions = usePromotions(vendorId);
  const discounts = useDiscounts(vendorId);

  const promotionIds = (promotions.data ?? []).map((row) => row.id);
  const discountIds = (discounts.data ?? []).map((row) => row.id);
  const ready = promotions.isSuccess && discounts.isSuccess;

  return useQuery({
    // The ids are in the key because the rows this read returns are only
    // meaningful for the set that produced them: a campaign created in another
    // tab must not leave the picker showing targets for a list it is not in.
    queryKey: ['v-offer-targets', vendorId, promotionIds.join(','), discountIds.join(',')],
    enabled: !!vendorId && ready && (promotionIds.length > 0 || discountIds.length > 0),
    queryFn: async () => {
      const filters: string[] = [];
      if (promotionIds.length > 0) filters.push(`promotion_id.in.(${promotionIds.join(',')})`);
      if (discountIds.length > 0) filters.push(`discount_id.in.(${discountIds.join(',')})`);

      const { data, error } = await supabase
        .from('offer_targets')
        .select('id,promotion_id,discount_id,kind,package_id,tier_id,vendor_service_id')
        .or(filters.join(','));
      if (error) throw error;
      return (data ?? []) as OfferTargetModel[];
    },
  });
}

/**
 * What each of this vendor's codes actually returned.
 *
 * Its own read rather than columns on `useDiscounts`, because it counts rows in
 * `discount_redemptions` and a grid of twenty cards must not each run that
 * count. `used_count` on the discount row is the cheap cache the cards use for
 * "X of Y left"; this is the breakdown behind it — reserved, redeemed, released
 * — which is the only view that tells a vendor whether an offer is bringing in
 * bookings or just quotes.
 *
 * A failure here costs the cards their performance line and nothing else, so it
 * must never gate the screen.
 */
export function useOfferPerformance(vendorId?: string) {
  return useQuery({
    queryKey: ['v-offer-performance', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('vendor_offer_performance', {
        p_vendor_id: vendorId!,
      });
      if (error) throw error;
      return (data ?? []) as OfferPerformanceModel[];
    },
  });
}

export function useVendorReviews(vendorId?: string) {
  return useQuery({
    queryKey: ['v-reviews', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data } = await supabase
        .from('reviews')
        .select('id,rating,title,body,status,created_at,client_id,review_responses(id,body)')
        .eq('vendor_id', vendorId!)
        .order('created_at', { ascending: false });
      return (data ?? []) as ReviewModel[];
    },
  });
}

export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data } = await supabase
        .from('pricing_plans')
        .select(
          'id,key,name,description,price,currency,billing_cycle,sort_order,plan_features(feature_key,value)',
        )
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      return (data ?? []) as PlanModel[];
    },
  });
}

// ---------- Messaging ----------

/** Query keys the realtime subscription invalidates. */
export const MESSAGING_KEYS = {
  conversations: ['conversations'] as const,
  unread: ['conversation-unread'] as const,
  unreadTotal: ['unread-messages'] as const,
  thread: (id: string) => ['messages', id] as const,
};

// PostgREST infers a row type from the *literal* text of the select, so this
// must stay a single string literal — concatenating it widens the type to
// `string` and the query starts returning `GenericStringError[]`.
const MESSAGE_SELECT =
  'id,sender_id,body,created_at,edited_at,is_system,moderation_status,message_attachments(id,storage_path,file_name,mime_type,size_bytes,scan_status)';

/**
 * The vendor's inbox, with the counterparty and unread count already resolved
 * by `get_my_conversations()`. See `ConversationModel` for why this cannot be a
 * plain select.
 */
export function useConversations({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: MESSAGING_KEYS.conversations,
    // The inbox always wants this; the top bar's preview panel only wants it
    // once the user opens the panel. Same key either way, so the page finds a
    // warm cache when the panel got there first.
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_conversations');
      if (error) throw error;
      return (data ?? []) as ConversationModel[];
    },
  });
}

/** Single number for the sidebar badge. */
export function useUnreadMessageCount() {
  return useQuery({
    queryKey: MESSAGING_KEYS.unreadTotal,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_unread_message_count');
      if (error) throw error;
      return (data as number) ?? 0;
    },
  });
}

/**
 * Clients this vendor may start a conversation with — those with an existing
 * booking or quotation. Same predicate the RPC enforces, so the picker can
 * never offer a name the send would then refuse.
 */
export function useVendorClients() {
  return useQuery({
    queryKey: ['vendor-clients'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_vendor_clients');
      if (error) throw error;
      return (data ?? []) as VendorClientModel[];
    },
  });
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: MESSAGING_KEYS.thread(conversationId),
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(MESSAGE_SELECT)
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as MessageModel[];
    },
  });
}

export const NOTIFICATIONS_PAGE_SIZE = 25;

const NOTIFICATION_SELECT = 'id,trigger_key,title,body,data,channel,read_at,created_at';

/**
 * The notification feed, paged.
 *
 * Infinite rather than a flat `limit(50)`: the feed is the vendor's whole
 * history with the platform and a fixed cap silently hid the tail of it. The
 * exact `count` rides along on every page so the summary tiles and tab badges
 * can describe the entire feed while only the first page is in hand.
 */
export function useNotifications() {
  return useInfiniteQuery({
    queryKey: ['notifications'],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<NotificationPage> => {
      const from = pageParam * NOTIFICATIONS_PAGE_SIZE;
      const { data, count, error } = await supabase
        .from('notifications')
        .select(NOTIFICATION_SELECT, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, from + NOTIFICATIONS_PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: (data ?? []) as NotificationModel[], total: count ?? 0 };
    },
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((n, p) => n + p.rows.length, 0);
      // Stop on a short page too: `total` can shrink under us if rows are
      // purged between requests, and an empty page would otherwise loop.
      if (lastPage.rows.length === 0 || loaded >= lastPage.total) return undefined;
      return pages.length;
    },
  });
}

/**
 * The newest few notifications, for the top bar's preview panel.
 *
 * A separate query from the paged feed rather than a read of its first page:
 * that one is an infinite query with an exact `count`, and mounting it in the
 * shell would put the whole feed — and its paging state — behind every screen
 * in the portal to render six rows. Prefixed under `['notifications']` so the
 * feed's existing invalidations refresh this too.
 */
export function useRecentNotifications(
  limit: number,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ['notifications', 'recent', limit],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select(NOTIFICATION_SELECT)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as NotificationModel[];
    },
  });
}

/** Flip one notification's read state. `read_at = null` puts it back to unread. */
export function useSetNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, read }: { ids: string[]; read: boolean }) => {
      if (ids.length === 0) return;
      // A direct update rather than `mark_notification_read`: that RPC only
      // stamps, and marking something back to unread is half of what makes
      // opening a notification a reversible act. RLS (`notif_update`) already
      // confines the write to the caller's own rows.
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: read ? new Date().toISOString() : null })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: async () => {
      // Both keys: the feed drives the page, `unread` the sidebar badge.
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['notifications'] }),
        qc.invalidateQueries({ queryKey: ['unread'] }),
      ]);
    },
  });
}

/** Stamp every unread notification for the signed-in user. */
export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('mark_all_notifications_read');
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['notifications'] }),
        qc.invalidateQueries({ queryKey: ['unread'] }),
      ]);
    },
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['unread'],
    queryFn: async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null);
      return count ?? 0;
    },
  });
}

// ---------- Service coverage ----------

/**
 * The regions a vendor can declare coverage for. Reference data that changes
 * rarely and is world-readable (`ref_read_regions`), so it's cached for the
 * session rather than refetched per visit to the profile.
 */
export function useServiceRegions() {
  return useQuery({
    queryKey: ['service-regions'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_regions')
        .select('key,name,scope')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ServiceRegionModel[];
    },
  });
}

/**
 * The regions this vendor currently covers, as reference keys.
 *
 * Returned as keys rather than join-table ids because that is what both the
 * picker and `set_vendor_service_regions` speak — the row ids are an
 * implementation detail of the join table and never leave the database.
 */
export function useVendorCoverage(vendorId?: string) {
  return useQuery({
    queryKey: ['v-coverage', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_service_regions')
        .select('service_regions(key)')
        .eq('vendor_id', vendorId!);
      if (error) throw error;
      return ((data ?? []) as { service_regions: { key: string } | { key: string }[] | null }[])
        .map((row) => one(row.service_regions)?.key)
        .filter((key): key is string => Boolean(key));
    },
  });
}

/**
 * Replaces this vendor's coverage with `keys`.
 *
 * Goes through `set_vendor_service_regions` rather than issuing a delete and an
 * insert from here: coverage is a set, and a failure between two client-side
 * statements would leave the vendor with less coverage than they started with.
 */
export function useSetVendorCoverage(vendorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (keys: string[]) => {
      const { error } = await supabase.rpc('set_vendor_service_regions', {
        p_vendor_id: vendorId,
        p_keys: keys,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['v-coverage', vendorId] }),
  });
}

// ---------- Subscription payments ----------

/** The vendor's subscription with its plan — the row the subscription page is about. */
export function useMySubscription(vendorId: string | undefined) {
  return useQuery({
    queryKey: ['my-subscription-detail', vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(
          'id,status,plan_id,current_period_start,current_period_end,trial_ends_at,grace_until,auto_renew,plan:pricing_plans(name,billing_cycle,price,currency)',
        )
        .eq('vendor_id', vendorId!)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as unknown as Omit<MySubscriptionModel, 'plan'> & {
        plan: MySubscriptionModel['plan'] | MySubscriptionModel['plan'][];
      };
      return { ...row, plan: one(row.plan) } as MySubscriptionModel;
    },
    enabled: !!vendorId,
  });
}

/** One subscription by id, for the return page — same shape, same RLS. */
export function useSubscriptionById(subscriptionId: string | undefined) {
  return useQuery({
    queryKey: ['subscription', subscriptionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(
          'id,status,plan_id,current_period_start,current_period_end,trial_ends_at,grace_until,auto_renew,plan:pricing_plans(name,billing_cycle,price,currency)',
        )
        .eq('id', subscriptionId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as unknown as Omit<MySubscriptionModel, 'plan'> & {
        plan: MySubscriptionModel['plan'] | MySubscriptionModel['plan'][];
      };
      return { ...row, plan: one(row.plan) } as MySubscriptionModel;
    },
    enabled: !!subscriptionId,
  });
}

/**
 * What a plan would cost this vendor right now — `subscription_price_plan`,
 * the same function `activate_subscription_payment` prices the charge with,
 * so the preview and the charge cannot disagree. Unlike the escrow quote it
 * does not vary by rail: the platform absorbs the processing fee.
 */
export function useSubscriptionQuote(
  vendorId: string | undefined,
  planId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ['subscription-quote', vendorId, planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('subscription_price_plan', { p_vendor_id: vendorId!, p_plan_id: planId! })
        .maybeSingle();
      if (error) throw error;
      return (data as SubscriptionQuoteModel) ?? null;
    },
    enabled: enabled && !!vendorId && !!planId,
    placeholderData: (previous) => previous,
  });
}

/**
 * Open a hosted checkout for a plan.
 *
 * Every figure is derived server-side from the plan; the browser sends only
 * which plan, which vendor and which rail. Card and wallet details are
 * entered on the provider's own pages and never reach Sinnapi.
 */
export function useStartSubscriptionPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      idempotencyKey,
      ...input
    }: {
      vendorId: string;
      planId: string;
      provider: 'pesapal' | 'paypal';
      method: 'mtn_momo' | 'airtel_money' | 'card';
      /**
       * Stable for one checkout attempt, regenerated only when the plan or
       * the rail changes (see `useSubscriptionCheckout`). A repeat of the
       * same request reaches the server with the same key and is handed the
       * checkout it already opened rather than a second one.
       */
      idempotencyKey: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: input,
        headers: { 'Idempotency-Key': idempotencyKey },
      });
      if (error) {
        // The function returns a typed reason in the body; surface that rather
        // than the generic "Edge Function returned a non-2xx status code".
        let detail = error.message;
        const context = (error as { context?: Response }).context;
        if (context && typeof context.json === 'function') {
          try {
            const payload = (await context.json()) as { error?: string };
            if (payload?.error) detail = payload.error;
          } catch {
            /* body already consumed or not JSON — fall through */
          }
        }
        throw new Error(detail);
      }
      return data as {
        purpose: 'subscription';
        paymentId: string;
        subscriptionId: string;
        checkoutUrl: string;
        amount: number;
        currency: string;
        /** True when this was the checkout an earlier identical request opened. */
        replayed: boolean;
      };
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['my-subscription-detail', vars.vendorId] });
      qc.invalidateQueries({ queryKey: ['subscription-payments'] });
    },
  });
}

/** Human-readable reasons for the failures the subscription RPCs can raise. */
const SUBSCRIPTION_ERRORS: Record<string, string> = {
  plan_not_found: 'That plan no longer exists. Pick another from the list.',
  plan_inactive: 'That plan is no longer offered. Pick another from the list.',
  // Seeded catalogues carry a zero price until Finance sets real ones. A
  // zero-amount checkout is refused server-side rather than activated for
  // nothing, because the whole flow exists to put a payment behind a plan.
  plan_is_free: 'This plan has no price set yet, so it cannot be paid for. Please contact support.',
  vendor_not_active:
    'Your vendor account is not active, so a subscription cannot be started. Please contact support.',
  // A checkout for this subscription is still open — most often the
  // mobile-money prompt from the first tap is still waiting on the phone.
  // Once it lapses the next Pay opens a fresh one, so "wait" is real advice.
  payment_already_in_flight:
    'A payment for your subscription is already in progress. Check your phone for a payment ' +
    'prompt, or wait a few minutes and try again.',
  paypal_requires_card: 'PayPal only supports card payments.',
  ambiguous_purpose: 'Something went wrong preparing this payment. Please reload and try again.',
  booking_id_or_plan_id_required:
    'Something went wrong preparing this payment. Please reload and try again.',
  vendor_id_required: 'Something went wrong preparing this payment. Please reload and try again.',
  invalid_plan_id: 'That plan is no longer valid. Pick another from the list.',
  invalid_vendor_id: 'Something went wrong preparing this payment. Please reload and try again.',
  subscription_activation_failed: 'We could not start this payment. Please try again in a moment.',
  forbidden: 'You do not have permission to manage this subscription.',
  not_found: 'We could not find your vendor account.',
};

/**
 * The subscription RPCs refuse the same way the escrow ones do, so they are
 * read the same way — see `rpcError.ts` in `@sinnapi/ui`. It matters most on
 * a payment button: `[object Object]` there is the version of this bug that
 * stops someone from paying.
 */
export function subscriptionErrorMessage(error: unknown): string {
  return rpcErrorMessage(error, SUBSCRIPTION_ERRORS);
}

/** Every payment made against the subscription, newest first. */
export function useSubscriptionPayments(subscriptionId: string | undefined) {
  return useQuery({
    queryKey: ['subscription-payments', subscriptionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(
          'id,status,amount,currency,provider,provider_method,provider_ref,failure_reason,paid_at,created_at,target_plan:pricing_plans!payments_target_plan_id_fkey(name)',
        )
        .eq('subscription_id', subscriptionId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (
        (data ?? []) as unknown as (Omit<SubscriptionPaymentModel, 'target_plan'> & {
          target_plan: { name: string } | { name: string }[] | null;
        })[]
      ).map((row) => ({ ...row, target_plan: one(row.target_plan) })) as SubscriptionPaymentModel[];
    },
    enabled: !!subscriptionId,
  });
}

/** The subscription's append-only history, newest first. */
export function useSubscriptionEvents(subscriptionId: string | undefined) {
  return useQuery({
    queryKey: ['subscription-events', subscriptionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_events')
        .select('id,event_type,payment_id,metadata,occurred_at')
        .eq('subscription_id', subscriptionId!)
        .order('occurred_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as SubscriptionEventModel[];
    },
    enabled: !!subscriptionId,
  });
}

/** One payment row, as the payer, for the return page. */
export function usePaymentById(
  paymentId: string | undefined,
  options: { refetchInterval?: (query: { state: { data?: unknown } }) => number | false } = {},
) {
  return useQuery({
    queryKey: ['payment', paymentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(
          'id,purpose,subscription_id,amount,currency,status,provider,provider_method,provider_ref,failure_reason,paid_at,created_at',
        )
        .eq('id', paymentId!)
        .maybeSingle();
      if (error) throw error;
      return (data as PaymentReturnModel) ?? null;
    },
    enabled: !!paymentId,
    refetchInterval: options.refetchInterval,
  });
}
