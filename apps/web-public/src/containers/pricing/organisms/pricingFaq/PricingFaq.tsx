import NextLink from 'next/link';
import { Link } from '@sinnapi/ui';
import SharedFaqSection, { FAQS } from '@/components/organisms/faqSection';

/**
 * Pricing FAQs — uses the shared FaqSection for visual consistency, re-using the
 * single shared FAQ list (which now includes the pricing/billing questions) so
 * the answers never drift between the home, contact and pricing pages.
 */
export default function PricingFaq() {
  return (
    <SharedFaqSection
      overline="Pricing questions"
      title="Everything you need to know"
      subtitle={
        <>
          Still weighing it up? Read the details below, or{' '}
          <Link component={NextLink} href="/contact" underline="hover">
            talk to our team
          </Link>{' '}
          before you commit.
        </>
      }
      faqs={FAQS}
    />
  );
}
