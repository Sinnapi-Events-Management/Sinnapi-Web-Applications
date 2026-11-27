// Phone numbers, in the one format WhatsApp accepts: E.164 (`+256772123456`).
//
// Every phone input in every portal goes through these helpers, and every
// number they produce is what the database's generated `profiles.phone_e164`
// column accepts — so a number typed here is a number WhatsApp can reach.
//
// Product rules (docs/whatsapp-notifications.md):
//   * a NEW number defaults to Uganda (+256), and the person can pick another
//     country;
//   * an EXISTING number without a country code is never silently given one —
//     the field shows it with no country chosen, and the person picks it.
//
// Pure: no React, no I/O. Validation uses libphonenumber-js (Google's
// libphonenumber rules), so "+256 77 12" is rejected as too short for Uganda.
import {
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';

export type { CountryCode };

export const DEFAULT_PHONE_COUNTRY: CountryCode = 'UG';

/**
 * Shown first in the country picker: Uganda, then the neighbours most of the
 * marketplace's clients and vendors come from. Everything else follows A–Z.
 */
const PINNED: CountryCode[] = ['UG', 'KE', 'TZ', 'RW', 'SS', 'CD', 'BI'];

export interface PhoneCountry {
  code: CountryCode;
  name: string;
  /** Calling code without the plus, e.g. "256". */
  dial: string;
}

let cached: PhoneCountry[] | null = null;

/** Every country libphonenumber knows, pinned ones first, then by name. */
export function phoneCountries(): PhoneCountry[] {
  if (cached) return cached;
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    names = null; // very old browser: fall back to the ISO code
  }
  const all = getCountries().map((code) => ({
    code,
    name: names?.of(code) ?? code,
    dial: getCountryCallingCode(code),
  }));
  const pinned = PINNED.map((c) => all.find((x) => x.code === c)).filter((x): x is PhoneCountry =>
    Boolean(x),
  );
  const rest = all
    .filter((x) => !PINNED.includes(x.code))
    .sort((a, b) => a.name.localeCompare(b.name));
  cached = [...pinned, ...rest];
  return cached;
}

export function phoneCountry(code: CountryCode | null | undefined): PhoneCountry | null {
  if (!code) return null;
  return phoneCountries().find((c) => c.code === code) ?? null;
}

/**
 * Split a stored value into what the input shows.
 *
 *   ''               → Uganda, empty number       (new entry: default country)
 *   '+256772123456'  → Uganda, '772123456'
 *   '0772 123 456'   → NO country, '0772 123 456'  (legacy: never guessed)
 */
export function splitPhone(value: string | null | undefined): {
  country: CountryCode | null;
  national: string;
} {
  const raw = (value ?? '').trim();
  if (!raw) return { country: DEFAULT_PHONE_COUNTRY, national: '' };
  if (raw.startsWith('+')) {
    const parsed = parsePhoneNumberFromString(raw);
    if (parsed) {
      // Shared calling codes (+1, +7, +44 …) may not resolve to one country;
      // the first country for the code is the right display either way.
      const country =
        parsed.country ??
        phoneCountries().find((c) => c.dial === parsed.countryCallingCode)?.code ??
        null;
      return { country, national: parsed.nationalNumber };
    }
  }
  return { country: null, national: raw };
}

/**
 * Combine the picker and the typed number into the value to store.
 *
 * Returns '' for an empty number, E.164 when the country is chosen (a leading
 * trunk `0` is dropped: Uganda + `0772…` → `+256772…`), and the raw text when
 * no country is chosen — which `phoneProblem` then reports, so the form cannot
 * save it until the person picks one.
 */
export function joinPhone(country: CountryCode | null, national: string): string {
  const typed = national.trim();
  if (!typed) return '';
  if (typed.startsWith('+')) {
    return parsePhoneNumberFromString(typed)?.number ?? typed.replace(/[^\d+]/g, '');
  }
  if (!country) return typed;
  const parsed = parsePhoneNumberFromString(typed, country);
  if (parsed) return parsed.number;
  return `+${getCountryCallingCode(country)}${typed.replace(/\D/g, '').replace(/^0+/, '')}`;
}

/** True for a complete, dialable international number. */
export function isValidPhone(value: string | null | undefined): boolean {
  const v = (value ?? '').trim();
  return /^\+[1-9]\d{7,14}$/.test(v) && isValidPhoneNumber(v);
}

/**
 * What is wrong with a value, in words a person can act on, or null when
 * nothing is. Empty is fine unless `required`.
 */
export function phoneProblem(value: string | null | undefined, required = false): string | null {
  const v = (value ?? '').trim();
  if (!v) return required ? 'Enter a phone number.' : null;
  if (!v.startsWith('+')) return 'Choose the country for this number.';
  if (isValidPhone(v)) return null;
  const parsed = parsePhoneNumberFromString(v);
  const name = phoneCountry(parsed?.country)?.name;
  return name ? `Enter a valid ${name} number.` : 'Enter a valid phone number.';
}

/** `+256772123456` → `+256 772 123456`, for showing a number back to its owner. */
export function formatPhone(value: string | null | undefined): string {
  const v = (value ?? '').trim();
  if (!v) return '';
  return parsePhoneNumberFromString(v)?.formatInternational() ?? v;
}
