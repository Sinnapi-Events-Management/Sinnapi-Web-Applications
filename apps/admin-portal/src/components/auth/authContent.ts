// Copy for the auth showcase carousel (left panel). Admin-oriented value props —
// distinct from the marketing site's booking language.
export type AuthSlide = { title: string; body: string };

export const AUTH_SLIDES: AuthSlide[] = [
  {
    title: 'Command Center',
    body: 'Oversee vendors, bookings and events across the marketplace from one console.',
  },
  {
    title: 'Payments in Control',
    body: 'Approve payouts, resolve disputes and reconcile escrow with a full audit trail.',
  },
  {
    title: 'Governed by Design',
    body: 'Role-based permissions and compliance tooling keep every action accountable.',
  },
];

export const AUTH_ROTATE_MS = 6000;
