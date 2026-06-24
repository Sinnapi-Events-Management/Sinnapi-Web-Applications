/**
 * Sinnapi shared constants — single source of truth for cross-app data.
 * Pure data (no React / no MUI), so this file is safe to import anywhere,
 * including server components, build scripts, and non-React contexts.
 */

/**
 * Company contact details and social profiles.
 *
 * NOTE: these are placeholders — replace with the real values before launch.
 * Phone/WhatsApp use E.164-friendly display strings; consumers derive `tel:`
 * and `wa.me` links by stripping non-digits, so keep the leading country code.
 */
export const CONTACT = {
  email: 'support@sinnapi.com',
  phone: '+256 700 988931',
  whatsapp: '+256 700 988931',
  address: 'Kampala, Uganda',
  social: {
    instagram: 'https://www.instagram.com/sinnapi_inc',
    facebook: 'https://www.facebook.com/cosmoweddings',
    x: 'https://x.com/sinnapi',
    linkedin: 'https://linkedin.com/company/sinnapi',
    tiktok: 'https://www.tiktok.com/@sinnapi',
  },
} as const;

export type Contact = typeof CONTACT;
