import type { ElementType } from 'react';
import { Flag, Visibility } from '@sinnapi/ui/icons';

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
    title: 'Empowering you to plan seamlessly, wherever you are',
    body: 'A future where everyone can plan their event in minutes from their location or comfort — supported by smart assistants that surface the very best providers nearest to you.',
  },
];
