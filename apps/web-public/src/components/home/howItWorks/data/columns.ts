export type Step = { title: string; body: string };
export type Column = { who: string; steps: Step[] };

export const COLUMNS: Column[] = [
  {
    who: 'For clients & planners',
    steps: [
      { title: 'Discover', body: 'Search verified vendors by category, region, and budget.' },
      { title: 'Compare', body: 'Request and compare quotations side by side.' },
      { title: 'Book securely', body: 'Pay directly or through Sinnapi Escrow for peace of mind.' },
      { title: 'Celebrate', body: 'Chat, track bookings, and review vendors after your event.' },
    ],
  },
  {
    who: 'For vendors',
    steps: [
      { title: 'Apply', body: 'Submit your application with documents and verification.' },
      { title: 'Get verified', body: 'Pass due diligence and sign the vendor MOU.' },
      { title: 'Go live', body: 'Enjoy a 30-day free trial, then choose a subscription plan.' },
      { title: 'Grow', body: 'Receive bookings, manage payouts, and build your reputation.' },
    ],
  },
];
