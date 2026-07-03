import type { ElementType } from 'react';
import {
  PhotoCamera,
  Videocam,
  Celebration,
  Restaurant,
  FaceRetouchingNatural,
  Mic,
  Headphones,
  Apartment,
  LocalFlorist,
  Security,
  TheaterComedy,
  Speaker,
} from '@mui/icons-material';
import { unsplash } from '@/lib/images';

export type Category = {
  /** Slug used in the `/vendors?category=` link and titleized for display. */
  key: string;
  Icon: ElementType;
  /** Decorative background image; tiles fall back to a brand tile if it fails. */
  img: string;
};

export const CATEGORIES: Category[] = [
  { key: 'photographer', Icon: PhotoCamera, img: unsplash('1452587925148-ce544e77e70d') },
  { key: 'videographer', Icon: Videocam, img: unsplash('1485846234645-a62644f84728') },
  { key: 'decorator', Icon: Celebration, img: unsplash('1478146896981-b80fe463b330') },
  { key: 'caterer', Icon: Restaurant, img: unsplash('1555244162-803834f70033') },
  {
    key: 'makeup_artist',
    Icon: FaceRetouchingNatural,
    img: unsplash('1522335789203-aabd1fc54bc9'),
  },
  { key: 'mc', Icon: Mic, img: unsplash('1511671782779-c97d3d27a1d4') },
  { key: 'dj', Icon: Headphones, img: unsplash('1493225457124-a3eb161ffa5f') },
  { key: 'venue', Icon: Apartment, img: unsplash('1519167758481-83f550bb49b3') },
  { key: 'florist', Icon: LocalFlorist, img: unsplash('1561181286-d3fee7d55364') },
  { key: 'security', Icon: Security, img: unsplash('1521791136064-7986c2920216') },
  { key: 'entertainment', Icon: TheaterComedy, img: unsplash('1470229722913-7c0e2dbbafd3') },
  { key: 'equipment', Icon: Speaker, img: unsplash('1470225620780-dba8ba36b745') },
];
