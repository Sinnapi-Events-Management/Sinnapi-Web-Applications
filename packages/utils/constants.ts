/**
 * Sinnapi shared constants — single source of truth for cross-app data.
 * Pure data (no React / no MUI), so this file is safe to import anywhere,
 * including server components, build scripts, and non-React contexts.
 */

/**
 * Company contact details and social profiles.
 */
export const CONTACT = {
  email: 'support@sinnapi.com',
  phone: '+256 700 988931',
  whatsapp: '+256 700 988931',
  address: 'Kampala, Uganda',
  social: {
    instagram: 'https://www.instagram.com/sinnapi_inc',
    facebook: 'https://www.facebook.com/cosmoweddings',
    twitter: 'https://x.com/Sinnapi_Inc',
    youtube: 'https://youtube.com/@sinnapi-inc',
    linkedin: 'https://www.linkedin.com/company/sinnapi',
    tiktok: 'https://www.tiktok.com/@sinnapi',
  },
} as const;

export type Contact = typeof CONTACT;

/**
 * The public website, as printed and as linked from documents that leave the
 * platform (quotation PDFs). The link carries UTM tags so visits from a
 * forwarded quote show up as their own source in analytics; the printed text
 * stays clean.
 */
export const SITE = {
  display: 'www.sinnapi.com',
  documentLink:
    'https://www.sinnapi.com/?utm_source=quotation_pdf&utm_medium=document&utm_campaign=vendor_quotation',
} as const;

/** Shared client-side feature switches for portal experiences. */
export const FEATURES = {
  // Set true to restore client-vendor messaging in both portal frontends.
  clientVendorMessaging: false,
} as const;

export function isClientVendorMessageNotification(notification: {
  triggerKey: string;
  data: Record<string, unknown> | null;
}): boolean {
  return (
    !FEATURES.clientVendorMessaging &&
    notification.triggerKey.startsWith('message.') &&
    notification.data?.conversation_type === 'client_vendor'
  );
}
