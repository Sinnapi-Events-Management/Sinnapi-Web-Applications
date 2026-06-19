// Client-portal read models. These describe the shapes returned by the
// queries in src/hooks/queries.ts. The Supabase client is untyped, so each
// query asserts one of these shapes ONCE at the data boundary.

// Embedded (to-one) relations as returned by PostgREST. Use one<T>() at call
// sites to normalize the object-or-array shape.
export type VendorRefModel = {
  business_name: string;
  slug: string | null;
  primary_image_url: string | null;
};

export type VendorNameRefModel = {
  business_name: string;
};

export type VendorNameSlugRefModel = {
  business_name: string;
  slug: string | null;
};

export type BookingRefModel = {
  reference_no: string | null;
};

// ---------- Vendors ----------
export type VendorCardModel = {
  id: string;
  slug: string;
  business_name: string;
  base_city: string | null;
  primary_image_url: string | null;
  profile_image_url: string | null;
  starting_price: number | null;
  starting_price_currency: string | null;
  avg_rating: number;
  review_count: number;
  is_featured: boolean;
};

export type VendorDetailModel = VendorCardModel & {
  biography: string | null;
  website: string | null;
  pricing_model: string | null;
  lead_time: string | null;
  years_in_operation: string | null;
};

// ---------- Bookings ----------
export type BookingListModel = {
  id: string;
  reference_no: string | null;
  status: string;
  event_date: string | null;
  amount: number | null;
  currency: string | null;
  vendor_id: string | null;
  vendors: VendorRefModel | VendorRefModel[] | null;
};

// useBooking selects '*' plus the vendors relation.
export type BookingDetailModel = {
  id: string;
  reference_no: string | null;
  status: string;
  event_date: string | null;
  location: string | null;
  amount: number | null;
  currency: string | null;
  payment_type: string | null;
  vendor_id: string | null;
  vendors: VendorRefModel | VendorRefModel[] | null;
};

// ---------- Quotations ----------
export type QuotationListModel = {
  id: string;
  reference_no: string | null;
  status: string;
  total: number | null;
  currency: string | null;
  valid_until: string | null;
  created_at: string;
  vendor_id: string | null;
  vendors: VendorNameSlugRefModel | VendorNameSlugRefModel[] | null;
};

// ---------- Events ----------
export type MyEventModel = {
  id: string;
  title: string;
  event_type: string | null;
  event_date: string | null;
  location: string | null;
  status: string;
  source: string;
};

// ---------- Escrow / Payments ----------
export type EscrowModel = {
  id: string;
  status: string;
  gross_amount: number | null;
  net_payout_amount: number | null;
  currency: string | null;
  booking_id: string | null;
  bookings: BookingRefModel | BookingRefModel[] | null;
  vendors: VendorNameRefModel | VendorNameRefModel[] | null;
};

export type PaymentModel = {
  id: string;
  purpose: string;
  amount: number | null;
  currency: string | null;
  status: string;
  provider: string | null;
  provider_method: string | null;
  paid_at: string | null;
  created_at: string;
};

// ---------- Messaging ----------
export type ConversationModel = {
  id: string;
  type: string;
  subject: string | null;
  last_message_at: string | null;
  status: string;
  vendors: VendorNameRefModel | VendorNameRefModel[] | null;
};

export type MessageModel = {
  id: string;
  sender_id: string | null;
  body: string | null;
  created_at: string;
  moderation_status: string | null;
};

// ---------- Reviews / Notifications / Profile ----------
export type ReviewModel = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: string;
  created_at: string;
  vendors: VendorNameSlugRefModel | VendorNameSlugRefModel[] | null;
};

export type NotificationModel = {
  id: string;
  trigger_key: string;
  title: string | null;
  body: string | null;
  read_at: string | null;
  created_at: string;
};

export type ProfileModel = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  locale: string | null;
  preferred_currency: string | null;
  mfa_enabled: boolean;
};
