// Minimal public-facing read models (subset of the DB; contacts are NEVER
// exposed on the public site per the approved discovery rules).

export type VendorCardModel = {
  id: string;
  slug: string;
  business_name: string;
  base_city: string | null;
  biography: string | null;
  primary_image_url: string | null;
  profile_image_url: string | null;
  starting_price: number | null;
  starting_price_currency: string | null;
  avg_rating: number;
  review_count: number;
  is_featured: boolean;
};

export type VendorDetailModel = VendorCardModel & {
  website: string | null;
  pricing_model: string | null;
  lead_time: string | null;
  years_in_operation: string | null;
};

export type VendorMediaModel = {
  id: string;
  media_type: "image" | "video";
  url: string | null;
  caption: string | null;
};

export type EventCardModel = {
  id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  event_date: string | null;
  location: string | null;
  cover_image_url: string | null;
  source: "admin" | "client";
};

export type PublicReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
};
