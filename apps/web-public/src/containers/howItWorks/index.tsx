import HowItWorksHero from './organisms/howItWorksHero';
import JourneySteps from './organisms/journeySteps';
import EscrowExplainer from './organisms/escrowExplainer';
import HowItWorksFaq from './organisms/howItWorksFaq';
import HowItWorksCta from './organisms/howItWorksCta';

/**
 * How it works page container. Composes the organisms as a narrative funnel:
 * set the scene → walk both journeys (client & vendor) → explain how payments
 * stay safe → answer the common questions → close with a CTA. Presentation lives
 * in the organisms; this file only sequences them.
 */
export default function HowItWorksContainer() {
  return (
    <>
      <HowItWorksHero />
      <JourneySteps />
      <EscrowExplainer />
      <HowItWorksFaq />
      <HowItWorksCta />
    </>
  );
}
