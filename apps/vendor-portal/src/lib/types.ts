// Read models for the vendor portal. The Supabase client is untyped, so query
// results are effectively `any`; we assert these concrete shapes ONCE at the
// query boundary (see src/hooks/queries.ts) so components stay fully typed.
//
// Embedded relations are returned by PostgREST as an object OR an array; such
// fields are typed as `T | T[] | null` and normalized with `one<T>()` (rel.ts).

export type ProfileRel = {
  full_name: string | null;
};

export type ProfileContactRel = {
  full_name: string | null;
  email: string | null;
};

export type VendorRel = {
  business_name: string | null;
};

export type BookingRel = {
  reference_no: string | null;
};

export type ProfileModel = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  preferred_currency: string | null;
};

export type MyApplicationModel = {
  id: string;
  status: string;
  business_name: string | null;
  is_reapplication: boolean | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  created_at: string;
};

export type VendorBookingModel = {
  id: string;
  reference_no: string | null;
  status: string;
  event_date: string | null;
  amount: number | null;
  currency: string | null;
  client_id: string | null;
  profiles: ProfileRel | ProfileRel[] | null;
};

export type VendorBookingDetailModel = {
  id: string;
  reference_no: string | null;
  status: string;
  event_date: string | null;
  amount: number | null;
  currency: string | null;
  location: string | null;
  payment_type: string | null;
  profiles: ProfileContactRel | ProfileContactRel[] | null;
};

export type VendorQuotationModel = {
  id: string;
  reference_no: string | null;
  status: string;
  total: number | null;
  currency: string | null;
  valid_until: string | null;
  request_details: string | null;
  created_at: string;
  client_id: string | null;
  profiles: ProfileRel | ProfileRel[] | null;
};

export type QuotationItemModel = {
  id: string;
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
  line_total: number | null;
};

export type QuotationDetailModel = {
  id: string;
  reference_no: string | null;
  status: string;
  total: number | null;
  currency: string | null;
  request_details: string | null;
  quotation_items: QuotationItemModel[] | null;
  profiles: ProfileRel | ProfileRel[] | null;
};

export type TemplateModel = {
  id: string;
  name: string;
  currency: string | null;
  notes: string | null;
  is_active: boolean | null;
  quote_template_items: { id: string }[] | null;
};

export type ServiceModel = {
  id: string;
  title: string;
  description: string | null;
  base_price: number | null;
  currency: string | null;
  is_active: boolean | null;
  category_id: string | null;
};

export type MediaModel = {
  id: string;
  media_type: string;
  url: string | null;
  caption: string | null;
  is_primary: boolean | null;
  sort_order: number | null;
};

export type AvailabilityModel = {
  id: string;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string | null;
  end_time: string | null;
  is_available: boolean | null;
};

export type BlockedDateModel = {
  id: string;
  blocked_date: string;
  reason: string | null;
  source: string | null;
};

export type PublicEventModel = {
  id: string;
  title: string;
  event_type: string | null;
  event_date: string | null;
  location: string | null;
  source: 'admin' | 'client' | string;
  description: string | null;
};

export type EventInterestModel = {
  event_id: string;
  status: string;
};

export type EscrowModel = {
  id: string;
  status: string;
  gross_amount: number | null;
  commission_amount: number | null;
  net_payout_amount: number | null;
  currency: string | null;
  bookings: BookingRel | BookingRel[] | null;
};

export type PayoutModel = {
  id: string;
  amount: number | null;
  currency: string | null;
  status: string;
  provider: string | null;
  approved_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type PromotionModel = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean | null;
};

export type DiscountModel = {
  id: string;
  code: string | null;
  type: string;
  value: number;
  currency: string | null;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean | null;
};

export type ReviewResponseRel = {
  id: string;
  body: string | null;
};

export type ReviewModel = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: string;
  created_at: string;
  review_responses: ReviewResponseRel | ReviewResponseRel[] | null;
  profiles: ProfileRel | ProfileRel[] | null;
};

export type PlanFeatureModel = {
  feature_key: string;
  value: string | boolean | null;
};

export type PlanModel = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  billing_cycle: string | null;
  sort_order: number | null;
  plan_features: PlanFeatureModel[] | null;
};

export type ConversationModel = {
  id: string;
  type: string;
  subject: string | null;
  last_message_at: string | null;
  status: string;
  vendors?: VendorRel | VendorRel[] | null;
};

export type MessageModel = {
  id: string;
  sender_id: string | null;
  body: string | null;
  created_at: string;
};

export type NotificationModel = {
  id: string;
  trigger_key: string;
  title: string | null;
  body: string | null;
  read_at: string | null;
  created_at: string;
};

export type VendorProfileEditModel = {
  id: string;
  business_name: string;
  biography: string | null;
  base_city: string | null;
  website: string | null;
  starting_price: number | null;
  starting_price_currency: string | null;
};
