import type { MetadataRoute } from 'next';
import { getAllVendorSlugs, getEvents } from '@/lib/queries';
import { SITE, VENDOR_CATEGORIES, SERVICE_REGIONS } from '@/lib/config/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url;
  const now = new Date();

  const staticRoutes = [
    '',
    '/vendors',
    '/events',
    '/about',
    '/mission',
    '/vision',
    '/story',
    '/how-it-works',
    '/pricing',
    '/faq',
    '/contact',
    '/apply',
    '/terms',
    '/privacy',
    '/escrow-policy',
    '/vendor-terms',
  ].map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: p === '' ? 1 : 0.7,
  }));

  const categoryRoutes = VENDOR_CATEGORIES.map((c) => ({
    url: `${base}/vendors/category/${c}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));
  const regionRoutes = SERVICE_REGIONS.map((r) => ({
    url: `${base}/vendors/region/${r}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  const [slugs, events] = await Promise.all([getAllVendorSlugs(), getEvents(200)]);
  const vendorRoutes = slugs.map((s) => ({
    url: `${base}/vendors/${s}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));
  const eventRoutes = events.map((e) => ({
    url: `${base}/events/${e.id}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...categoryRoutes, ...regionRoutes, ...vendorRoutes, ...eventRoutes];
}
