// Public surface of the auth showcase. The slide/brand/CTA sub-components are
// internal composition details of `AuthShowcase` — deliberately not re-exported,
// since their names would otherwise collide with the prop types above.
export * from './types';
export * from './AuthShowcase';
export * from './AuthGlassCard';
export * from './hooks/useAuthCarousel';
export * from './hooks/useAuthShowcase';
export * from './hooks/useReducedMotion';
