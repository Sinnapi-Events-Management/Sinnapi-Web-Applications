// Cryptographically-secure one-time password generator for server-provisioned
// staff accounts (create-staff, reset-staff-password). It uses the Web Crypto
// CSPRNG — never Math.random — and guarantees at least one character from each
// class so the result satisfies common password policies. The password is
// single-use: the account is flagged `must_change_password`, forcing the user to
// pick their own on first sign-in (see admin-portal ProtectedRoute).

// Ambiguous glyphs (0/O, 1/l/I) are excluded — the password is transcribed once
// from an email, so legibility matters more than raw alphabet size.
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGIT = '23456789';
const SYMBOL = '!@#$%^&*-_?';
const ALL = LOWER + UPPER + DIGIT + SYMBOL;

// Uniform integer in [0, max) via rejection sampling — plain `% max` would bias
// toward the low end whenever max doesn't divide 2^32 evenly.
function randInt(max: number): number {
  const limit = Math.floor(0xffffffff / max) * max;
  const buf = new Uint32Array(1);
  let x: number;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % max;
}

function pick(chars: string): string {
  return chars[randInt(chars.length)];
}

/**
 * Generate a random password of `length` characters (minimum 12) with at least
 * one lowercase, uppercase, digit and symbol. The four guaranteed characters are
 * Fisher–Yates shuffled into the rest so their classes aren't always in a fixed
 * position.
 */
export function generatePassword(length = 16): string {
  const len = Math.max(12, length);
  const chars = [pick(LOWER), pick(UPPER), pick(DIGIT), pick(SYMBOL)];
  while (chars.length < len) chars.push(pick(ALL));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
