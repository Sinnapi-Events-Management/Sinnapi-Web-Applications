import type { ElementType } from 'react';
import { EmailOutlined, PhoneOutlined, WhatsApp, PlaceOutlined } from '@sinnapi/ui/icons';
import { CONTACT } from '@sinnapi/utils/constants';

const digits = (value: string) => value.replace(/[^\d]/g, '');

export type ContactDetail = {
  Icon: ElementType;
  label: string;
  value: string;
  href: string;
  external?: boolean;
};

// Direct-contact rows, derived from the shared CONTACT constants so the page
// stays in sync with the footer / navbar.
export const CONTACT_DETAILS: ContactDetail[] = [
  {
    Icon: EmailOutlined,
    label: 'Email',
    value: CONTACT.email,
    href: `mailto:${CONTACT.email}`,
  },
  {
    Icon: PhoneOutlined,
    label: 'Phone',
    value: CONTACT.phone,
    href: `tel:+${digits(CONTACT.phone)}`,
  },
  {
    Icon: WhatsApp,
    label: 'WhatsApp',
    value: CONTACT.whatsapp,
    href: `https://wa.me/${digits(CONTACT.whatsapp)}`,
    external: true,
  },
  {
    Icon: PlaceOutlined,
    label: 'Office',
    value: CONTACT.address,
    href: 'https://www.google.com/maps/search/?api=1&query=Kampala%2C+Uganda',
    external: true,
  },
];

// Business hours aren't in the shared CONTACT constants yet — placeholder copy
// kept here so it's easy to lift into @sinnapi/utils later.
export const BUSINESS_HOURS = [
  { days: 'Monday – Friday', hours: '8:00 AM – 6:00 PM' },
  { days: 'Saturday', hours: '9:00 AM – 2:00 PM' },
  { days: 'Sunday & public holidays', hours: 'Closed' },
];
