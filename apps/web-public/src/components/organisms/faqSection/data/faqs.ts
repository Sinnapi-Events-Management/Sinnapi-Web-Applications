import type { Faq } from '../FaqSection';

// How-it-works-specific questions, grounded in the product spec (free browsing,
// vendor vetting, escrow, direct vs escrow payment, multi-event planners, and the
// vendor trial + subscriptions). Surfaced on the How It Works page directly, and
// spread into the shared FAQS below so the answers never drift between pages.
export const HOW_IT_WORKS_FAQS: Faq[] = [
  {
    question: 'Does it cost anything to browse and search vendors?',
    answer:
      'No. Browsing vendors, viewing portfolios, and searching by category or region is completely free. You only need an account when you want to chat, request a quotation, or make a booking.',
  },
  {
    question: 'How does Sinnapi make sure vendors are genuine?',
    answer:
      'Every vendor goes through an approval workflow before they appear publicly — application review, due-diligence checks, and a signed MOU. Providers who do not pass are never listed.',
  },
  {
    question: 'What is Sinnapi Escrow and why would I use it?',
    answer:
      'Escrow lets you pay Sinnapi instead of the vendor up front. We hold the full amount securely and only release it once you confirm the service was delivered as promised — protecting you from no-shows and disputes.',
  },
  {
    question: 'Can I pay the vendor directly instead?',
    answer:
      'Yes. You can always choose to pay a vendor directly. Escrow is simply there for extra peace of mind, especially with vendors you are working with for the first time.',
  },
  {
    question: 'I am a vendor — how long does approval take and what does it cost?',
    answer:
      'After you apply, we review your details and complete due diligence before you sign the vendor MOU. Once approved, you get a 30-day free trial, after which you choose a Starter, Professional, or Elite subscription.',
  },
  {
    question: 'Can I manage more than one event at a time?',
    answer:
      'Absolutely. Clients and professional event planners can run multiple events at once, tracking bookings, messages, and payments for each from a single dashboard.',
  },
];

// Shared FAQ content, surfaced across the site (home, contact, pricing) via the
// shared FaqSection. Leads with the how-it-works questions, then the coverage and
// pricing/billing answers. Single source of truth so the answers never drift
// between pages.
export const FAQS: Faq[] = [
  ...HOW_IT_WORKS_FAQS,
  {
    question: 'Which areas does Sinnapi cover?',
    answer:
      'We serve Kampala and all regions of Uganda, with growing coverage across East Africa and beyond.',
  },
  {
    question: 'How does the 30-day free trial work?',
    answer:
      'Once your vendor application is approved, you get 30 days to use your chosen plan free. We do not take payment upfront — you only start paying if you decide to continue after the trial.',
  },
  {
    question: 'What is the difference between monthly and annual billing?',
    answer:
      'Both give you the exact same features. Annual billing is charged once a year at a discounted monthly rate, so you save compared with paying month to month. You can switch billing cycle at any time.',
  },
  {
    question: 'Can I change or cancel my plan later?',
    answer:
      'Yes. You can upgrade, downgrade, or cancel whenever you like from your vendor dashboard. Changes take effect from your next billing cycle, and there are no cancellation fees.',
  },
  {
    question: 'What happens if my subscription becomes inactive?',
    answer:
      'If a subscription lapses, your public listing is hidden so clients only see active, available vendors. Your profile and data are kept safe — renew any time to go live again.',
  },
  {
    question: 'Are the prices shown final?',
    answer:
      'The prices on this page are indicative list prices. Your exact rate is confirmed during onboarding and may vary by billing cycle or any promotion you qualify for.',
  },
];
