import NextLink from 'next/link';
import { Link } from '@sinnapi/ui';
import SharedFaqSection, { HOW_IT_WORKS_FAQS } from '@/components/organisms/faqSection';

/**
 * How-it-works FAQs — reuses the shared FaqSection for visual consistency with
 * the home and contact pages, supplying page-specific questions plus a prompt
 * that deep-links to the contact page for anything still unanswered.
 */
export default function HowItWorksFaq() {
  return (
    <SharedFaqSection
      overline="Good to know"
      title="Frequently asked questions"
      subtitle={
        <>
          Everything you need to understand how Sinnapi works — for clients and vendors alike. Still
          have a question?{' '}
          <Link component={NextLink} href="/contact" underline="hover">
            Get in touch
          </Link>
          .
        </>
      }
      faqs={HOW_IT_WORKS_FAQS}
    />
  );
}
