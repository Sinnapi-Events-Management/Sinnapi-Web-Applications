import type { Faq } from '../FaqSection';

// Shared FAQ content, surfaced on both the home and contact pages via the shared
// FaqSection. Single source of truth so the answers never drift between pages.
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
];
