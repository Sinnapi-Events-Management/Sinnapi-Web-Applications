import { IMAGES, type LocalImage } from '@/lib/assets';

/**
 * Editorial "inspiration" tiles built from Sinnapi's own photography. Each tile
 * carries a `span` so the bento grid can mix feature and standard sizes, and a
 * `href` deep-linking to the closest vendor category (general `/vendors` where no
 * single category fits, e.g. attire & accessories).
 */
export type GalleryTile = {
  image: LocalImage;
  eyebrow: string;
  title: string;
  href: string;
  /** Column / row span at each breakpoint (4-col grid on md+, 2-col on xs). */
  span: { c: number; r: number };
};

export const GALLERY_TILES: GalleryTile[] = [
  {
    image: IMAGES.ceremonyLawn,
    eyebrow: 'Décor & venues',
    title: 'Ceremonies styled to perfection',
    href: '/vendors?category=decorator',
    span: { c: 2, r: 2 },
  },
  {
    image: IMAGES.brideGownLace,
    eyebrow: 'Attire',
    title: 'Bridal & occasion fashion',
    href: '/vendors',
    span: { c: 1, r: 2 },
  },
  {
    image: IMAGES.cakeHut,
    eyebrow: 'Catering',
    title: 'Cakes & bakers',
    href: '/vendors?category=caterer',
    span: { c: 1, r: 1 },
  },
  {
    image: IMAGES.goldEarrings,
    eyebrow: 'Accessories',
    title: 'Jewellery',
    href: '/vendors',
    span: { c: 1, r: 1 },
  },
  {
    image: IMAGES.gownBeaded,
    eyebrow: 'Attire',
    title: 'Couture gowns',
    href: '/vendors',
    span: { c: 1, r: 1 },
  },
  {
    image: IMAGES.bridalHeels,
    eyebrow: 'Accessories',
    title: 'Footwear & finishing touches',
    href: '/vendors',
    span: { c: 1, r: 1 },
  },
  {
    image: IMAGES.cakeLeopard,
    eyebrow: 'Catering',
    title: 'Statement celebration cakes',
    href: '/vendors?category=caterer',
    span: { c: 2, r: 1 },
  },
];
