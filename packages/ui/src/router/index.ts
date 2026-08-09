// Router-aware primitives, layered atoms → molecules like the rest of the
// design system. Deliberately NOT re-exported from the root barrel: these
// depend on react-router-dom, which only the SPA portals install — the Next.js
// `web-public` app must never pull them into its module graph.
export * from './atoms/AppLink';
export * from './atoms/BackButton';
export * from './molecules/AuthSwitchPrompt';
export * from './molecules/StatCard';
export * from './organisms/EmptyState';
export * from './organisms/portalShell';
export * from './hooks/useAppLinkSx';
export * from './hooks/useGoBack';
export * from './types';
