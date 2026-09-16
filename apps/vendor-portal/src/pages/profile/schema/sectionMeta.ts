import { createElement, type ReactElement } from 'react';
import type { AccentColor } from '@sinnapi/ui';
import StorefrontIcon from '@mui/icons-material/StorefrontOutlined';
import WorkHistoryIcon from '@mui/icons-material/WorkHistoryOutlined';
import SellIcon from '@mui/icons-material/SellOutlined';
import LanguageIcon from '@mui/icons-material/Language';
import MapIcon from '@mui/icons-material/MapOutlined';
import ImageIcon from '@mui/icons-material/ImageOutlined';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUserOutlined';
import PersonIcon from '@mui/icons-material/PersonOutline';
import PhotoCameraIcon from '@mui/icons-material/PhotoCameraOutlined';
import ShieldIcon from '@mui/icons-material/ShieldOutlined';
import type { BusinessSectionKey, PersonalSectionKey } from './sections';

export type SectionMeta = {
  /** Short label for the section menu. */
  label: string;
  /** Panel heading — may be longer than the menu label. */
  title: string;
  subtitle: string;
  icon: ReactElement;
  accent?: AccentColor;
};

/**
 * Menu labels and panel headings, keyed by the section union so a section added
 * to `BUSINESS_SECTIONS` without copy here is a type error, not a blank tab.
 */
export const BUSINESS_SECTION_META: Record<BusinessSectionKey, SectionMeta> = {
  basics: {
    label: 'Basics',
    title: 'Basics',
    subtitle: 'The name, city and story at the top of your listing',
    icon: createElement(StorefrontIcon),
  },
  operations: {
    label: 'Operations',
    title: 'How you operate',
    subtitle: 'Where clients can visit you and how far ahead they should book',
    icon: createElement(WorkHistoryIcon),
  },
  pricing: {
    label: 'Pricing',
    title: 'Pricing',
    subtitle: 'Shown as a “from” price on your listing, never as a quote',
    icon: createElement(SellIcon),
  },
  presence: {
    label: 'Web & socials',
    title: 'Web & socials',
    subtitle: 'Where clients can see more of your work',
    icon: createElement(LanguageIcon),
  },
  coverage: {
    label: 'Coverage',
    title: 'Service coverage',
    subtitle: 'The regions clients can find you in when they filter by location',
    icon: createElement(MapIcon),
    accent: 'primary',
  },
  logo: {
    label: 'Logo',
    title: 'Business logo',
    subtitle: 'Shown on your listing and in search results. Saves as soon as you pick it.',
    icon: createElement(ImageIcon),
  },
  verification: {
    label: 'Verification',
    title: 'Verification & payout',
    subtitle: 'Visible only to you and our review team',
    icon: createElement(VerifiedUserIcon),
    accent: 'info',
  },
};

export const PERSONAL_SECTION_META: Record<PersonalSectionKey, SectionMeta> = {
  details: {
    label: 'Your details',
    title: 'Your details',
    subtitle: 'The person behind the business — not shown on your listing',
    icon: createElement(PersonIcon),
  },
  photo: {
    label: 'Photo',
    title: 'Profile photo',
    subtitle: 'Shown beside your messages to clients. Saves as soon as you pick it.',
    icon: createElement(PhotoCameraIcon),
  },
  account: {
    label: 'Account',
    title: 'Account',
    subtitle: 'Set by the platform — password and payout banking live under Settings',
    icon: createElement(ShieldIcon),
    accent: 'primary',
  },
};
