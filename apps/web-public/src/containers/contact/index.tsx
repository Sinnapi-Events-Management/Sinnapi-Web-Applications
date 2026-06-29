import ContactHero from './organisms/contactHero';
import ContactMethods from './organisms/contactMethods';
import GetInTouch from './organisms/getInTouch';
import ContactMap from './organisms/contactMap';
import ContactFaq from './organisms/contactFaq';

/**
 * Contact page container. Composes the contact organisms as a funnel:
 * hero → pick a route → send a message (form + direct contact) → find us →
 * quick answers. Presentation lives in the organisms; this file only sequences.
 */
export default function ContactContainer() {
  return (
    <>
      <ContactHero />
      <ContactMethods />
      <GetInTouch />
      <ContactMap />
      <ContactFaq />
    </>
  );
}
