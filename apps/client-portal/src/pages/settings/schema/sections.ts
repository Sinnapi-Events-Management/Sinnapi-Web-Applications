import type { ComponentType } from 'react';
import SecurityIcon from '@mui/icons-material/SecurityOutlined';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTipOutlined';

/**
 * The page's sections, in the order the rail lists them.
 *
 * Two where the vendor portal has three — a client has no payout account, and the
 * rail is not padded out with a heading that would open an empty panel. The first
 * entry is the default tab, the one `useUrlTab` represents by the *absence* of
 * `?tab=`, so it is the entry that must not be reordered once links exist.
 */
export const SETTINGS_TABS = ['security', 'privacy'] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number];

export type SettingsTabMeta = {
  label: string;
  /** One line under the label — what the section is for, before it is opened. */
  hint: string;
  icon: ComponentType<{ fontSize?: 'small' | 'inherit' | 'medium' | 'large' }>;
};

/**
 * Keyed by the tab union rather than written out as an array, so adding a section
 * to `SETTINGS_TABS` without labelling it here is a type error rather than a tab
 * that renders blank.
 */
export const SETTINGS_TAB_META: Record<SettingsTab, SettingsTabMeta> = {
  security: { label: 'Security', hint: 'Sign-in and password', icon: SecurityIcon },
  privacy: { label: 'Privacy & data', hint: 'Export and erasure', icon: PrivacyTipIcon },
};

/**
 * Ids shared by a tab and its panel, so the two are announced as one control.
 * They live here rather than in the component because a file that exports both a
 * component and helpers loses fast refresh.
 */
export const tabId = (value: string) => `settings-tab-${value}`;
export const panelId = (value: string) => `settings-panel-${value}`;
