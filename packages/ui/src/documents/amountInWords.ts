/**
 * "Two million Uganda shillings" — the amount received, written out, as
 * Ugandan receipts commonly print it under the figure.
 *
 * British usage ("one hundred AND five"), short scale (a billion is 10^9),
 * hyphenated tens ("fifty-three"). Minor units are spelt only for currencies
 * that have them, so UGX never says "and zero cents".
 */
import { minorUnit, roundMoney } from './money';

const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const SCALES = ['', 'thousand', 'million', 'billion', 'trillion'];

type CurrencyWords = { one: string; many: string; minorOne?: string; minorMany?: string };

const CURRENCY_WORDS: Readonly<Record<string, CurrencyWords>> = {
  UGX: { one: 'Uganda shilling', many: 'Uganda shillings' },
  USD: { one: 'US dollar', many: 'US dollars', minorOne: 'cent', minorMany: 'cents' },
};

function underHundred(n: number): string {
  if (n < 20) return ONES[n];
  const tens = TENS[Math.floor(n / 10)];
  return n % 10 ? `${tens}-${ONES[n % 10]}` : tens;
}

function underThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (!hundreds) return underHundred(rest);
  return rest ? `${ONES[hundreds]} hundred and ${underHundred(rest)}` : `${ONES[hundreds]} hundred`;
}

/** A whole number in words. */
export function integerInWords(value: number): string {
  let n = Math.floor(Math.abs(value));
  if (n === 0) return 'zero';

  const groups: number[] = [];
  while (n > 0) {
    groups.push(n % 1000);
    n = Math.floor(n / 1000);
  }
  if (groups.length > SCALES.length) return String(Math.floor(Math.abs(value)));

  const words: string[] = [];
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    const g = groups[i];
    if (!g) continue;
    // "one million AND five" — the British "and" before a final small group.
    if (i === 0 && words.length && g < 100) words.push('and');
    words.push(underThousand(g));
    if (SCALES[i]) words.push(SCALES[i]);
  }
  return words.join(' ');
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function amountInWords(amount: number, currency: string): string {
  const code = currency.toUpperCase();
  const names = CURRENCY_WORDS[code];
  const rounded = roundMoney(Math.abs(amount), code);
  const whole = Math.floor(rounded);
  const digits = minorUnit(code);
  const minor = digits ? Math.round((rounded - whole) * 10 ** digits) : 0;

  const wholeName = names ? (whole === 1 ? names.one : names.many) : code;
  let text = `${integerInWords(whole)} ${wholeName}`;

  if (minor > 0) {
    const minorName = names?.minorOne
      ? minor === 1
        ? names.minorOne
        : names.minorMany
      : 'hundredths';
    text += ` and ${integerInWords(minor)} ${minorName}`;
  }
  return capitalise(text);
}
