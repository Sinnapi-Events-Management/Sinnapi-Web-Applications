import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/sign-in', '/sign-up', '/apply'] }],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
