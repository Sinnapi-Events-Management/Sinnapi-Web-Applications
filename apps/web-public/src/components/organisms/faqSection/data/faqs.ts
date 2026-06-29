import type { Faq } from '../FaqSection';

// Shared FAQ content, surfaced across the site (home, contact, pricing) via the
// shared FaqSection. Single source of truth so the answers never drift between
// pages — including the pricing/billing questions below.
export const FAQS: Faq[] = [
  {
    question: 'How are vendors verified?',
    answer:
      'Every vendor completes an application, passes our due-diligence review, and signs an MOU before they can be listed publicly. Look for the verified badge on each profile.',
  },
  {
    question: 'How does Sinnapi Escrow protect me?',
    answer:
      'When you choose escrow, your payment is held securely by Sinnapi and only released to the vendor once you confirm the service was delivered as agreed.',
  },
  {
    question: 'Does it cost anything to join as a client?',
    answer:
      'No. Creating a client or event-planner account is free. You only pay vendors for the services you book.',
  },
  {
    question: 'I am a service provider — how do I get listed?',
    answer:
      'Apply to become a vendor, pass verification, and sign the MOU. Approved vendors get a 30-day free trial before choosing a subscription plan.',
  },
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
