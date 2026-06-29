import NextLink from 'next/link';
import { Link } from '@sinnapi/ui';
import { CONTACT } from '@sinnapi/utils/constants';
import SharedFaqSection, { FAQS } from '@/components/organisms/faqSection';

/**
 * Contact FAQs — uses the shared FaqSection for visual consistency with the home
 * page, supplying contact-specific copy and questions plus a "still stuck?" intro
 * that deep-links to the form.
 */
export default function ContactFaq() {
  return (
    <SharedFaqSection
      overline="Before you write"
      title="Quick answers"
      subtitle={
        <>
          A few things people often ask. Still stuck?{' '}
          <Link component={NextLink} href="#message" underline="hover">
            Send us a message
          </Link>{' '}
          or email{' '}
          <Link href={`mailto:${CONTACT.email}`} underline="hover">
            {CONTACT.email}
          </Link>
          .
        </>
      }
      faqs={FAQS}
    />
  );
}
