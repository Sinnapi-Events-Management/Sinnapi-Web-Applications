// Router-aware primitives, layered atoms → molecules like the rest of the
// design system. Deliberately NOT re-exported from the root barrel: these
// depend on react-router-dom, which only the SPA portals install — the Next.js
// `web-public` app must never pull them into its module graph.
export * from './atoms/AppLink';
export * from './molecules/AuthSwitchPrompt';
export * from './hooks/useAppLinkSx';
export * from './types';
