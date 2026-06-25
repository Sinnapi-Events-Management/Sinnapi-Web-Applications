import { VENDOR_CATEGORIES, SERVICE_REGIONS, titleize } from '@/lib/config/site';

export type FilterOption = { value: string; label: string };

/** Category options for the vendor filter, derived once from site config. */
export const CATEGORY_OPTIONS: FilterOption[] = VENDOR_CATEGORIES.map((c) => ({
  value: c,
  label: titleize(c),
}));

/** Service-region options for the vendor filter, derived once from site config. */
export const REGION_OPTIONS: FilterOption[] = SERVICE_REGIONS.map((r) => ({
  value: r,
  label: titleize(r),
}));
