import type { ElementType } from 'react';
import { Verified, Lock, Chat, Search } from '@sinnapi/ui/icons';

export type ValueProp = { Icon: ElementType; title: string; body: string };

export const VALUE_PROPS: ValueProp[] = [
  {
    Icon: Verified,
    title: 'Verified vendors',
    body: 'Every vendor is vetted through due diligence and an MOU before listing.',
  },
  {
    Icon: Lock,
    title: 'Secure escrow',
    body: 'Pay safely — funds are held in escrow and released when you confirm.',
  },
  {
    Icon: Chat,
    title: 'Direct messaging',
    body: 'Chat, compare quotations, and coordinate everything in one place.',
  },
  {
    Icon: Search,
    title: 'Easy discovery',
    body: 'Search and filter trusted providers by category, region, and budget.',
  },
];
