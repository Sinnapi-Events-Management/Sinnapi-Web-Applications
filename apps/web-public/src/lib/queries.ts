import { createPublicClient } from './supabase/server';
import type {
  VendorCardModel,
  VendorDetailModel,
  VendorMediaModel,
  EventCardModel,
  PublicReview,
} from './types';

// Public columns only — vendor email/phone are intentionally excluded everywhere.
const VENDOR_CARD_COLS =
  'id,slug,business_name,base_city,biography,primary_image_url,profile_image_url,starting_price,starting_price_currency,avg_rating,review_count,is_featured';

export type VendorFilters = {
  category?: string;
  region?: string;
  q?: string;
  minRating?: number;
};

export async function getVendors(
  filters: VendorFilters = {},
  limit = 24,
): Promise<VendorCardModel[]> {
  const supa = createPublicClient();
  if (!supa) return [];
  let query = supa
    .from('vendors')
    .select(VENDOR_CARD_COLS)
    .eq('status', 'active')
    .eq('visibility', 'public')
    .is('deleted_at', null)
    .order('is_featured', { ascending: false })
    .order('search_weight', { ascending: false })
    .order('avg_rating', { ascending: false })
    .limit(limit);

  if (filters.minRating) query = query.gte('avg_rating', filters.minRating);
  if (filters.q) query = query.ilike('business_name', `%${filters.q}%`);
  // category / region filtering go through join tables; kept simple here.

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as VendorCardModel[];
}

export async function getFeaturedVendors(limit = 6): Promise<VendorCardModel[]> {
  const supa = createPublicClient();
  if (!supa) return [];
  const { data } = await supa
    .from('vendors')
    .select(VENDOR_CARD_COLS)
    .eq('status', 'active')
    .eq('visibility', 'public')
    .is('deleted_at', null)
    .eq('is_featured', true)
    .order('avg_rating', { ascending: false })
    .limit(limit);
  return (data ?? []) as VendorCardModel[];
}

export async function getVendorBySlug(slug: string): Promise<VendorDetailModel | null> {
  const supa = createPublicClient();
  if (!supa) return null;
  const { data } = await supa
    .from('vendors')
    .select(`${VENDOR_CARD_COLS},website,pricing_model,lead_time,years_in_operation`)
    .eq('slug', slug)
    .eq('status', 'active')
    .eq('visibility', 'public')
    .is('deleted_at', null)
    .maybeSingle();
  return (data as VendorDetailModel) ?? null;
}

export async function getVendorMedia(vendorId: string): Promise<VendorMediaModel[]> {
  const supa = createPublicClient();
  if (!supa) return [];
  const { data } = await supa
    .from('vendor_media')
    .select('id,media_type,url,caption')
    .eq('vendor_id', vendorId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });
  return (data ?? []) as VendorMediaModel[];
}

export async function getVendorReviews(vendorId: string, limit = 20): Promise<PublicReview[]> {
  const supa = createPublicClient();
  if (!supa) return [];
  const { data } = await supa
    .from('reviews')
    .select('id,rating,title,body,created_at')
    .eq('vendor_id', vendorId)
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as PublicReview[];
}

export async function getAllVendorSlugs(): Promise<string[]> {
  const supa = createPublicClient();
  if (!supa) return [];
  const { data } = await supa
    .from('vendors')
    .select('slug')
    .eq('status', 'active')
    .eq('visibility', 'public')
    .is('deleted_at', null);
  return (data ?? []).map((v: { slug: string }) => v.slug);
}

export async function getEvents(limit = 24): Promise<EventCardModel[]> {
  const supa = createPublicClient();
  if (!supa) return [];
  const { data } = await supa
    .from('events')
    .select(
      'id,title,description,event_type,event_date,location,budget_min,budget_max,currency,cover_image_url,source',
    )
    .eq('status', 'published')
    .eq('is_public', true)
    .is('deleted_at', null)
    .order('event_date', { ascending: false })
    .limit(limit);
  return (data ?? []) as EventCardModel[];
}

export async function getEventById(id: string): Promise<EventCardModel | null> {
  const supa = createPublicClient();
  if (!supa) return null;
  const { data } = await supa
    .from('events')
    .select(
      'id,title,description,event_type,event_date,location,budget_min,budget_max,currency,cover_image_url,source',
    )
    .eq('id', id)
    .eq('status', 'published')
    .eq('is_public', true)
    .is('deleted_at', null)
    .maybeSingle();
  return (data as EventCardModel) ?? null;
}

export async function getPricingPlans() {
  const supa = createPublicClient();
  if (!supa) return [];
  const { data } = await supa
    .from('pricing_plans')
    .select('id,key,name,description,price,currency,billing_cycle,sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return data ?? [];
}

/** {key,name} pairs for a reference lookup (categories/regions). */
export type ReferenceOption = { key: string; name: string };

/** Service categories (public read) — powers the vendor application form. */
export async function getServiceCategories(): Promise<ReferenceOption[]> {
  const supa = createPublicClient();
  if (!supa) return [];
  const { data } = await supa
    .from('service_categories')
    .select('key,name')
    .order('sort_order', { ascending: true });
  return (data ?? []) as ReferenceOption[];
}

/** Service regions (public read) — powers the vendor application form. */
export async function getServiceRegions(): Promise<ReferenceOption[]> {
  const supa = createPublicClient();
  if (!supa) return [];
  const { data } = await supa
    .from('service_regions')
    .select('key,name')
    .order('sort_order', { ascending: true });
  return (data ?? []) as ReferenceOption[];
}
