// Single source of truth for the locally hosted Sinnapi marketing photography.
//
// Each image is imported statically so Next.js can fingerprint it, emit AVIF/WebP
// variants, and generate a tiny blur placeholder at build time — i.e. every photo
// on the home page is served through the Image Optimization pipeline with a smooth
// blur-up, not as a raw CSS background. Importing once here (and reusing the typed
// objects across sections) keeps alt text authored in one place for a11y/SEO.
import type { StaticImageData } from 'next/image';

import ceremonyLawnImg from '../../public/images/deco-1.webp';
import ceremonyAisleImg from '../../public/images/deco-2.webp';
import receptionAutumnImg from '../../public/images/image-2.webp';
import goldEarringsImg from '../../public/images/image7.webp';
import brideGownLaceImg from '../../public/images/image9.webp';
import gownBeadedImg from '../../public/images/image12.webp';
import bridalHeelsImg from '../../public/images/image15.webp';
import weddingCarImg from '../../public/images/image18.webp';
import cakeLeopardImg from '../../public/images/image23.webp';
import cakeHutImg from '../../public/images/image29.webp';

export type LocalImage = { src: StaticImageData; alt: string };

export const IMAGES = {
  ceremonyLawn: {
    src: ceremonyLawnImg,
    alt: 'Elegant white outdoor wedding ceremony set-up on a manicured lawn',
  },
  ceremonyAisle: {
    src: ceremonyAisleImg,
    alt: 'Outdoor ceremony with a draped backdrop and a long white aisle lined with florals',
  },
  receptionAutumn: {
    src: receptionAutumnImg,
    alt: 'Outdoor autumn wedding reception with rust and white rose centrepieces, candlelight and draped chiavari chairs',
  },
  goldEarrings: {
    src: goldEarringsImg,
    alt: 'Pair of gold cluster bridal earrings presented in a jewellery box',
  },
  brideGownLace: {
    src: brideGownLaceImg,
    alt: 'Bride wearing a fitted long-sleeve white lace wedding gown',
  },
  gownBeaded: {
    src: gownBeadedImg,
    alt: 'Beaded floor-length wedding gown with a sweeping train, shown from behind',
  },
  bridalHeels: {
    src: bridalHeelsImg,
    alt: 'Pearl-embellished bridal heels displayed on a glass stand',
  },
  weddingCar: {
    src: weddingCarImg,
    alt: 'Luxury car decorated with white florals and strings of pearls for a wedding',
  },
  cakeLeopard: {
    src: cakeLeopardImg,
    alt: 'African-inspired tiered wedding cake with tribal patterns and a leopard-print drape',
  },
  cakeHut: {
    src: cakeHutImg,
    alt: 'Tiered wedding cake topped with an African hut and finished in kente-inspired colours',
  },
} satisfies Record<string, LocalImage>;
