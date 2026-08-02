import type { ElementType } from 'react';
import { Flag, Visibility } from '@mui/icons-material';

// `anchor` doubles as the element id so footer links can deep-link to a pillar
// (e.g. `/about#mission`, `/about#vision`).
export type Pillar = {
  anchor: string;
  Icon: ElementType;
  overline: string;
  title: string;
  body: string;
};

// Mission & Vision, lifted from the About readMe and tightened for the web.
export const PILLARS: Pillar[] = [
  {
    anchor: 'mission',
    Icon: Flag,
    overline: 'Our Mission',
    title: 'Plan any event, anywhere, in the least time possible',
    body: 'To make it easier for everyone to plan their events at their convenience by providing a one-stop home for all event service providers across the world.',
  },
  {
    anchor: 'vision',
    Icon: Visibility,
    overline: 'Our Vision',
    title: 'Our Vision for the Future',
    body: 'We look forward to the day when everyone can plan their events in minutes, from wherever is most convenient to them. We’re also building virtual assistants and intelligent automation to anticipate your needs even before you begin planning — taking the legwork of head-hunting off your shoulders, and screening out the very best providers nearest to you.',
  },
];
