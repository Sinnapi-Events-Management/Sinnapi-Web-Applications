export type Faq = { question: string; answer: string };

// Common questions from prospective vendors, answered up front to reduce
// friction before they apply.
export const VENDOR_FAQS: Faq[] = [
  {
    question: 'Who can apply to become a vendor?',
    answer:
      'Any genuine event service provider — photographers, caterers, décor and hire, venues, MCs, cake makers, transport and more. If you help make events happen, Sinnapi is for you.',
  },
  {
    question: 'How long does approval take?',
    answer:
      'Most applications are reviewed within a few business days once we receive your details and verification documents and complete due diligence.',
  },
  {
    question: 'What does it cost to join?',
    answer:
      'You start with a 30-day free trial — no card required. After that you choose a subscription plan that fits your business. See the pricing page for current plans.',
  },
  {
    question: 'How do payments work?',
    answer:
      'Client payments are held in secure escrow and released to you once the booking is confirmed as delivered, so you are protected and never have to chase payment.',
  },
  {
    question: 'What documents do I need?',
    answer:
      'Business or ID verification and a few samples of your work. We guide you through exactly what is needed during the application, step by step.',
  },
];
