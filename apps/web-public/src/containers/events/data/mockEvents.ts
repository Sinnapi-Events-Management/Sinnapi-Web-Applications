import type { EventCardModel } from '@/lib/types';

/**
 * Placeholder events used while the `events` table is empty in development.
 * Shape matches the public `EventCardModel` (a subset of the `events` table:
 * see migration 20260618000005). The container falls back to these only when
 * the live query returns nothing, so wiring real data later needs no UI change.
 * Cover URLs point at the locally hosted marketing photography in /public/images.
 */
export const MOCK_EVENTS: EventCardModel[] = [
  {
    id: 'mock-01',
    title: 'Garden wedding for 200 guests in Munyonyo',
    description:
      'A lakeside white-and-greenery celebration. Looking for a decorator, caterer and live band to bring the day together.',
    event_type: 'wedding',
    event_date: '2026-09-12',
    location: 'kampala',
    budget_min: 8_000_000,
    budget_max: 15_000_000,
    currency: 'UGX',
    cover_image_url: '/images/deco-1.webp',
    source: 'client',
  },
  {
    id: 'mock-02',
    title: 'Autumn-themed reception inspiration',
    description:
      'Rust and candlelight tablescapes with draped chiavari chairs — a curated look to inspire your own reception styling.',
    event_type: 'wedding',
    event_date: '2026-10-04',
    location: 'wakiso',
    budget_min: null,
    budget_max: null,
    currency: 'UGX',
    cover_image_url: '/images/image-2.webp',
    source: 'admin',
  },
  {
    id: 'mock-03',
    title: 'Corporate end-of-year gala — 350 pax',
    description:
      'Annual awards dinner needing full AV, stage design, MC and plated catering at a five-star venue.',
    event_type: 'corporate',
    event_date: '2026-12-06',
    location: 'kampala',
    budget_min: 20_000_000,
    budget_max: 35_000_000,
    currency: 'UGX',
    cover_image_url: '/images/image18.webp',
    source: 'client',
  },
  {
    id: 'mock-04',
    title: 'Intimate 30th birthday dinner',
    description:
      'Private rooftop dinner for 40 friends. Seeking a caterer, florist and a photographer for the evening.',
    event_type: 'birthday',
    event_date: '2026-08-23',
    location: 'entebbe',
    budget_min: 3_000_000,
    budget_max: 5_000_000,
    currency: 'UGX',
    cover_image_url: '/images/image23.webp',
    source: 'client',
  },
  {
    id: 'mock-05',
    title: 'Graduation brunch celebration',
    description:
      'Daytime garden brunch for a university graduate. Decor, pastry table and a photo booth wanted.',
    event_type: 'graduation',
    event_date: '2026-07-19',
    location: 'mukono',
    budget_min: 1_200_000,
    budget_max: 2_500_000,
    currency: 'UGX',
    cover_image_url: '/images/image29.webp',
    source: 'client',
  },
  {
    id: 'mock-06',
    title: 'Pastel baby shower styling',
    description:
      'Soft balloon arches, dessert grazing and gentle florals — inspiration for a modern baby shower.',
    event_type: 'baby_shower',
    event_date: '2026-09-28',
    location: 'kampala',
    budget_min: 800_000,
    budget_max: 1_800_000,
    currency: 'UGX',
    cover_image_url: '/images/image9.webp',
    source: 'admin',
  },
  {
    id: 'mock-07',
    title: 'Golden anniversary celebration',
    description:
      'A 50th anniversary dinner for the family. Looking for an elegant decorator and a string quartet.',
    event_type: 'anniversary',
    event_date: '2026-11-15',
    location: 'jinja',
    budget_min: 5_000_000,
    budget_max: 9_000_000,
    currency: 'UGX',
    cover_image_url: '/images/image7.webp',
    source: 'client',
  },
  {
    id: 'mock-08',
    title: 'Open-air concert & food festival',
    description:
      'Weekend live-music festival seeking stage, sound, security and a roster of food vendors.',
    event_type: 'concert',
    event_date: '2026-10-31',
    location: 'nationwide',
    budget_min: 40_000_000,
    budget_max: 80_000_000,
    currency: 'UGX',
    cover_image_url: '/images/image12.webp',
    source: 'client',
  },
  {
    id: 'mock-09',
    title: 'Tech product launch — invite only',
    description:
      'Evening launch for 150 guests with branded staging, lighting and canapés. Photographer & videographer needed.',
    event_type: 'product_launch',
    event_date: '2026-08-08',
    location: 'kampala',
    budget_min: 12_000_000,
    budget_max: 18_000_000,
    currency: 'UGX',
    cover_image_url: '/images/image15.webp',
    source: 'client',
  },
  {
    id: 'mock-10',
    title: 'Regional leadership conference',
    description:
      'Two-day conference for 500 delegates. Requires AV, breakout staging, catering and on-site coordination.',
    event_type: 'conference',
    event_date: '2026-09-05',
    location: 'mbarara',
    budget_min: 25_000_000,
    budget_max: 45_000_000,
    currency: 'UGX',
    cover_image_url: '/images/deco-2.webp',
    source: 'client',
  },
];
